import { useEffect, useRef } from "react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import {
  lowerTabletopQuality,
  raiseTabletopQuality,
  recommendTabletopQuality,
  type TabletopQualityProfile,
} from "@/lib/tabletop/tabletop-adaptive-performance";
import type { TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-adaptive-quality.css";

type PixiInternals = {
  app?: {
    renderer?: {
      resolution?: number;
      resize?: (width: number, height: number, resolution?: number) => void;
    };
  };
};

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

function applyProfile(profile: TabletopQualityProfile) {
  const runtime = currentTabletopRuntime();
  if (!runtime) return;
  const renderer = (runtime.engine as unknown as PixiInternals).app?.renderer;
  const targetResolution = Math.min(window.devicePixelRatio || 1, profile.maxResolution);
  if (renderer && Math.abs(Number(renderer.resolution ?? targetResolution) - targetResolution) > 0.05) {
    try {
      renderer.resolution = targetResolution;
      renderer.resize?.(Math.max(320, runtime.host.clientWidth), Math.max(320, runtime.host.clientHeight), targetResolution);
    } catch {
      // Older Pixi renderers may expose resolution as readonly; CSS/native-model
      // adaptation still applies and keeps the session safe.
    }
  }
  runtime.host.dataset.qualityTier = profile.tier;
  runtime.host.style.setProperty("--tadeon-tabletop-quality-resolution", String(targetResolution));
  runtime.host.style.setProperty("--tadeon-tabletop-texture-budget-mb", String(profile.textureBudgetMb));
  const native = runtime.host.querySelector<HTMLCanvasElement>(".tadeon-tabletop-native-model-layer");
  if (native) native.style.display = profile.nativeModels ? "block" : "none";
  window.dispatchEvent(new CustomEvent("tadeon-tabletop-quality", { detail: profile }));
}

export function TabletopAdaptivePerformanceBridge() {
  const profile = useRef<TabletopQualityProfile | null>(null);
  const lowFrames = useRef(0);
  const goodFrames = useRef(0);
  const lastSample = useRef(performance.now());
  const frames = useRef(0);
  const snapshot = useRef<TabletopSnapshot | null>(null);

  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const onRender = (event: Event) => {
      snapshot.current = (event as CustomEvent<TabletopSnapshot>).detail ?? currentTabletopRuntime()?.snapshot() ?? null;
    };
    window.addEventListener("tadeon-tabletop-render", onRender);
    snapshot.current = currentTabletopRuntime()?.snapshot() ?? null;

    const sample = (now: number) => {
      if (stopped) return;
      frames.current += 1;
      const elapsed = now - lastSample.current;
      if (elapsed >= 1800) {
        const fps = Math.min(60, (frames.current * 1000) / Math.max(1, elapsed));
        const recommendation = recommendTabletopQuality({
          fps,
          entityCount: snapshot.current?.scene.entities.length ?? 0,
          devicePixelRatio: window.devicePixelRatio || 1,
          memoryGb: (navigator as NavigatorWithMemory).deviceMemory,
          coarsePointer: matchMedia("(pointer: coarse)").matches,
        });
        if (!profile.current) profile.current = recommendation;
        else {
          if (fps < 43) {
            lowFrames.current += 1;
            goodFrames.current = 0;
          } else if (fps > 57) {
            goodFrames.current += 1;
            lowFrames.current = 0;
          } else {
            lowFrames.current = 0;
            goodFrames.current = 0;
          }
          if (lowFrames.current >= 2) {
            profile.current = lowerTabletopQuality(profile.current.tier);
            lowFrames.current = 0;
          } else if (goodFrames.current >= 5) {
            profile.current = raiseTabletopQuality(profile.current.tier);
            goodFrames.current = 0;
          } else if (recommendation.tier === "economy" && profile.current.tier !== "economy") {
            profile.current = recommendation;
          }
        }
        applyProfile(profile.current);
        frames.current = 0;
        lastSample.current = now;
      }
      raf = requestAnimationFrame(sample);
    };
    raf = requestAnimationFrame(sample);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("tadeon-tabletop-render", onRender);
    };
  }, []);

  return null;
}
