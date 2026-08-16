import { useEffect } from "react";
import { tabletopMediaKind } from "@/lib/tabletop/tabletop-media";
import { TabletopNativeModelRenderer } from "@/lib/tabletop/tabletop-native-model-renderer";
import {
  applyTabletopNativeVisibilityMask,
  tabletopNativeVisibilityFingerprint,
} from "@/lib/tabletop/tabletop-native-model-visibility";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";
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

type VisibilityInternals = {
  visibilityState?: TabletopVisibilityState;
};

function nativeCanvas(host: HTMLElement) {
  return host.querySelector<HTMLCanvasElement>(".tadeon-tabletop-native-model-layer");
}

export function TabletopNativeModelBridge({
  secureVisibility = false,
}: {
  secureVisibility?: boolean;
}) {
  useEffect(() => {
    let renderer: TabletopNativeModelRenderer | null = null;
    let snapshot: TabletopSnapshot | null = null;
    let frame = 0;
    let bootstrapFrame = 0;
    let stopped = false;
    let maskFingerprint = "";

    const syncVisibilityMask = () => {
      const runtime = currentTabletopRuntime();
      if (!runtime) return;
      const canvas = nativeCanvas(runtime.host);
      if (!canvas) return;
      if (!secureVisibility) {
        canvas.style.visibility = "visible";
        if (maskFingerprint !== "unmasked") {
          canvas.style.maskImage = "none";
          canvas.style.setProperty("-webkit-mask-image", "none");
          maskFingerprint = "unmasked";
        }
        return;
      }

      const state = (runtime.engine as unknown as VisibilityInternals).visibilityState;
      if (!state) {
        // Fail closed: the participant must never see a native mesh before the
        // server-authoritative visibility document has reached the engine.
        // The Pixi shell remains available as the safe fallback meanwhile.
        canvas.style.visibility = "hidden";
        maskFingerprint = "awaiting-visibility";
        return;
      }

      canvas.style.visibility = "visible";
      const nextFingerprint = tabletopNativeVisibilityFingerprint(runtime, state);
      if (nextFingerprint === maskFingerprint) return;
      applyTabletopNativeVisibilityMask(canvas, runtime, state);
      maskFingerprint = nextFingerprint;
    };

    const draw = (time: number) => {
      frame = 0;
      const runtime = currentTabletopRuntime();
      if (stopped || !renderer || !runtime || !snapshot || !hasNativeModels(snapshot))
        return;
      syncVisibilityMask();
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
        syncVisibilityMask();
        start();
      } catch {
        // WebGL2 can be unavailable on restricted WebViews or after context loss.
        // The normal tabletop token shell remains visible as a safe fallback.
      }
    };

    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      snapshot = detail ?? currentTabletopRuntime()?.snapshot() ?? null;
      maskFingerprint = "";
      if (renderer && snapshot) {
        renderer.preload(snapshot);
        syncVisibilityMask();
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
      maskFingerprint = "";
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
  }, [secureVisibility]);

  return null;
}
