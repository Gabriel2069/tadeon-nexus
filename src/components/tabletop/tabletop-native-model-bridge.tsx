import { useEffect } from "react";
import { tabletopMediaKind } from "@/lib/tabletop/tabletop-media";
import { TabletopNativeModelRenderer } from "@/lib/tabletop/tabletop-native-model-renderer";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopSnapshot } from "@/lib/tabletop/types";

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasNativeModels(snapshot: TabletopSnapshot | null) {
  return Boolean(
    snapshot?.scene.entities.some((entity) => {
      const properties = objectValue(entity.properties);
      return (
        !entity.hidden &&
        properties.model_visible !== false &&
        typeof entity.assetUrl === "string" &&
        tabletopMediaKind(properties.mime_type, entity.assetUrl) === "model"
      );
    }),
  );
}

export function TabletopNativeModelBridge() {
  useEffect(() => {
    let renderer: TabletopNativeModelRenderer | null = null;
    let snapshot: TabletopSnapshot | null = null;
    let frame = 0;
    let bootstrapFrame = 0;
    let stopped = false;

    const draw = (time: number) => {
      frame = 0;
      const runtime = currentTabletopRuntime();
      if (stopped || !renderer || !runtime || !snapshot || !hasNativeModels(snapshot))
        return;
      renderer.render(runtime, snapshot, time);
      frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frame && renderer && snapshot && hasNativeModels(snapshot))
        frame = window.requestAnimationFrame(draw);
    };

    const install = () => {
      bootstrapFrame = 0;
      if (stopped || renderer) return;
      const runtime = currentTabletopRuntime();
      if (!runtime) {
        bootstrapFrame = window.requestAnimationFrame(install);
        return;
      }
      try {
        renderer = new TabletopNativeModelRenderer(runtime.host);
        snapshot = runtime.snapshot();
        renderer.preload(snapshot);
        start();
      } catch {
        // WebGL2 can be unavailable on restricted WebViews or after context loss.
        // The normal tabletop token shell remains visible as a safe fallback.
      }
    };

    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      snapshot = detail ?? currentTabletopRuntime()?.snapshot() ?? null;
      if (renderer && snapshot) {
        renderer.preload(snapshot);
        if (!hasNativeModels(snapshot)) {
          const runtime = currentTabletopRuntime();
          if (runtime) renderer.render(runtime, snapshot, performance.now());
        }
      }
      start();
    };

    const onDestroyed = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      renderer?.destroy();
      renderer = null;
      snapshot = null;
    };

    install();
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (bootstrapFrame) window.cancelAnimationFrame(bootstrapFrame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
      renderer?.destroy();
    };
  }, []);

  return null;
}
