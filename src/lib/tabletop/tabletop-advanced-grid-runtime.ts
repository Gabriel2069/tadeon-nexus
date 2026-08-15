import { snapPointToGrid } from "./grid-renderer";
import { TabletopEngine } from "./tabletop-engine";
import type { GridMode, Point } from "./types";

type RuntimeEnginePrototype = {
  snap(this: TabletopEngine, point: Point): Point;
  setGrid(this: TabletopEngine, mode: GridMode, size?: number): void;
};

type RuntimeState = typeof globalThis & {
  __tadeonAdvancedGridRuntime?: boolean;
  __tadeonPendingGridMode?: GridMode | null;
  __tadeonActiveGridMode?: GridMode | null;
};

const runtime = globalThis as RuntimeState;
const ADVANCED_GRID_OPTIONS: Array<[GridMode, string]> = [
  ["square", "Quadrada"],
  ["hex_pointy", "Hexagonal vertical"],
  ["hex_flat", "Hexagonal horizontal"],
  ["isometric", "Isométrica"],
  ["none", "Sem grade"],
];

function enhanceGridSelect(select: HTMLSelectElement) {
  if (select.getAttribute("aria-label") !== "Modo de grade") return;
  const current = runtime.__tadeonActiveGridMode ?? (select.value as GridMode);
  const existing = new Map(Array.from(select.options).map((option) => [option.value, option]));
  for (const [value, label] of ADVANCED_GRID_OPTIONS) {
    let option = existing.get(value);
    if (!option) {
      option = document.createElement("option");
      option.value = value;
      select.appendChild(option);
    }
    option.textContent = label;
  }
  if (ADVANCED_GRID_OPTIONS.some(([value]) => value === current)) select.value = current;
}

function enhanceVisibleGridSelects() {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLSelectElement>('select[aria-label="Modo de grade"]')
    .forEach(enhanceGridSelect);
}

if (!runtime.__tadeonAdvancedGridRuntime) {
  runtime.__tadeonAdvancedGridRuntime = true;
  const prototype = TabletopEngine.prototype as unknown as RuntimeEnginePrototype;
  const originalSetGrid = prototype.setGrid;

  prototype.snap = function snapAdvancedGrid(this: TabletopEngine, point: Point) {
    const scene = this.snapshot.scene;
    if (!scene.snap || scene.gridMode === "none") return point;
    return snapPointToGrid(point, scene.gridMode, scene.gridSize * scene.gridScale);
  };

  prototype.setGrid = function setAdvancedGrid(
    this: TabletopEngine,
    mode: GridMode,
    size?: number,
  ) {
    const requested = runtime.__tadeonPendingGridMode;
    runtime.__tadeonPendingGridMode = null;
    const effectiveMode = requested ?? mode;
    runtime.__tadeonActiveGridMode = effectiveMode;
    originalSetGrid.call(this, effectiveMode, size);
    queueMicrotask(enhanceVisibleGridSelects);
  };

  if (typeof document !== "undefined") {
    const maybeEnhanceFromEvent = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLSelectElement) enhanceGridSelect(target);
    };
    document.addEventListener("pointerdown", maybeEnhanceFromEvent, true);
    document.addEventListener("focusin", maybeEnhanceFromEvent, true);
    document.addEventListener(
      "change",
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement)) return;
        if (target.getAttribute("aria-label") !== "Modo de grade") return;
        const requested = target.value as GridMode;
        if (!ADVANCED_GRID_OPTIONS.some(([value]) => value === requested)) return;
        runtime.__tadeonPendingGridMode = requested;
      },
      true,
    );
    // Somente algumas tentativas baratas durante a abertura. O antigo
    // MutationObserver varria o documento inteiro a cada mutação do React e
    // podia monopolizar a thread principal justamente ao montar a Mesa.
    queueMicrotask(enhanceVisibleGridSelects);
    window.setTimeout(enhanceVisibleGridSelects, 250);
    window.setTimeout(enhanceVisibleGridSelects, 900);
  }
}

export {};
