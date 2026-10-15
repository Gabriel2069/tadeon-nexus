import type { TabletopScene } from "@/lib/tabletop/types";

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

/** Compare content directly; never attach a serializer captured by scene clones. */
export function tabletopSceneFingerprint(scene: TabletopScene) {
  return JSON.stringify(canonicalScene(scene));
}
