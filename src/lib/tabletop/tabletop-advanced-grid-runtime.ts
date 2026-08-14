import { snapPointToGrid } from "./grid-renderer";
import { TabletopEngine } from "./tabletop-engine";
import type { Point } from "./types";

type RuntimeEnginePrototype = {
  snap(this: TabletopEngine, point: Point): Point;
};

const runtimeFlag = Symbol.for("tadeon.tabletop.advanced-grid-runtime");
const globalState = globalThis as typeof globalThis & { [runtimeFlag]?: boolean };

if (!globalState[runtimeFlag]) {
  globalState[runtimeFlag] = true;
  const prototype = TabletopEngine.prototype as unknown as RuntimeEnginePrototype;
  prototype.snap = function snapAdvancedGrid(this: TabletopEngine, point: Point) {
    const scene = this.snapshot.scene;
    if (!scene.snap || scene.gridMode === "none") return point;
    return snapPointToGrid(point, scene.gridMode, scene.gridSize * scene.gridScale);
  };
}

export {};
