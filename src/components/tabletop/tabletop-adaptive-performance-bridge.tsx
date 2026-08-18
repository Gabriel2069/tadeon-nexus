import { useEffect, useRef } from "react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { configureTabletopTextureBudget } from "@/lib/tabletop/texture-manager";
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

const SAMPLE_WINDOW_MS = 1600;
const IDLE_BETWEEN_SAMPLES_MS = 6500;
const ACTIVE_RESAMPLE_DELAY_MS = 220;

function activeSceneAssetUrls(snapshot: TabletopSnapshot | null) {
  if (!snapshot) return [];
  const urls = snapshot.scene.entities
    .map((entity) => entity.assetUrl)
    .filter((url): url is string => Boolean(url));
  if (snapshot.scene.backgroundAssetUrl) urls.push(snapshot.scene.backgroundAssetUrl);
  return urls;
}

function profileForCurrentDevice(snapshot: TabletopSnapshot | null) {
  return recommendTabletopQuality({
    fps: 60,
    entityCount: snapshot?.scene.entities.length ?? 0,
    devicePixelRatio: window.devicePixelRatio || 1,
    memoryGb: (navigator as NavigatorWithMemory).deviceMemory,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
  });
}

function applyProfile(profile: TabletopQualityProfile, snapshot: TabletopSnapshot | null) {
  const runtime = currentTabletopRuntime();
  if (!runtime) return false;
  const renderer = (runtime.engine as unknown as PixiInternals).app?.renderer;
  const targetResolution = Math.min(window.devicePixelRatio || 1, profile.maxResolution);
  if (renderer && Math.abs(Number(renderer.resolution ?? targetResolution) - targetResolution) > 0.05) {
    try {
      renderer.resolution = targetResolution;
      renderer.resize?.(
        Math.max(320, runtime.host.clientWidth),
        Math.max(320, runtime.host.clientHeight),
        targetResolution,
      );
    } catch {
      // Older Pixi renderers may expose resolution as readonly; the remaining
      // adaptation still applies and keeps the session safe.
    }
  }
  runtime.host.dataset.qualityTier = profile.tier;
  runtime.host.style.setProperty("--tadeon-tabletop-quality-resolution", String(targetResolution));
  runtime.host.style.setProperty("--tadeon-tabletop-texture-budget-mb", String(profile.textureBudgetMb));
  configureTabletopTextureBudget(activeSceneAssetUrls(snapshot), profile.textureBudgetMb);
  const native = runtime.host.querySelector<HTMLCanvasElement>(".tadeon-tabletop-native-model-layer");
  if (native) {
    native.style.display = profile.nativeModels ? "block" : "none";
    native.style.imageRendering = "auto";
  }
  window.dispatchEvent(
    new CustomEvent("tadeon-tabletop-quality", {
      detail: { ...profile, resolution: targetResolution },
    }),
  );
  return true;
}

export function TabletopAdaptivePerformanceBridge() {
  const profile = useRef<TabletopQualityProfile | null>(null);
  const lowFrames = useRef(0);
  const goodFrames = useRef(0);
  const snapshot = useRef<TabletopSnapshot | null>(null);

  useEffect(() => {
    let raf = 0;
    let bootstrap = 0;
    let restTimer = 0;
    let stopped = false;
    let sampling = false;
    let sampleStartedAt = 0;
    let frames = 0;

    const syncImmediateDensity = () => {
      if (stopped) return;
      snapshot.current = currentTabletopRuntime()?.snapshot() ?? snapshot.current;
      const initial = profile.current ?? profileForCurrentDevice(snapshot.current);
      profile.current = initial;
      if (!applyProfile(initial, snapshot.current)) {
        bootstrap = window.requestAnimationFrame(syncImmediateDensity);
      }
    };

    const evaluate = (elapsed: number) => {
      const fps = Math.min(60, (frames * 1000) / Math.max(1, elapsed));
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
      applyProfile(profile.current, snapshot.current);
    };

    const scheduleSample = (delay = IDLE_BETWEEN_SAMPLES_MS) => {
      if (stopped) return;
      window.clearTimeout(restTimer);
      restTimer = window.setTimeout(startSample, delay);
    };

    const sample = (now: number) => {
      if (stopped || !sampling) return;
      if (document.hidden) {
        sampling = false;
        scheduleSample();
        return;
      }
      frames += 1;
      const elapsed = now - sampleStartedAt;
      if (elapsed >= SAMPLE_WINDOW_MS) {
        sampling = false;
        evaluate(elapsed);
        scheduleSample();
        return;
      }
      raf = window.requestAnimationFrame(sample);
    };

    function startSample() {
      if (stopped || sampling) return;
      if (document.hidden) {
        scheduleSample();
        return;
      }
      sampling = true;
      frames = 0;
      sampleStartedAt = performance.now();
      raf = window.requestAnimationFrame(sample);
    }

    const onRender = (event: Event) => {
      snapshot.current =
        (event as CustomEvent<TabletopSnapshot>).detail ??
        currentTabletopRuntime()?.snapshot() ??
        null;
      if (!sampling) scheduleSample(ACTIVE_RESAMPLE_DELAY_MS);
    };

    const onResize = () => {
      if (profile.current) applyProfile(profile.current, snapshot.current);
      if (!sampling) scheduleSample(ACTIVE_RESAMPLE_DELAY_MS);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        sampling = false;
        window.cancelAnimationFrame(raf);
        window.clearTimeout(restTimer);
      } else {
        scheduleSample(ACTIVE_RESAMPLE_DELAY_MS);
      }
    };

    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    syncImmediateDensity();
    startSample();

    return () => {
      stopped = true;
      sampling = false;
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(bootstrap);
      window.clearTimeout(restTimer);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
