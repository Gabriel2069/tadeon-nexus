import "./tabletop-rich-media-runtime";
import type { CameraController } from "./camera-controller";
import { TabletopEngine } from "./tabletop-engine";
import type { Point, TabletopSnapshot } from "./types";

export interface TabletopBrowserRuntime {
  engine: TabletopEngine;
  host: HTMLElement;
  snapshot(): TabletopSnapshot;
  clientToWorld(point: Point): Point;
  worldToClient(point: Point): Point;
}

declare global {
  interface Window {
    __tadeonTabletopRuntime?: TabletopBrowserRuntime;
  }
}

type EngineInternals = {
  camera: CameraController;
  app: { canvas: HTMLCanvasElement };
};

type RuntimePrototype = {
  init(this: TabletopEngine, host: HTMLElement): Promise<void>;
  destroy(this: TabletopEngine): Promise<void>;
  render(this: TabletopEngine, notify?: boolean): void;
};

const runtimeState = globalThis as typeof globalThis & {
  __tadeonPlayerRuntimePatched?: boolean;
};

function dispatchRuntimeRender(engine: TabletopEngine) {
  if (typeof window === "undefined") return;
  if (window.__tadeonTabletopRuntime?.engine !== engine) return;
  window.dispatchEvent(
    new CustomEvent("tadeon-tabletop-render", {
      detail: engine.snapshot,
    }),
  );
}

if (!runtimeState.__tadeonPlayerRuntimePatched) {
  runtimeState.__tadeonPlayerRuntimePatched = true;
  const prototype = TabletopEngine.prototype as unknown as RuntimePrototype;
  const originalInit = prototype.init;
  const originalDestroy = prototype.destroy;
  const originalRender = prototype.render;

  prototype.init = async function initWithRuntime(this: TabletopEngine, host: HTMLElement) {
    await originalInit.call(this, host);
    if (typeof window === "undefined") return;
    const internals = this as unknown as EngineInternals;
    window.__tadeonTabletopRuntime = {
      engine: this,
      host,
      snapshot: () => this.snapshot,
      clientToWorld: (point) => {
        const rect = internals.app.canvas.getBoundingClientRect();
        return internals.camera.screenToWorld({
          x: point.x - rect.left,
          y: point.y - rect.top,
        });
      },
      worldToClient: (point) => {
        const rect = internals.app.canvas.getBoundingClientRect();
        const screen = internals.camera.worldToScreen(point);
        return { x: rect.left + screen.x, y: rect.top + screen.y };
      },
    };
    dispatchRuntimeRender(this);
  };

  prototype.render = function renderWithRuntime(this: TabletopEngine, notify = true) {
    originalRender.call(this, notify);
    // Camera pan/zoom, hover previews and resize call render(false). Broadcasting
    // those frames forced every React bridge to rebuild snapshots, audio and
    // preload work on each pointer frame, which could make the canvas feel
    // frozen on desktop. Only semantic/state renders need to wake the bridges.
    if (notify) dispatchRuntimeRender(this);
  };

  prototype.destroy = async function destroyWithRuntime(this: TabletopEngine) {
    if (typeof window !== "undefined" && window.__tadeonTabletopRuntime?.engine === this) {
      delete window.__tadeonTabletopRuntime;
      window.dispatchEvent(new CustomEvent("tadeon-tabletop-runtime-destroyed"));
    }
    await originalDestroy.call(this);
  };
}

export function currentTabletopRuntime() {
  return typeof window === "undefined" ? undefined : window.__tadeonTabletopRuntime;
}

export {};
