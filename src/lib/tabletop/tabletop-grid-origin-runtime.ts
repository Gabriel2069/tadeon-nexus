import { TabletopPersistenceService } from "./tabletop-persistence-service";
import type { TabletopEngine } from "./tabletop-engine";
import type { TabletopScene } from "./types";

type PersistencePrototype = {
  saveWorkspace: TabletopPersistenceService["saveWorkspace"];
};

type RuntimeState = typeof globalThis & {
  __tadeonGridOriginPersistencePatched?: boolean;
};

const runtime = globalThis as RuntimeState;

if (!runtime.__tadeonGridOriginPersistencePatched) {
  runtime.__tadeonGridOriginPersistencePatched = true;
  const prototype = TabletopPersistenceService.prototype as unknown as PersistencePrototype;
  const original = prototype.saveWorkspace;
  prototype.saveWorkspace = async function saveWorkspaceWithGridOrigin(
    this: TabletopPersistenceService,
    originalScene,
    currentScene,
    overrides,
  ) {
    return original.call(
      this,
      {
        ...originalScene,
        gridOffsetX: Number.isFinite(currentScene.gridOffsetX)
          ? Number(currentScene.gridOffsetX)
          : originalScene.gridOffsetX,
        gridOffsetY: Number.isFinite(currentScene.gridOffsetY)
          ? Number(currentScene.gridOffsetY)
          : originalScene.gridOffsetY,
      },
      currentScene,
      overrides,
    );
  };
}

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
