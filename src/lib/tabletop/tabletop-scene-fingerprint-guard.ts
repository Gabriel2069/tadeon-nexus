import {
  tabletopPersistenceService,
  type PersistedTabletopScene,
} from "@/lib/tabletop/tabletop-persistence-service";
import type { TabletopScene } from "@/lib/tabletop/types";

type SerializableTabletopScene = TabletopScene & {
  toJSON?: () => unknown;
};

function canonicalScene(scene: TabletopScene) {
  return {
    id: scene.id,
    name: scene.name,
    width: scene.width,
    height: scene.height,
    gridMode: scene.gridMode,
    gridSize: scene.gridSize,
    gridScale: scene.gridScale,
    ...(scene.gridOffsetX !== undefined ? { gridOffsetX: scene.gridOffsetX } : {}),
    ...(scene.gridOffsetY !== undefined ? { gridOffsetY: scene.gridOffsetY } : {}),
    snap: scene.snap,
    ...(scene.backgroundAssetId !== undefined
      ? { backgroundAssetId: scene.backgroundAssetId }
      : {}),
    ...(scene.backgroundAssetUrl !== undefined
      ? { backgroundAssetUrl: scene.backgroundAssetUrl }
      : {}),
    ...(scene.levels
      ? {
          levels: scene.levels.map((level) => ({
            id: level.id,
            name: level.name,
            order: level.order,
            baseElevation: level.baseElevation,
            height: level.height,
            visible: level.visible,
            locked: level.locked,
          })),
        }
      : {}),
    layers: scene.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      order: layer.order,
      visible: layer.visible,
      locked: layer.locked,
      ...(layer.layerType ? { layerType: layer.layerType } : {}),
    })),
    entities: scene.entities.map((entity) => ({
      id: entity.id,
      layerId: entity.layerId,
      type: entity.type,
      label: entity.label,
      x: entity.x,
      y: entity.y,
      width: entity.width,
      height: entity.height,
      rotation: entity.rotation,
      zIndex: entity.zIndex,
      hidden: entity.hidden,
      locked: entity.locked,
      color: entity.color,
      ...(entity.assetUrl !== undefined ? { assetUrl: entity.assetUrl } : {}),
      ...(entity.elevation !== undefined ? { elevation: entity.elevation } : {}),
      ...(entity.levelId !== undefined ? { levelId: entity.levelId } : {}),
      ...(entity.assetId !== undefined ? { assetId: entity.assetId } : {}),
      ...(entity.linkedSheetId !== undefined ? { linkedSheetId: entity.linkedSheetId } : {}),
      ...(entity.linkedKnowledgeNodeId !== undefined
        ? { linkedKnowledgeNodeId: entity.linkedKnowledgeNodeId }
        : {}),
      ...(entity.ownerUserId !== undefined ? { ownerUserId: entity.ownerUserId } : {}),
      ...(entity.properties !== undefined ? { properties: entity.properties } : {}),
    })),
  };
}

export function attachTabletopSceneFingerprint(scene: PersistedTabletopScene) {
  const target = scene as SerializableTabletopScene;
  Object.defineProperty(target, "toJSON", {
    configurable: true,
    enumerable: true,
    value() {
      return canonicalScene(target);
    },
  });
  return scene;
}

let installed = false;

export function installTabletopSceneFingerprintGuard() {
  if (installed) return;
  installed = true;

  const loadScene = tabletopPersistenceService.loadScene.bind(tabletopPersistenceService);
  tabletopPersistenceService.loadScene = async (...args: Parameters<typeof loadScene>) =>
    attachTabletopSceneFingerprint(await loadScene(...args));

  const createScene = tabletopPersistenceService.createScene.bind(tabletopPersistenceService);
  tabletopPersistenceService.createScene = async (...args: Parameters<typeof createScene>) =>
    attachTabletopSceneFingerprint(await createScene(...args));

  const duplicateScene = tabletopPersistenceService.duplicateScene.bind(tabletopPersistenceService);
  tabletopPersistenceService.duplicateScene = async (...args: Parameters<typeof duplicateScene>) =>
    attachTabletopSceneFingerprint(await duplicateScene(...args));

  const saveWorkspace = tabletopPersistenceService.saveWorkspace.bind(tabletopPersistenceService);
  tabletopPersistenceService.saveWorkspace = async (...args: Parameters<typeof saveWorkspace>) =>
    attachTabletopSceneFingerprint(await saveWorkspace(...args));
}

installTabletopSceneFingerprintGuard();
