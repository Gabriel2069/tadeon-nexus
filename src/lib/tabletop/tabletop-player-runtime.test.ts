// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./tabletop-rich-media-runtime", () => ({}));
vi.mock("./tabletop-advanced-grid-runtime", () => ({}));
vi.mock("./tabletop-engine", () => ({
  TabletopEngine: class {
    disposed = false;
    finishInit = () => {};
    snapshot = { scene: { entities: [] } };
    camera = {
      projection: "plan",
      zoom: 1,
      orientation: {},
      screenToWorld: (point: unknown) => point,
      worldToScreen: (point: unknown) => point,
    };
    app = {
      get canvas(): HTMLCanvasElement {
        throw new Error("not initialized");
      },
    };
    async init() {
      await new Promise<void>((resolve) => {
        this.finishInit = resolve;
      });
      const canvas = document.createElement("canvas");
      Object.defineProperty(this.app, "canvas", {
        configurable: true,
        get: () => {
          if (this.disposed) throw new Error("destroyed renderer has no canvas");
          return canvas;
        },
      });
    }
    async destroy() {
      this.disposed = true;
    }
    render() {}
  },
}));
import { TabletopEngine } from "./tabletop-engine";
import { currentTabletopRuntime } from "./tabletop-player-runtime";

function engineFixture() {
  const engine = new TabletopEngine();
  return { engine, finish: () => (engine as unknown as { finishInit(): void }).finishInit() };
}
afterEach(() => {
  delete window.__tadeonTabletopRuntime;
});
describe("Tabletop runtime lifecycle", () => {
  it("publishes a ready engine and clears it before disposing the renderer", async () => {
    const { engine, finish } = engineFixture();
    const init = engine.init(document.createElement("div"));
    finish();
    await init;
    expect(currentTabletopRuntime()?.engine).toBe(engine);
    expect(currentTabletopRuntime()?.clientToWorld({ x: 2, y: 3 })).toEqual({ x: 2, y: 3 });
    await engine.destroy();
    expect(currentTabletopRuntime()).toBeUndefined();
  });
  it("does not publish an initialization that finishes after destruction", async () => {
    const { engine, finish } = engineFixture();
    const listener = vi.fn();
    window.addEventListener("tadeon-tabletop-render", listener);
    const init = engine.init(document.createElement("div"));
    await engine.destroy();
    finish();
    await expect(init).resolves.toBeUndefined();
    expect(currentTabletopRuntime()).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener("tadeon-tabletop-render", listener);
  });
  it("does not replace a newer runtime when an old disposed engine finishes", async () => {
    const old = engineFixture(),
      next = engineFixture();
    const oldInit = old.engine.init(document.createElement("div"));
    await old.engine.destroy();
    const nextInit = next.engine.init(document.createElement("div"));
    next.finish();
    await nextInit;
    old.finish();
    await oldInit;
    expect(currentTabletopRuntime()?.engine).toBe(next.engine);
    await old.engine.destroy();
    expect(currentTabletopRuntime()?.engine).toBe(next.engine);
  });
});

 it("announces view-only renders without publishing semantic scene snapshots", async () => {
  const { engine, finish } = engineFixture();
  const init = engine.init(document.createElement("div")); finish(); await init;
  const view = vi.fn(), scene = vi.fn();
  window.addEventListener("tadeon-tabletop-view", view);
  window.addEventListener("tadeon-tabletop-render", scene);
  (engine as unknown as { render: (notify: boolean) => void }).render(false);
  expect(view).toHaveBeenCalledTimes(1);
  expect(scene).not.toHaveBeenCalled();
  window.removeEventListener("tadeon-tabletop-view", view);
  window.removeEventListener("tadeon-tabletop-render", scene);
  await engine.destroy();
});
