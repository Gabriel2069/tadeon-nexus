import { useEffect } from "react";
import { tabletopMediaKind } from "@/lib/tabletop/tabletop-media";
import { TabletopNativeModelRenderer } from "@/lib/tabletop/tabletop-native-model-renderer";
import {
  applyTabletopNativeVisibilityMask,
  tabletopNativeVisibilityFingerprint,
} from "@/lib/tabletop/tabletop-native-model-visibility";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import {
  filterSceneForTabletopStreaming,
  type TabletopStreamingPlan,
} from "@/lib/tabletop/tabletop-spatial-streaming";
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

type NativeDensityInternals = {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
};

type NativeDensityPrototype = {
  ensureCanvasSize(this: NativeDensityInternals): {
    width: number;
    height: number;
    ratio: number;
  };
};

const nativeDensityState = globalThis as typeof globalThis & {
  __tadeonNativeDensityPatched?: boolean;
};

/* The native WebGL model layer used to keep its own hard 2x DPR ceiling while
   the Pixi scene could render at 2.5x/3x. Because both canvases are composited,
   the 3D layer remained visibly softer. `private` TS methods are normal
   prototype methods at runtime, so patch the sizing contract once and make it
   consume the same quality-resolution variable as the main renderer. */
function installNativeDensityContract() {
  if (nativeDensityState.__tadeonNativeDensityPatched) return;
  nativeDensityState.__tadeonNativeDensityPatched = true;
  const prototype = TabletopNativeModelRenderer.prototype as unknown as NativeDensityPrototype;
  prototype.ensureCanvasSize = function ensureHighDensityNativeCanvas() {
    const deviceRatio = Math.max(1, window.devicePixelRatio || 1);
    const requested = Number.parseFloat(
      this.host.style.getPropertyValue("--tadeon-tabletop-quality-resolution"),
    );
    const ratio = Math.min(
      deviceRatio,
      Number.isFinite(requested) && requested > 0 ? requested : 3,
    );
    const cssWidth = Math.max(1, this.host.clientWidth);
    const cssHeight = Math.max(1, this.host.clientHeight);
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.canvas.style.imageRendering = "auto";
    this.gl.viewport(0, 0, width, height);
    return { width: cssWidth, height: cssHeight, ratio };
  };
}

installNativeDensityContract();

function nativeCanvas(host: HTMLElement) {
  return host.querySelector<HTMLCanvasElement>(".tadeon-tabletop-native-model-layer");
}

function streamedSnapshot(
  snapshot: TabletopSnapshot,
  plan: TabletopStreamingPlan | null,
): TabletopSnapshot {
  return {
    ...snapshot,
    scene: filterSceneForTabletopStreaming(snapshot.scene, plan),
  };
}

export function TabletopNativeModelBridge({
  secureVisibility = false,
}: {
  secureVisibility?: boolean;
}) {
  useEffect(() => {
    let renderer: TabletopNativeModelRenderer | null = null;
    let snapshot: TabletopSnapshot | null = null;
    let streamingPlan: TabletopStreamingPlan | null =
      window.__tadeonTabletopStreamingPlan ?? null;
    let frame = 0;
    let bootstrapFrame = 0;
    let stopped = false;
    let maskFingerprint = "";

    const activeSnapshot = () =>
      snapshot ? streamedSnapshot(snapshot, streamingPlan) : null;

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
      const renderSnapshot = activeSnapshot();
      if (
        stopped ||
        !renderer ||
        !runtime ||
        !renderSnapshot ||
        !hasNativeModels(renderSnapshot)
      )
        return;
      syncVisibilityMask();
      renderer.render(runtime, renderSnapshot, time);
      frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      const renderSnapshot = activeSnapshot();
      if (!frame && renderer && renderSnapshot && hasNativeModels(renderSnapshot))
        frame = window.requestAnimationFrame(draw);
    };

    const syncRenderer = () => {
      const renderSnapshot = activeSnapshot();
      if (!renderer || !renderSnapshot) return;
      renderer.preload(renderSnapshot);
      syncVisibilityMask();
      if (!hasNativeModels(renderSnapshot)) {
        const runtime = currentTabletopRuntime();
        if (runtime) renderer.render(runtime, renderSnapshot, performance.now());
      }
      start();
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
        syncRenderer();
      } catch {
        // WebGL2 can be unavailable on restricted WebViews or after context loss.
        // The normal tabletop token shell remains visible as a safe fallback.
      }
    };

    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      snapshot = detail ?? currentTabletopRuntime()?.snapshot() ?? null;
      maskFingerprint = "";
      syncRenderer();
    };

    const onStreaming = (event: Event) => {
      streamingPlan =
        (event as CustomEvent<TabletopStreamingPlan>).detail ??
        window.__tadeonTabletopStreamingPlan ??
        null;
      syncRenderer();
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
    window.addEventListener("tadeon-tabletop-streaming-plan", onStreaming);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (bootstrapFrame) window.cancelAnimationFrame(bootstrapFrame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-streaming-plan", onStreaming);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
      renderer?.destroy();
    };
  }, [secureVisibility]);

  return null;
}
