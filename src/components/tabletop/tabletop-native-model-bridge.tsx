import { useEffect } from "react";
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
    let streamingPlan: TabletopStreamingPlan | null = window.__tadeonTabletopStreamingPlan ?? null;
    let frame = 0;
    let bootstrapFrame = 0;
    let stopped = false;
    let maskFingerprint = "";
    let resizeObserver: ResizeObserver | null = null;
    let unavailableHost: HTMLElement | null = null;
    let animationInterval = 1000 / 60;
    let lastDraw = -Infinity;
    let forceDraw = true;
    let lastFrameSignature: string | null = null;

    const activeSnapshot = () => (snapshot ? streamedSnapshot(snapshot, streamingPlan) : null);

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
      if (stopped || !renderer || !runtime || !renderSnapshot || document.hidden) return;
      const animated = renderer.hasAnimatedModels(renderSnapshot);
      if (animated && !forceDraw && time - lastDraw + 0.75 < animationInterval) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      forceDraw = false;
      lastDraw = time;
      syncVisibilityMask();
      const signature = animated ? null : renderer.frameSignature(runtime, renderSnapshot);
      if (!animated && signature === lastFrameSignature) return;
      renderer.render(runtime, renderSnapshot, time);
      lastFrameSignature = signature;
      if (renderer.hasAnimatedModels(renderSnapshot)) frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      forceDraw = true;
      if (!stopped && !document.hidden && !frame && renderer && activeSnapshot())
        frame = window.requestAnimationFrame(draw);
    };

    const syncRenderer = () => {
      const renderSnapshot = activeSnapshot();
      if (!renderer || !renderSnapshot) return;
      renderer.preload(renderSnapshot);
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
      if (unavailableHost === runtime.host) return;
      try {
        renderer = new TabletopNativeModelRenderer(runtime.host, start);
        resizeObserver = new ResizeObserver(start);
        resizeObserver.observe(runtime.host);
        snapshot = runtime.snapshot();
        syncRenderer();
      } catch {
        // WebGL2 can be unavailable on restricted WebViews or after context loss.
        // The normal tabletop token shell remains visible as a safe fallback.
        unavailableHost = runtime.host;
        renderer?.destroy();
        renderer = null;
        resizeObserver?.disconnect();
        resizeObserver = null;
        const failed = nativeCanvas(runtime.host);
        failed?.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext();
        failed?.remove();
      }
    };

    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      snapshot = detail ?? currentTabletopRuntime()?.snapshot() ?? null;
      maskFingerprint = "";
      if (!renderer) install();
      else syncRenderer();
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
      resizeObserver?.disconnect();
      resizeObserver = null;
      renderer?.destroy();
      renderer = null;
      snapshot = null;
      unavailableHost = null;
      lastFrameSignature = null;
      maskFingerprint = "";
    };

    install();
    const onQuality = (event: Event) => {
      const detail = (event as CustomEvent<{ nativeAnimationFps?: number; resolution?: number }>)
        .detail;
      const fps = Number(detail?.nativeAnimationFps);
      animationInterval =
        1000 / (Number.isFinite(fps) && fps > 0 ? Math.max(10, Math.min(60, fps)) : 60);
      const runtime = currentTabletopRuntime();
      const canvas = runtime && nativeCanvas(runtime.host);
      const resolution = Math.min(window.devicePixelRatio || 1, Number(detail?.resolution));
      if (
        runtime &&
        canvas &&
        Number.isFinite(resolution) &&
        resolution > 0 &&
        (canvas.width !== Math.round(Math.max(1, runtime.host.clientWidth) * resolution) ||
          canvas.height !== Math.round(Math.max(1, runtime.host.clientHeight) * resolution))
      )
        start();
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        lastFrameSignature = null;
        start();
      }
    };
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-view", start);
    window.addEventListener("tadeon-tabletop-quality", onQuality);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("tadeon-tabletop-streaming-plan", onStreaming);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (bootstrapFrame) window.cancelAnimationFrame(bootstrapFrame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-view", start);
      window.removeEventListener("tadeon-tabletop-quality", onQuality);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("tadeon-tabletop-streaming-plan", onStreaming);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
      renderer?.destroy();
      resizeObserver?.disconnect();
    };
  }, [secureVisibility]);

  return null;
}
