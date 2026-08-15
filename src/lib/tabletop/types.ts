export type GridMode = "square" | "hex_pointy" | "hex_flat" | "isometric" | "none";

export interface Point {
  x: number;
  y: number;
}

export interface TabletopLayer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  layerType?: "map" | "objects" | "tokens" | "drawings" | "master";
}

export interface TabletopLevel {
  id: string;
  name: string;
  order: number;
  baseElevation: number;
  height: number;
  visible: boolean;
  locked: boolean;
  version: number;
}

export interface TabletopEntity {
  id: string;
  layerId: string;
  type:
    | "token"
    | "creature"
    | "npc"
    | "character"
    | "object"
    | "tile"
    | "drawing"
    | "text"
    | "marker"
    | "note"
    | "area"
    | "light"
    | "handout_pin";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  hidden: boolean;
  locked: boolean;
  color: number;
  assetUrl?: string;
  elevation?: number;
  levelId?: string | null;
  assetId?: string | null;
  linkedSheetId?: string | null;
  linkedKnowledgeNodeId?: string | null;
  ownerUserId?: string | null;
  properties?: unknown;
}

export interface TabletopEntitySeed {
  type: TabletopEntity["type"];
  label: string;
  width?: number;
  height?: number;
  levelId?: string | null;
  assetId?: string | null;
  assetUrl?: string;
  linkedSheetId?: string | null;
  linkedKnowledgeNodeId?: string | null;
  ownerUserId?: string | null;
  properties?: unknown;
}

export interface TabletopScene {
  id: string;
  name: string;
  width: number;
  height: number;
  gridMode: GridMode;
  gridSize: number;
  gridScale: number;
  snap: boolean;
  backgroundAssetId?: string | null;
  backgroundAssetUrl?: string;
  levels?: TabletopLevel[];
  layers: TabletopLayer[];
  entities: TabletopEntity[];
}

export interface TabletopSnapshot {
  scene: TabletopScene;
  activeLevelId?: string | null;
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;
}

export const TABLETOP_GRID_LABELS: Record<GridMode, string> = {
  square: "Quadrada",
  hex_pointy: "Hexagonal vertical",
  hex_flat: "Hexagonal horizontal",
  isometric: "Isométrica",
  none: "Sem grade",
};

export const EMPTY_TABLETOP_SCENE: TabletopScene = {
  id: "local-scene",
  name: "Selecione ou crie uma cena",
  width: 2400,
  height: 1600,
  gridMode: "square",
  gridSize: 64,
  gridScale: 1,
  snap: true,
  levels: [
    {
      id: "local-level",
      name: "Térreo",
      order: 0,
      baseElevation: 0,
      height: 192,
      visible: true,
      locked: false,
      version: 1,
    },
  ],
  layers: [
    { id: "map", name: "Mapa", order: 0, visible: true, locked: true, layerType: "map" },
    { id: "objects", name: "Objetos", order: 1, visible: true, locked: false, layerType: "objects" },
    { id: "tokens", name: "Tokens", order: 2, visible: true, locked: false, layerType: "tokens" },
    { id: "drawings", name: "Desenhos", order: 3, visible: true, locked: false, layerType: "drawings" },
    { id: "master", name: "Mestre", order: 4, visible: true, locked: false, layerType: "master" },
  ],
  entities: [],
};

export function cloneScene(scene: TabletopScene): TabletopScene {
  return {
    ...scene,
    levels: scene.levels?.map((level) => ({ ...level })),
    layers: scene.layers.map((layer) => ({ ...layer })),
    entities: scene.entities.map((entity) => ({ ...entity })),
  };
}

export function tabletopSceneLevels(scene: TabletopScene): TabletopLevel[] {
  return scene.levels && scene.levels.length > 0
    ? [...scene.levels].sort(
        (left, right) => left.order - right.order || left.id.localeCompare(right.id),
      )
    : [
        {
          id: "local-level",
          name: "Térreo",
          order: 0,
          baseElevation: 0,
          height: Math.max(64, scene.gridSize * 3),
          visible: true,
          locked: false,
          version: 1,
        },
      ];
}
