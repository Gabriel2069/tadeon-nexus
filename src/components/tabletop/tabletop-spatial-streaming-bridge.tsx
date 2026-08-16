import { useEffect } from "react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { buildTabletopGpuVisibilityField } from "@/lib/tabletop/tabletop-gpu-visibility-field";
import {
  buildTabletopStreamingPlan,
  type TabletopStreamingPlan,
  type TabletopStreamingViewport,
} from "@/lib/tabletop/tabletop-spatial-streaming";
import type { TabletopQualityProfile } from "@/lib/tabletop/tabletop-adaptive-performance";
import type { TabletopVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";

const BALANCED: TabletopQualityProfile = {
  tier: "balanced",
  maxResolution: 1.25,
  nativeModels: true,
  effects: "reduced",
  textureBudgetMb: 256,
};

type VisibilityInternals = { visibilityState?: TabletopVisibilityState };

declare global {
  interface Window {
    __tadeonTabletopStreamingPlan?: TabletopStreamingPlan;
  }
}

function worldViewport() {
  const runtime = currentTabletopRuntime();
  if (!runtime) return null;
  const rect = runtime.host.getBoundingClientRect();
  const corners = [
    runtime.clientToWorld({ x: rect.left, y: rect.top }),
    runtime.clientToWorld({ x: rect.right, y: rect.top }),
    runtime.clientToWorld({ x: rect.left, y: rect.bottom }),
    runtime.clientToWorld({ x: rect.right, y: rect.bottom }),
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(1, Math.max(...xs) - x),
    height: Math.max(1, Math.max(...ys) - y),
  };
}

export function TabletopSpatialStreamingBridge() {
  useEffect(() => {
    let profile = BALANCED;
    let stopped = false;
    let timer = 0;
    let previous: { viewport: TabletopStreamingViewport; at: number } | null = null;
    let fingerprint = "";

    const onQuality = (event: Event) => {
      profile = (event as CustomEvent<TabletopQualityProfile>).detail ?? profile;
    };
    window.addEventListener("tadeon-tabletop-quality", onQuality);

    const tick = () => {
      if (stopped) return;
      const runtime = currentTabletopRuntime();
      const viewport = worldViewport();
      if (runtime && viewport) {
        const now = performance.now();
        const elapsed = Math.max(16, now - (previous?.at ?? now));
        const centerX = viewport.x + viewport.width / 2;
        const centerY = viewport.y + viewport.height / 2;
        const previousCenterX = previous
          ? previous.viewport.x + previous.viewport.width / 2
          : centerX;
        const previousCenterY = previous
          ? previous.viewport.y + previous.viewport.height / 2
          : centerY;
        const movingViewport: TabletopStreamingViewport = {
          ...viewport,
          velocityX: ((centerX - previousCenterX) * 1000) / elapsed,
          velocityY: ((centerY - previousCenterY) * 1000) / elapsed,
        };
        previous = { viewport: movingViewport, at: now };
        const snapshot = runtime.snapshot();
        const visibility = (runtime.engine as unknown as VisibilityInternals).visibilityState;
        const maxEdge =
          profile.tier === "cinematic"
            ? 640
            : profile.tier === "high"
              ? 512
              : profile.tier === "balanced"
                ? 384
                : 256;
        const field = visibility
          ? buildTabletopGpuVisibilityField(snapshot.scene, visibility, {
              maxEdge,
              levelId: snapshot.activeLevelId,
            })
          : null;
        const plan = buildTabletopStreamingPlan(
          snapshot.scene,
          movingViewport,
          profile,
          field,
        );
        if (plan.fingerprint !== fingerprint) {
          fingerprint = plan.fingerprint;
          window.__tadeonTabletopStreamingPlan = plan;
          runtime.host.dataset.streamingTier = profile.tier;
          runtime.host.style.setProperty(
            "--tadeon-streaming-active",
            String(plan.activeEntityIds.length),
          );
          window.dispatchEvent(
            new CustomEvent<TabletopStreamingPlan>("tadeon-tabletop-streaming-plan", {
              detail: plan,
            }),
          );
        }
      }
      timer = window.setTimeout(tick, 220);
    };

    tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      window.removeEventListener("tadeon-tabletop-quality", onQuality);
      delete window.__tadeonTabletopStreamingPlan;
    };
  }, []);

  return null;
}
