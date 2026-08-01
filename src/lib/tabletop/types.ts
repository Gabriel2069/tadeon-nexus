export type GridMode = "square" | "none";

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
  assetId?: string | null;
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
  layers: TabletopLayer[];
  entities: TabletopEntity[];
}

export interface TabletopSnapshot {
  scene: TabletopScene;
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;
}

export const EMPTY_TABLETOP_SCENE: TabletopScene = {
  id: "local-scene",
  name: "Selecione ou crie uma cena",
  width: 2400,
  height: 1600,
  gridMode: "square",
  gridSize: 64,
  gridScale: 1,
  snap: true,
  layers: [
    {
      id: "map",
      name: "Mapa",
      order: 0,
      visible: true,
      locked: true,
      layerType: "map",
    },
    {
      id: "objects",
      name: "Objetos",
      order: 1,
      visible: true,
      locked: false,
      layerType: "objects",
    },
    {
      id: "tokens",
      name: "Tokens",
      order: 2,
      visible: true,
      locked: false,
      layerType: "tokens",
    },
    {
      id: "drawings",
      name: "Desenhos",
      order: 3,
      visible: true,
      locked: false,
      layerType: "drawings",
    },
    {
      id: "master",
      name: "Mestre",
      order: 4,
      visible: true,
      locked: false,
      layerType: "master",
    },
  ],
  entities: [],
};

export function cloneScene(scene: TabletopScene): TabletopScene {
  return {
    ...scene,
    layers: scene.layers.map((layer) => ({ ...layer })),
    entities: scene.entities.map((entity) => ({ ...entity })),
  };
}
