import type { TabletopEngine } from "./tabletop-engine";
import type { TabletopScene } from "./types";

/**
 * Aplica a origem da grade sem introduzir um segundo estado paralelo.
 * loadScene é usado apenas durante a confirmação explícita do Setup inteligente;
 * setGrid em seguida emite a alteração pelo fluxo canônico de render/autosave.
 */
export function applyTabletopGridOrigin(
  engine: TabletopEngine,
  scene: TabletopScene,
  offsetX: number,
  offsetY: number,
) {
  const spacing = Math.max(8, scene.gridSize * scene.gridScale);
  const normalize = (value: number) => ((value % spacing) + spacing) % spacing;
  engine.loadScene({
    ...scene,
    gridOffsetX: normalize(Number.isFinite(offsetX) ? offsetX : 0),
    gridOffsetY: normalize(Number.isFinite(offsetY) ? offsetY : 0),
  });
  engine.setGrid(scene.gridMode, scene.gridSize);
}
