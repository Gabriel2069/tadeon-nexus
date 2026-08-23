import { Application, Container, Graphics, Matrix, Sprite } from "pixi.js";
import {
  CameraController,
  type TabletopProjectionMode,
  type TabletopViewOrientation,
} from "./camera-controller";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  normalizeTabletopViewOrientation,
  normalizeTabletopViewState,
  tabletopElevationOffset,
  tabletopProjectionMatrix,
  type TabletopViewState,
} from "./tabletop-projection";
import { CommandHistory } from "./command-history";
import { EntityRenderer } from "./entity-renderer";
import {
  boundsFromEntities,
  entityIntersectsBounds,
  clampEntityToScene,
  pointInRotatedRect,
  type TabletopBounds,
} from "./geometry";
import { GridRenderer, snapPointToGrid } from "./grid-renderer";
import {
  InteractionController,
  type TabletopMeasurementPreview,
  type TabletopStructurePreview,
  type TabletopToolMode,
  type TabletopVisibilityToolPreview,
} from "./interaction-controller";
import { LayerManager } from "./layer-manager";
import { SceneManager } from "./scene-manager";
import { SelectionManager } from "./selection-manager";
import { TabletopSelectionOverlay } from "./selection-overlay";
import { TextureManager } from "./texture-manager";
import {
  createTabletopDrawingEntity,
  readTabletopDrawingPoints,
  type TabletopDrawingStyle,
} from "./tabletop-drawing";
import { TabletopToolOverlay } from "./tabletop-tool-overlay";
import { TabletopSpatialRenderer } from "./spatial-renderer";
import {
  structureCollision,
  type TabletopStructureType,
} from "./tabletop-spatial";
import {
  hitTestTabletopStructure,
  nextTabletopStructureState,
} from "./tabletop-structure-editor";
import {
  alignTabletopEntities,
  distributeTabletopEntities,
  moveTabletopEntitiesToEdge,
  type TabletopAlignment,
  type TabletopDistribution,
  type TabletopStackEdge,
} from "./tabletop-arrangement";
import {
  createEmptyVisibilityState,
  type TabletopFogShape,
  type TabletopFogStroke,
  type TabletopLight,
  type TabletopVisibilityState,
  type TabletopWall,
} from "./tabletop-visibility-service";
import {
  hitTestTabletopFog,
  hitTestTabletopLight,
  tabletopFogBounds,
} from "./visibility-tooling";
import { TabletopVisibilityRenderer } from "./visibility-renderer";
import {
  activeTabletopLevel,
  tabletopItemLevelId,
  updateTabletopLevelStack,
} from "./tabletop-levels";
import {
  tabletopDirectorCameraFromView,
  type TabletopDirectorCamera,
} from "./tabletop-director-state";
import {
  cloneScene,
  EMPTY_TABLETOP_SCENE,
  type Point,
  type TabletopEntity,
  type TabletopEntitySeed,
  type TabletopLevel,
  type TabletopScene,
  type TabletopSnapshot,
} from "./types";

export interface TabletopEngineOptions {
  onChange?: (snapshot: TabletopSnapshot) => void;
  onAssetError?: (message: string) => void;
  onContextMenu?: (
    position: Point,
    entityId?: string,
    lightId?: string,
  ) => void;
  onToolModeChange?: (mode: TabletopToolMode) => void;
  onCreateStructure?: (structure: TabletopStructurePreview) => void;
  onSelectStructure?: (id: string | null) => void;
  onUpdateStructure?: (
    before: TabletopWall,
    after: TabletopWall,
    label: string,
  ) => void;
  onDeleteStructure?: (id: string) => void;
  onDuplicateStructure?: (id: string) => void;
  onSelectLight?: (id: string | null) => void;
  onUpdateLight?: (
    before: TabletopLight,
    after: TabletopLight,
    label: string,
  ) => void;
  onDeleteLight?: (id: string) => void;
  onDuplicateLight?: (id: string) => void;
  onSelectFog?: (id: string | null) => void;
  onUpdateFog?: (
    before: TabletopFogStroke,
    after: TabletopFogStroke,
    label: string,
  ) => void;
  onDeleteFog?: (id: string) => void;
  onDuplicateFog?: (id: string) => void;
  onActivateStructure?: (wall: TabletopWall) => void;
  onActivateEntity?: (entity: TabletopEntity) => boolean | void;
  onViewChange?: (view: TabletopViewState) => void;
  onCommitVisibilityTool?: (preview: TabletopVisibilityToolPreview) => void;
}

export class TabletopEngine {
  private readonly app = new Application();
  private readonly viewport = new Container();
  private readonly world = new Container({ label: "tabletop-world" });
  private readonly sceneBackground = new Container();
  private readonly sceneBackgroundShape = new Graphics();
  private readonly scenes = new SceneManager();
  private readonly selection = new SelectionManager();
  private readonly history = new CommandHistory();
  private readonly textures = new TextureManager();
  private readonly grid = new GridRenderer();
  private readonly layers = new LayerManager(() => this.scenes.scene.layers);
  private readonly camera = new CameraController(this.viewport);
  private readonly entities: EntityRenderer;
  private readonly visibility = new TabletopVisibilityRenderer();
  private readonly spatial = new TabletopSpatialRenderer();
  private readonly toolOverlay = new TabletopToolOverlay();
  private readonly selectionOverlay = new TabletopSelectionOverlay();
  private visibilityState = createEmptyVisibilityState();
  private visibilityGuides = false;
  private marqueeBounds: TabletopBounds | null = null;
  private toolMode: TabletopToolMode = "select";
  private projectionMode: TabletopProjectionMode = "plan";
  private viewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION;
  private structureType: TabletopStructureType = "wall";
  private selectedStructureId: string | null = null;
  private selectedLightId: string | null = null;
  private selectedFogId: string | null = null;
  private activeLevelId: string | null = null;
  private interactiveStructureIds = new Set<string>();
  private interaction: InteractionController | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeFrame = 0;
  private host: HTMLElement | null = null;
  private initialized = false;
  private destroyed = false;
  private readOnly = false;
  private clipboard: TabletopEntity[] = [];
  private backgroundSprite: Sprite | null = null;
  private backgroundAssetUrl: string | undefined;
  private drawingStyle: TabletopDrawingStyle = {
    color: 0xd9d7a4,
    width: 5,
    opacity: 0.94,
  };
  private gridVisible = true;
  private visibilityToolPreview: TabletopVisibilityToolPreview | null = null;
  private lightToolRadius = 320;
  private fogToolRadius = 160;
  private fogToolShape: TabletopFogShape = "brush";
  private lastViewFingerprint = "";
  private suppressViewChange = false;

  constructor(private readonly options: TabletopEngineOptions = {}) {
    this.entities = new EntityRenderer(
      this.textures,
      (message) => this.options.onAssetError?.(message),
      () => this.render(),
    );
  }

  async init(host: HTMLElement) {
    if (this.host) throw new Error("O motor da Mesa já foi inicializado.");
    this.host = host;
    const width = Math.max(320, host.clientWidth);
    const height = Math.max(320, host.clientHeight);
    await this.app.init({
      width,
      height,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: 0x080a0f,
      autoStart: false,
      preference: "webgl",
    });
    this.initialized = true;
    if (this.destroyed) {
      await this.destroyInitializedEngine();
      return;
    }
    this.app.canvas.className = "block h-full w-full touch-none outline-none";
    this.app.canvas.setAttribute("aria-label", "Canvas da Mesa Nexus");
    host.appendChild(this.app.canvas);

    this.sceneBackground.addChild(this.sceneBackgroundShape);
    this.world.addChild(
      this.sceneBackground,
      this.grid.view,
      this.spatial.below,
      this.entities.view,
      this.spatial.above,
      this.visibility.view,
      this.toolOverlay.view,
      this.selectionOverlay.view,
    );
    this.viewport.addChild(this.world);
    this.app.stage.addChild(this.viewport);
    this.interaction = new InteractionController(this.app.canvas, {
      camera: this.camera,
      hitTest: (point) => this.hitTest(point),
      hitTestStructure: (point) => this.hitTestStructure(point),
      hitTestLight: (point) => this.hitTestLight(point),
      hitTestFog: (point) => this.hitTestFog(point),
      isSelected: (id) => this.selection.has(id),
      selectedStructureId: () => this.selectedStructureId,
      selectedLightId: () => this.selectedLightId,
      selectedFogId: () => this.selectedFogId,
      select: (id, additive) => this.select(id, additive),
      selectStructure: (id) => this.setSelectedStructure(id),
      selectLight: (id) => this.setSelectedLight(id),
      selectFog: (id) => this.setSelectedFog(id),
      selectAll: () => this.selectAll(),
      selectInBounds: (bounds, additive) =>
        this.selectInBounds(bounds, additive),
      clearSelection: () => this.clearSelection(),
      editableSelection: () => this.editableSelection(),
      previewEntities: (entities) => this.previewEntities(entities),
      previewMarquee: (bounds) => this.previewMarquee(bounds),
      previewMeasure: (measure) => this.previewMeasure(measure),
      previewDrawing: (points) => this.previewDrawing(points),
      commitDrawing: (points) => this.commitDrawing(points),
      previewStructure: (structure) => this.previewStructure(structure),
      commitStructure: (structure) => this.commitStructure(structure),
      previewVisibilityTool: (preview) => this.previewVisibilityTool(preview),
      commitVisibilityTool: (preview) => this.commitVisibilityTool(preview),
      visibilityToolRadius: (mode) =>
        mode === "light" ? this.lightToolRadius : this.fogToolRadius,
      visibilityToolShape: (mode) =>
        mode === "light" ? "ellipse" : this.fogToolShape,
      editableLight: (id) => this.editableLight(id),
      previewLight: (light) => this.previewLight(light),
      commitLightTransform: (before, after, label) =>
        this.commitLightTransform(before, after, label),
      editableFog: (id) => this.editableFog(id),
      previewFog: (stroke) => this.previewFog(stroke),
      commitFogTransform: (before, after, label) =>
        this.commitFogTransform(before, after, label),
      editableStructure: (id) => this.editableStructure(id),
      previewStructureTransform: (structure) =>
        this.previewStructureTransform(structure),
      commitStructureTransform: (before, after, label) =>
        this.commitStructureTransform(before, after, label),
      cycleStructureState: (id) => this.cycleStructureState(id),
      commitTransform: (before, after, label) =>
        this.commitTransform(before, after, label),
      snap: (point) => this.snap(point),
      renderView: () => this.render(false),
      undo: () => this.undo(),
      redo: () => this.redo(),
      duplicate: () => this.duplicateSelected(),
      copy: () => this.copySelected(),
      paste: () => this.pasteClipboard(),
      remove: () => this.deleteSelected(),
      nudge: (delta) => this.nudge(delta),
      activateEntity: (id) => this.activateEntity(id),
      focusSelection: () => this.focusSelection(),
      fitToScreen: () => this.fitToScreen(),
      activateTool: (mode) => this.setToolMode(mode),
      onContextMenu: (position, entityId, lightId) =>
        this.options.onContextMenu?.(position, entityId, lightId),
    });
    this.interaction.setMode(this.toolMode);
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame || this.destroyed) return;
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = 0;
        if (!this.destroyed) this.resize();
      });
    });
    this.resizeObserver.observe(host);
    this.loadScene(EMPTY_TABLETOP_SCENE);
    this.fitToScreen();
  }

  get snapshot(): TabletopSnapshot {
    return {
      scene: cloneScene(this.scenes.scene),
      activeLevelId: this.activeLevelId,
      selectedIds: this.selection.ids,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
    };
  }

  get selectedEntities() {
    return this.selection.ids
      .map((id) => this.scenes.getEntity(id))
      .filter((entity): entity is TabletopEntity => Boolean(entity));
  }

  loadScene(scene: TabletopScene) {
    this.scenes.replace(scene);
    this.activeLevelId = activeTabletopLevel(scene, this.activeLevelId).id;
    this.camera.setElevation(
      activeTabletopLevel(scene, this.activeLevelId).baseElevation,
    );
    this.selection.clear();
    this.selectedStructureId = null;
    this.options.onSelectStructure?.(null);
    this.selectedLightId = null;
    this.options.onSelectLight?.(null);
    this.selectedFogId = null;
    this.options.onSelectFog?.(null);
    this.history.clear();
    this.paintBackground();
    this.render();
  }

  setActiveLevel(id: string | null) {
    const next = activeTabletopLevel(this.scenes.scene, id).id;
    if (next === this.activeLevelId) return;
    this.activeLevelId = next;
    this.camera.setElevation(
      activeTabletopLevel(this.scenes.scene, next).baseElevation,
    );
    this.selection.clear();
    this.setSelectedStructure(null);
    this.setSelectedLight(null);
    this.setSelectedFog(null);
    this.render();
  }

  setInteractiveStructures(ids: string[]) {
    this.interactiveStructureIds = new Set(ids);
  }

  addLevel(level: TabletopLevel) {
    if (this.readOnly) return;
    this.scenes.replace({
      ...this.scenes.scene,
      levels: [...(this.scenes.scene.levels ?? []), { ...level }],
    });
    this.activeLevelId = level.id;
    this.camera.setElevation(level.baseElevation);
    this.render();
  }

  updateLevel(
    id: string,
    patch: Partial<TabletopLevel>,
    options: { restackAbove?: boolean } = {},
  ) {
    if (this.readOnly) return;
    this.scenes.replace({
      ...this.scenes.scene,
      levels: updateTabletopLevelStack(
        this.scenes.scene.levels ?? [],
        id,
        patch,
        options.restackAbove,
      ),
    });
    this.camera.setElevation(
      activeTabletopLevel(this.scenes.scene, this.activeLevelId).baseElevation,
    );
    this.render();
  }

  setReadOnly(readOnly: boolean) {
    this.readOnly = readOnly;
    if (readOnly) {
      this.selection.clear();
      this.setSelectedStructure(null);
      this.setSelectedLight(null);
      this.setSelectedFog(null);
      if (
        this.toolMode === "draw" ||
        this.toolMode === "structure" ||
        this.toolMode === "light" ||
        this.toolMode === "fog_reveal" ||
        this.toolMode === "fog_hide"
      )
        this.setToolMode("select");
    }
    this.render();
  }

  setToolMode(mode: TabletopToolMode) {
    const nextMode =
      this.readOnly &&
      (mode === "draw" ||
        mode === "structure" ||
        mode === "light" ||
        mode === "fog_reveal" ||
        mode === "fog_hide")
        ? "select"
        : mode;
    this.toolMode = nextMode;
    this.interaction?.setMode(nextMode);
    this.options.onToolModeChange?.(nextMode);
    this.render(false);
  }

  setDrawingStyle(patch: Partial<TabletopDrawingStyle>) {
    this.drawingStyle = {
      color: Number.isFinite(patch.color)
        ? Math.max(0, Math.min(0xffffff, Number(patch.color)))
        : this.drawingStyle.color,
      width: Number.isFinite(patch.width)
        ? Math.max(1, Math.min(48, Number(patch.width)))
        : this.drawingStyle.width,
      opacity: Number.isFinite(patch.opacity)
        ? Math.max(0.1, Math.min(1, Number(patch.opacity)))
        : this.drawingStyle.opacity,
    };
  }

  setStructureType(type: TabletopStructureType) {
    this.structureType = type;
  }

  setVisibilityToolRadius(kind: "light" | "fog", radius: number) {
    const normalized = Math.max(
      8,
      Math.min(kind === "light" ? 100_000 : 1_024, Number(radius) || 8),
    );
    if (kind === "light") this.lightToolRadius = normalized;
    else this.fogToolRadius = normalized;
  }

  setFogToolShape(shape: TabletopFogShape) {
    this.fogToolShape = shape;
    this.render(false);
  }

  setProjectionMode(mode: TabletopProjectionMode) {
    if (mode === this.projectionMode) return;
    this.projectionMode = mode;
    this.camera.setProjection(mode);
    this.camera.setElevation(
      activeTabletopLevel(this.scenes.scene, this.activeLevelId).baseElevation,
    );
    this.applyWorldProjection();
    this.toolOverlay.clearMeasure();
    this.toolOverlay.clearDrawing();
    this.toolOverlay.clearStructure();
    this.fitToScreen();
  }

  setProjectionOrientation(patch: Partial<TabletopViewOrientation>) {
    const screenCenter = {
      x: this.app.renderer.width / 2,
      y: this.app.renderer.height / 2,
    };
    const worldCenter = this.camera.screenToWorld(screenCenter);
    this.viewOrientation = normalizeTabletopViewOrientation({
      ...this.viewOrientation,
      ...patch,
    });
    this.camera.setOrientation(this.viewOrientation);
    this.applyWorldProjection();
    this.camera.placeWorldAtScreen(worldCenter, screenCenter);
    this.render(false);
  }

  getProjectionOrientation() {
    return { ...this.viewOrientation };
  }

  viewState(levelId: string | null = this.activeLevelId): TabletopViewState {
    const center = this.camera.screenToWorld({
      x: this.app.renderer.width / 2,
      y: this.app.renderer.height / 2,
    });
    return normalizeTabletopViewState({
      ...center,
      zoom: this.camera.zoom,
      projection: this.projectionMode,
      levelId,
      ...this.viewOrientation,
    });
  }

  applyViewState(state: TabletopViewState) {
    const next = normalizeTabletopViewState(state);
    this.suppressViewChange = true;
    try {
      if (next.levelId) this.setActiveLevel(next.levelId);
      this.setProjectionOrientation(next);
      this.setProjectionMode(next.projection);
      this.camera.setView(
        { x: next.x, y: next.y },
        next.zoom,
        this.app.renderer.width,
        this.app.renderer.height,
      );
      this.render(false);
    } finally {
      this.suppressViewChange = false;
      this.emitViewChange();
    }
  }

  setGridVisible(visible: boolean) {
    this.gridVisible = visible;
    this.grid.view.visible = visible;
    this.render(false);
  }

  directorCamera(levelId: string | null = this.activeLevelId) {
    const center = this.camera.screenToWorld({
      x: this.app.renderer.width / 2,
      y: this.app.renderer.height / 2,
    });
    return tabletopDirectorCameraFromView({
      ...center,
      zoom: this.camera.zoom,
      projection: this.projectionMode,
      levelId,
      ...this.viewOrientation,
    });
  }

  applyDirectorCamera(camera: TabletopDirectorCamera) {
    if (camera.levelId) this.setActiveLevel(camera.levelId);
    this.setProjectionOrientation({
      yaw: camera.yaw,
      tilt: camera.tilt,
      elevationScale: camera.elevationScale,
    });
    if (camera.projection !== this.projectionMode)
      this.setProjectionMode(camera.projection);
    if (camera.mode === "fit") this.fitToScreen();
    else {
      this.camera.setView(
        { x: camera.x, y: camera.y },
        camera.zoom,
        this.app.renderer.width,
        this.app.renderer.height,
      );
      this.render(false);
    }
  }

  setVisibility(state: TabletopVisibilityState, showGuides = false) {
    this.visibilityState = {
      ...state,
      walls: state.walls.map((wall) => ({ ...wall })),
      lights: state.lights.map((light) => ({ ...light })),
      fogStrokes: state.fogStrokes.map((stroke) => ({
        ...stroke,
        points: stroke.points.map((point) => ({ ...point })),
      })),
    };
    this.visibilityGuides = showGuides;
    if (
      this.selectedStructureId &&
      !this.visibilityState.walls.some(
        (wall) => wall.id === this.selectedStructureId,
      )
    ) {
      this.selectedStructureId = null;
      this.options.onSelectStructure?.(null);
    }
    if (
      this.selectedLightId &&
      !this.visibilityState.lights.some(
        (light) => light.id === this.selectedLightId,
      )
    ) {
      this.selectedLightId = null;
      this.options.onSelectLight?.(null);
    }
    if (
      this.selectedFogId &&
      !this.visibilityState.fogStrokes.some(
        (stroke) => stroke.id === this.selectedFogId,
      )
    ) {
      this.selectedFogId = null;
      this.options.onSelectFog?.(null);
    }
    this.render(false);
  }

  setSelectedStructure(id: string | null) {
    const next =
      id && this.visibilityState.walls.some((wall) => wall.id === id)
        ? id
        : null;
    const changed = next !== this.selectedStructureId;
    this.selectedStructureId = next;
    if (next) {
      this.selection.clear();
      if (this.selectedLightId) {
        this.selectedLightId = null;
        this.options.onSelectLight?.(null);
      }
      if (this.selectedFogId) {
        this.selectedFogId = null;
        this.options.onSelectFog?.(null);
      }
    }
    if (changed) this.options.onSelectStructure?.(next);
    this.render();
  }

  setSelectedLight(id: string | null) {
    const next =
      id && this.visibilityState.lights.some((light) => light.id === id)
        ? id
        : null;
    const changed = next !== this.selectedLightId;
    this.selectedLightId = next;
    if (next) {
      this.selection.clear();
      if (this.selectedStructureId) {
        this.selectedStructureId = null;
        this.options.onSelectStructure?.(null);
      }
      if (this.selectedFogId) {
        this.selectedFogId = null;
        this.options.onSelectFog?.(null);
      }
    }
    if (changed) this.options.onSelectLight?.(next);
    this.render();
  }

  setSelectedFog(id: string | null) {
    const next =
      id && this.visibilityState.fogStrokes.some((stroke) => stroke.id === id)
        ? id
        : null;
    const changed = next !== this.selectedFogId;
    this.selectedFogId = next;
    if (next) {
      this.selection.clear();
      if (this.selectedStructureId) {
        this.selectedStructureId = null;
        this.options.onSelectStructure?.(null);
      }
      if (this.selectedLightId) {
        this.selectedLightId = null;
        this.options.onSelectLight?.(null);
      }
    }
    if (changed) this.options.onSelectFog?.(next);
    this.render();
  }

  setSelectedStructureState(wallType: TabletopStructureType) {
    if (this.readOnly || !this.selectedStructureId) return;
    const before = this.visibilityState.walls.find(
      (wall) => wall.id === this.selectedStructureId,
    );
    if (!before || before.wallType === wallType) return;
    this.recordStructureMutation(
      before,
      { ...before, wallType, ...structureCollision(wallType) },
      "Alterar estado da estrutura",
    );
  }

  addEntity(type: TabletopEntity["type"] = "token") {
    const count = this.scenes.scene.entities.length + 1;
    const tokenTypes = new Set<TabletopEntity["type"]>([
      "token",
      "character",
      "npc",
      "creature",
    ]);
    this.addEntityAt(
      {
        type,
        label: tokenTypes.has(type) ? `Token ${count}` : `Objeto ${count}`,
      },
      { x: 320 + count * 18, y: 240 + count * 18 },
    );
  }

  addEntityToViewport(seed: TabletopEntitySeed) {
    this.addEntityAt(
      seed,
      this.camera.screenToWorld({
        x: this.app.renderer.width / 2,
        y: this.app.renderer.height / 2,
      }),
    );
  }

  addEntityAt(seed: TabletopEntitySeed, point: Point) {
    if (this.readOnly) return;
    const tokenTypes = new Set<TabletopEntity["type"]>([
      "token",
      "character",
      "npc",
      "creature",
    ]);
    const layerType = tokenTypes.has(seed.type) ? "tokens" : "objects";
    const targetLayer =
      this.scenes.scene.layers.find((layer) => layer.layerType === layerType) ??
      this.scenes.scene.layers.find((layer) => layer.id === layerType);
    if (!targetLayer || targetLayer.locked || !targetLayer.visible) {
      this.options.onAssetError?.(
        `A camada ${layerType === "tokens" ? "Tokens" : "Objetos"} precisa estar visível e desbloqueada.`,
      );
      return;
    }
    const count = this.scenes.scene.entities.length + 1;
    const isToken = tokenTypes.has(seed.type);
    const width = Math.max(8, seed.width ?? (isToken ? 64 : 128));
    const height = Math.max(8, seed.height ?? (isToken ? 64 : 96));
    const origin = this.snap({
      x: point.x - width / 2,
      y: point.y - height / 2,
    });
    const entity = this.clampEntity({
      id: crypto.randomUUID(),
      layerId: targetLayer.id,
      type: seed.type,
      label: seed.label.trim().slice(0, 240) || `Entidade ${count}`,
      x: Math.max(0, Math.min(origin.x, this.scenes.scene.width - width)),
      y: Math.max(0, Math.min(origin.y, this.scenes.scene.height - height)),
      width,
      height,
      rotation: 0,
      zIndex: count,
      hidden: false,
      locked: false,
      color: isToken ? 0x8d3152 : 0x345d6f,
      assetId: seed.assetId ?? null,
      assetUrl: seed.assetUrl,
      linkedSheetId: seed.linkedSheetId ?? null,
      linkedKnowledgeNodeId: seed.linkedKnowledgeNodeId ?? null,
      ownerUserId: seed.ownerUserId ?? null,
      properties: seed.properties ?? {},
      levelId: seed.levelId ?? this.activeLevelId,
      elevation: 0,
    });
    this.executeMutation("Adicionar entidade", (entities) => [
      ...entities,
      entity,
    ]);
    this.selection.replace([entity.id]);
    this.render();
  }

  clientToWorld(point: Point): Point {
    const bounds = this.app.canvas.getBoundingClientRect();
    return this.camera.screenToWorld({
      x: point.x - bounds.left,
      y: point.y - bounds.top,
    });
  }

  applyRemoteEntityPatch(id: string, patch: Partial<TabletopEntity>) {
    if (!this.scenes.scene.entities.some((entity) => entity.id === id)) return;
    this.scenes.setEntities(
      this.scenes.scene.entities.map((entity) =>
        entity.id === id
          ? this.clampEntity({ ...entity, ...patch, id: entity.id })
          : entity,
      ),
    );
    this.render();
  }

  updateSelected(patch: Partial<TabletopEntity>, label = "Editar entidade") {
    if (this.readOnly) return;
    const selected = new Set(this.selection.ids);
    if (selected.size === 0) return;
    this.executeMutation(label, (entities) =>
      entities.map((entity) =>
        selected.has(entity.id) && this.layers.canEdit(entity)
          ? this.clampEntity({ ...entity, ...patch, id: entity.id })
          : entity,
      ),
    );
  }

  updateSelectedProperties(
    patch: Record<string, unknown>,
    label = "Editar propriedades",
  ) {
    if (this.readOnly) return;
    const selected = new Set(this.selection.ids);
    if (selected.size === 0) return;
    this.executeMutation(label, (entities) =>
      entities.map((entity) =>
        selected.has(entity.id) && this.layers.canEdit(entity)
          ? {
              ...entity,
              properties: {
                ...(typeof entity.properties === "object" &&
                entity.properties !== null &&
                !Array.isArray(entity.properties)
                  ? entity.properties
                  : {}),
                ...patch,
              },
            }
          : entity,
      ),
    );
  }

  createStructuresFromSelectedDrawing() {
    if (this.readOnly || this.selection.ids.length !== 1) return 0;
    const drawing = this.selectedEntities[0];
    if (!drawing || drawing.type !== "drawing" || !this.layers.canEdit(drawing)) return 0;
    const properties =
      drawing.properties && typeof drawing.properties === "object" && !Array.isArray(drawing.properties)
        ? (drawing.properties as Record<string, unknown>)
        : {};
    const points = readTabletopDrawingPoints(properties.drawing_points);
    if (points.length < 2) return 0;
    const sourceWidth = Math.max(1, Number(properties.drawing_source_width) || drawing.width);
    const sourceHeight = Math.max(1, Number(properties.drawing_source_height) || drawing.height);
    const center = { x: drawing.x + drawing.width / 2, y: drawing.y + drawing.height / 2 };
    const angle = (drawing.rotation * Math.PI) / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const worldPoints = points.map((point) => {
      const unrotated = {
        x: drawing.x + (point.x / sourceWidth) * drawing.width,
        y: drawing.y + (point.y / sourceHeight) * drawing.height,
      };
      const dx = unrotated.x - center.x;
      const dy = unrotated.y - center.y;
      return this.snap({
        x: center.x + dx * cosine - dy * sine,
        y: center.y + dx * sine + dy * cosine,
      });
    });
    const minimumSegment = Math.max(3, this.scenes.scene.gridSize * 0.08);
    let created = 0;
    let previous = worldPoints[0];
    const stride = Math.max(1, Math.ceil(worldPoints.length / 72));
    for (let index = stride; index < worldPoints.length; index += stride) {
      const current = worldPoints[Math.min(index, worldPoints.length - 1)];
      if (Math.hypot(current.x - previous.x, current.y - previous.y) >= minimumSegment) {
        this.options.onCreateStructure?.({ start: previous, end: current });
        previous = current;
        created += 1;
      }
    }
    const last = worldPoints[worldPoints.length - 1];
    if (
      created < 72 &&
      Math.hypot(last.x - previous.x, last.y - previous.y) >= minimumSegment
    ) {
      this.options.onCreateStructure?.({ start: previous, end: last });
      created += 1;
    }
    return created;
  }

  duplicateSelected() {
    if (this.readOnly) return;
    if (this.selectedFogId) {
      this.options.onDuplicateFog?.(this.selectedFogId);
      return;
    }
    if (this.selectedLightId) {
      this.options.onDuplicateLight?.(this.selectedLightId);
      return;
    }
    if (this.selectedStructureId) {
      this.options.onDuplicateStructure?.(this.selectedStructureId);
      return;
    }
    const source = this.selectedEntities.filter((entity) =>
      this.layers.canEdit(entity),
    );
    if (source.length === 0) return;
    const copies = source.map((entity, index) =>
      this.clampEntity({
        ...entity,
        id: crypto.randomUUID(),
        label: `${entity.label} · cópia`,
        x: entity.x + 24,
        y: entity.y + 24,
        zIndex: entity.zIndex + index + 1,
      }),
    );
    this.executeMutation("Duplicar seleção", (entities) => [
      ...entities,
      ...copies,
    ]);
    this.selection.replace(copies.map((entity) => entity.id));
    this.render();
  }

  copySelected() {
    this.clipboard = this.selectedEntities
      .filter((entity) => this.layers.canEdit(entity))
      .map((entity) => ({ ...entity }));
  }

  pasteClipboard() {
    if (this.readOnly || this.clipboard.length === 0) return;
    const copies = this.clipboard
      .filter((entity) => this.layers.canEdit(entity))
      .map((entity, index) =>
        this.clampEntity({
          ...entity,
          id: crypto.randomUUID(),
          label: `${entity.label} · cópia`,
          x: entity.x + 24,
          y: entity.y + 24,
          zIndex: this.scenes.scene.entities.length + index + 1,
        }),
      );
    if (copies.length === 0) return;
    this.executeMutation("Colar entidades", (entities) => [
      ...entities,
      ...copies,
    ]);
    this.selection.replace(copies.map((entity) => entity.id));
    this.clipboard = copies.map((entity) => ({ ...entity }));
    this.render();
  }

  deleteSelected() {
    if (this.readOnly) return;
    if (this.selectedFogId) {
      const id = this.selectedFogId;
      this.setSelectedFog(null);
      this.options.onDeleteFog?.(id);
      return;
    }
    if (this.selectedLightId) {
      const id = this.selectedLightId;
      this.setSelectedLight(null);
      this.options.onDeleteLight?.(id);
      return;
    }
    if (this.selectedStructureId) {
      const id = this.selectedStructureId;
      this.setSelectedStructure(null);
      this.options.onDeleteStructure?.(id);
      return;
    }
    const removable = new Set(
      this.selectedEntities
        .filter((entity) => this.layers.canEdit(entity))
        .map((entity) => entity.id),
    );
    if (removable.size === 0) return;
    this.executeMutation("Excluir seleção", (entities) =>
      entities.filter((entity) => !removable.has(entity.id)),
    );
    this.selection.clear();
    this.render();
  }

  toggleSelectedLock() {
    if (this.readOnly) return;
    const selected = new Set(this.selection.ids);
    if (selected.size === 0) return;
    const lock = this.selectedEntities.some((entity) => !entity.locked);
    this.executeMutation(
      lock ? "Bloquear seleção" : "Desbloquear seleção",
      (entities) =>
        entities.map((entity) =>
          selected.has(entity.id) ? { ...entity, locked: lock } : entity,
        ),
    );
  }

  selectAll() {
    if (this.readOnly) return;
    if (this.selectedFogId) {
      this.selectedFogId = null;
      this.options.onSelectFog?.(null);
    }
    if (this.selectedLightId) {
      this.selectedLightId = null;
      this.options.onSelectLight?.(null);
    }
    if (this.selectedStructureId) {
      this.selectedStructureId = null;
      this.options.onSelectStructure?.(null);
    }
    const selectable = this.scenes.scene.entities
      .filter(
        (entity) =>
          !entity.hidden &&
          this.layers.get(entity.layerId)?.visible &&
          this.layers.canEdit(entity),
      )
      .map((entity) => entity.id);
    this.selection.replace(selectable);
    this.render();
  }

  selectEntityById(id: string) {
    if (!this.scenes.scene.entities.some((entity) => entity.id === id)) return;
    this.setSelectedLight(null);
    this.setSelectedStructure(null);
    this.setSelectedFog(null);
    this.selection.replace([id]);
    this.render();
  }

  focusSelection() {
    if (this.selectedFogId) {
      const fog = this.visibilityState.fogStrokes.find(
        (stroke) => stroke.id === this.selectedFogId,
      );
      if (!fog) return;
      this.camera.fitBounds(
        tabletopFogBounds(fog),
        this.app.renderer.width,
        this.app.renderer.height,
        96,
        2.25,
      );
      this.render(false);
      return;
    }
    if (this.selectedLightId) {
      const light = this.visibilityState.lights.find(
        (item) => item.id === this.selectedLightId,
      );
      if (!light) return;
      const radius = Math.max(8, light.radius);
      this.camera.fitBounds(
        {
          x: light.x - radius,
          y: light.y - radius,
          width: radius * 2,
          height: radius * 2,
        },
        this.app.renderer.width,
        this.app.renderer.height,
        96,
        2.25,
      );
      this.render(false);
      return;
    }
    if (this.selectedStructureId) {
      const structure = this.visibilityState.walls.find(
        (wall) => wall.id === this.selectedStructureId,
      );
      if (!structure) return;
      const minX = Math.min(structure.x1, structure.x2);
      const minY = Math.min(structure.y1, structure.y2);
      this.camera.fitBounds(
        {
          x: minX,
          y: minY,
          width: Math.max(1, Math.abs(structure.x2 - structure.x1)),
          height: Math.max(1, Math.abs(structure.y2 - structure.y1)),
        },
        this.app.renderer.width,
        this.app.renderer.height,
        120,
        2.25,
      );
      this.render(false);
      return;
    }
    const bounds = boundsFromEntities(this.selectedEntities);
    if (!bounds) return;
    this.camera.fitBounds(
      bounds,
      this.app.renderer.width,
      this.app.renderer.height,
      92,
      2.25,
    );
    this.render(false);
  }

  moveSelectedToLayer(layerId: string) {
    if (this.readOnly) return;
    const target = this.layers.get(layerId);
    if (
      !target ||
      target.locked ||
      !target.visible ||
      target.layerType === "map"
    ) {
      this.options.onAssetError?.(
        "Escolha uma camada visível e desbloqueada para mover a seleção.",
      );
      return;
    }
    const selected = new Set(
      this.editableSelection().map((entity) => entity.id),
    );
    if (selected.size === 0) return;
    this.executeMutation("Mover seleção para camada", (entities) =>
      entities.map((entity) =>
        selected.has(entity.id) ? { ...entity, layerId } : entity,
      ),
    );
  }

  moveSelectedToEdge(edge: TabletopStackEdge) {
    if (this.readOnly) return;
    const selected = new Set(
      this.editableSelection().map((entity) => entity.id),
    );
    if (selected.size === 0) return;
    this.executeMutation(
      edge === "front" ? "Trazer seleção à frente" : "Enviar seleção ao fundo",
      (entities) => moveTabletopEntitiesToEdge(entities, selected, edge),
    );
  }

  alignSelected(alignment: TabletopAlignment) {
    if (this.readOnly) return;
    const selected = new Set(
      this.editableSelection().map((entity) => entity.id),
    );
    if (selected.size < 2) return;
    this.executeMutation("Alinhar seleção", (entities) =>
      alignTabletopEntities(entities, selected, alignment).map((entity) =>
        selected.has(entity.id) ? this.clampEntity(entity) : entity,
      ),
    );
  }

  distributeSelected(axis: TabletopDistribution) {
    if (this.readOnly) return;
    const selected = new Set(
      this.editableSelection().map((entity) => entity.id),
    );
    if (selected.size < 3) return;
    this.executeMutation("Distribuir seleção", (entities) =>
      distributeTabletopEntities(entities, selected, axis).map((entity) =>
        selected.has(entity.id) ? this.clampEntity(entity) : entity,
      ),
    );
  }

  resetSelectedTransform() {
    this.updateSelected({ rotation: 0 }, "Zerar rotação");
  }

  setGrid(mode: TabletopScene["gridMode"], size = this.scenes.scene.gridSize) {
    if (this.readOnly) return;
    this.scenes.replace({
      ...this.scenes.scene,
      gridMode: mode,
      gridSize: Math.max(8, size),
    });
    this.render();
  }

  setSnap(enabled: boolean) {
    if (this.readOnly) return;
    this.scenes.replace({ ...this.scenes.scene, snap: enabled });
    this.render();
  }

  setBackgroundAsset(assetId: string | null, assetUrl?: string) {
    if (this.readOnly) return;
    this.scenes.replace({
      ...this.scenes.scene,
      backgroundAssetId: assetId,
      backgroundAssetUrl: assetUrl,
    });
    this.paintBackground();
    this.render();
  }

  updateLayer(
    layerId: string,
    patch: Partial<Pick<TabletopScene["layers"][number], "visible" | "locked">>,
  ) {
    if (this.readOnly) return;
    this.scenes.replace({
      ...this.scenes.scene,
      layers: this.scenes.scene.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...patch, id: layer.id } : layer,
      ),
    });
    this.render();
  }

  undo() {
    if (this.readOnly) return;
    if (this.history.undo()) {
      this.selection.prune(
        this.scenes.scene.entities.map((entity) => entity.id),
      );
      this.render();
    }
  }

  redo() {
    if (this.readOnly) return;
    if (this.history.redo()) {
      this.selection.prune(
        this.scenes.scene.entities.map((entity) => entity.id),
      );
      this.render();
    }
  }

  center() {
    this.camera.center(
      this.scenes.scene.width,
      this.scenes.scene.height,
      this.app.renderer.width,
      this.app.renderer.height,
    );
    this.render(false);
  }

  zoomBy(factor: number) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.camera.zoomAt(this.camera.zoom * factor, {
      x: this.app.renderer.width / 2,
      y: this.app.renderer.height / 2,
    });
    this.render(false);
  }

  fitToScreen() {
    this.camera.fit(
      this.scenes.scene.width,
      this.scenes.scene.height,
      this.app.renderer.width,
      this.app.renderer.height,
    );
    this.render(false);
  }

  diagnostics() {
    return {
      entities: this.scenes.scene.entities.length,
      selected: this.selection.ids.length,
      textures: this.textures.size,
      clipboard: this.clipboard.length,
      viewport: `${this.app.renderer.width}×${this.app.renderer.height}`,
      zoom: this.camera.zoom,
      tool: this.toolMode,
      projection: this.projectionMode,
      orientation: this.viewOrientation,
    };
  }

  private emitViewChange() {
    if (this.suppressViewChange || !this.options.onViewChange) return;
    const view = this.viewState();
    const fingerprint = JSON.stringify(view);
    if (fingerprint === this.lastViewFingerprint) return;
    this.lastViewFingerprint = fingerprint;
    this.options.onViewChange(view);
  }

  private applyWorldProjection() {
    const matrix = tabletopProjectionMatrix(
      this.projectionMode,
      this.viewOrientation,
    );
    this.world.setFromMatrix(
      new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, 0, 0),
    );
  }

  private select(id: string, additive: boolean) {
    if (this.selectedFogId) {
      this.selectedFogId = null;
      this.options.onSelectFog?.(null);
    }
    if (this.selectedLightId) {
      this.selectedLightId = null;
      this.options.onSelectLight?.(null);
    }
    if (this.selectedStructureId) {
      this.selectedStructureId = null;
      this.options.onSelectStructure?.(null);
    }
    this.selection.select(id, additive);
    this.render();
  }

  private clearSelection() {
    this.selection.clear();
    if (this.selectedFogId) {
      this.selectedFogId = null;
      this.options.onSelectFog?.(null);
    }
    if (this.selectedLightId) {
      this.selectedLightId = null;
      this.options.onSelectLight?.(null);
    }
    if (this.selectedStructureId) {
      this.selectedStructureId = null;
      this.options.onSelectStructure?.(null);
    }
    this.render();
  }

  private selectInBounds(bounds: TabletopBounds, additive: boolean) {
    if (this.selectedFogId) {
      this.selectedFogId = null;
      this.options.onSelectFog?.(null);
    }
    if (this.selectedLightId) {
      this.selectedLightId = null;
      this.options.onSelectLight?.(null);
    }
    if (this.selectedStructureId) {
      this.selectedStructureId = null;
      this.options.onSelectStructure?.(null);
    }
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    const matches = this.scenes.scene.entities
      .filter((entity) => {
        const layer = this.layers.get(entity.layerId);
        return (
          !entity.hidden &&
          Boolean(layer?.visible) &&
          tabletopItemLevelId(entity, fallbackLevelId) === activeLevel.id &&
          entityIntersectsBounds(entity, bounds)
        );
      })
      .map((entity) => entity.id);
    this.selection.replace(
      additive ? [...this.selection.ids, ...matches] : matches,
    );
    this.render();
  }

  private editableSelection() {
    if (this.readOnly) return [];
    return this.selectedEntities.filter((entity) =>
      this.layers.canEdit(entity),
    );
  }

  private hitTest(point: Point) {
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    const activeLevelId = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    ).id;
    const entities = [...this.scenes.scene.entities].reverse();
    return entities.find((entity) => {
      const layer = this.layers.get(entity.layerId);
      return (
        !entity.hidden &&
        layer?.visible &&
        tabletopItemLevelId(entity, fallbackLevelId) === activeLevelId &&
        pointInRotatedRect(point, entity)
      );
    })?.id;
  }

  private hitTestStructure(point: Point) {
    if (!this.visibilityGuides && this.interactiveStructureIds.size === 0)
      return null;
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    const walls = this.visibilityState.walls.filter(
      (wall) =>
        tabletopItemLevelId(wall, fallbackLevelId) === activeLevel.id &&
        (this.visibilityGuides || this.interactiveStructureIds.has(wall.id)),
    );
    return hitTestTabletopStructure(
      point,
      walls,
      12 / Math.max(this.camera.zoom, 0.01),
      this.selectedStructureId,
    );
  }

  private hitTestLight(point: Point) {
    if (!this.visibilityGuides) return null;
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    return hitTestTabletopLight(
      point,
      this.visibilityState.lights.filter(
        (light) =>
          tabletopItemLevelId(light, fallbackLevelId) === activeLevel.id,
      ),
      10 / Math.max(this.camera.zoom, 0.01),
      this.selectedLightId,
    );
  }

  private hitTestFog(point: Point) {
    if (!this.visibilityGuides) return null;
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    return hitTestTabletopFog(
      point,
      this.visibilityState.fogStrokes.filter(
        (stroke) =>
          tabletopItemLevelId(stroke, fallbackLevelId) === activeLevel.id,
      ),
      10 / Math.max(this.camera.zoom, 0.01),
      this.selectedFogId,
    );
  }

  private editableLight(id: string) {
    if (this.readOnly || !this.visibilityGuides) return null;
    const light = this.visibilityState.lights.find((item) => item.id === id);
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    return light &&
      tabletopItemLevelId(light, fallbackLevelId) === activeLevel.id
      ? { ...light }
      : null;
  }

  private editableFog(id: string) {
    if (this.readOnly || !this.visibilityGuides) return null;
    const stroke = this.visibilityState.fogStrokes.find(
      (item) => item.id === id,
    );
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    return stroke &&
      tabletopItemLevelId(stroke, fallbackLevelId) === activeLevel.id
      ? {
          ...stroke,
          points: stroke.points.map((point) => ({ ...point })),
        }
      : null;
  }

  private editableStructure(id: string) {
    if (this.readOnly || !this.visibilityGuides) return null;
    const structure = this.visibilityState.walls.find((wall) => wall.id === id);
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    const fallbackLevelId = activeTabletopLevel(this.scenes.scene).id;
    return structure &&
      tabletopItemLevelId(structure, fallbackLevelId) === activeLevel.id
      ? { ...structure }
      : null;
  }

  private snap(point: Point): Point {
    const scene = this.scenes.scene;
    if (!scene.snap) return point;

    const gridUnit = Math.max(8, scene.gridSize * scene.gridScale);
    const gridPoint =
      scene.gridMode === "none"
        ? { ...point }
        : snapPointToGrid(point, scene.gridMode, gridUnit);
    const threshold = Math.max(
      2.5,
      Math.min(gridUnit * 0.24, 12 / Math.max(this.camera.zoom, 0.12)),
    );
    const fallbackLevelId = activeTabletopLevel(scene).id;
    const activeLevelId = activeTabletopLevel(scene, this.activeLevelId).id;
    const selected = new Set(this.selection.ids);
    const xCandidates: number[] = [];
    const yCandidates: number[] = [];
    const pointCandidates: Point[] = [];

    for (const entity of scene.entities.slice(0, 220)) {
      if (
        selected.has(entity.id) ||
        entity.hidden ||
        tabletopItemLevelId(entity, fallbackLevelId) !== activeLevelId
      )
        continue;
      const xs = [entity.x, entity.x + entity.width / 2, entity.x + entity.width];
      const ys = [entity.y, entity.y + entity.height / 2, entity.y + entity.height];
      xCandidates.push(...xs);
      yCandidates.push(...ys);
      pointCandidates.push(
        { x: xs[0], y: ys[0] },
        { x: xs[2], y: ys[0] },
        { x: xs[2], y: ys[2] },
        { x: xs[0], y: ys[2] },
        { x: xs[1], y: ys[1] },
      );
    }

    for (const wall of this.visibilityState.walls.slice(0, 320)) {
      if (tabletopItemLevelId(wall, fallbackLevelId) !== activeLevelId) continue;
      const midpoint = { x: (wall.x1 + wall.x2) / 2, y: (wall.y1 + wall.y2) / 2 };
      for (const candidate of [
        { x: wall.x1, y: wall.y1 },
        { x: wall.x2, y: wall.y2 },
        midpoint,
      ]) {
        xCandidates.push(candidate.x);
        yCandidates.push(candidate.y);
        pointCandidates.push(candidate);
      }
    }

    for (const light of this.visibilityState.lights.slice(0, 96)) {
      if (tabletopItemLevelId(light, fallbackLevelId) !== activeLevelId) continue;
      xCandidates.push(light.x);
      yCandidates.push(light.y);
      pointCandidates.push({ x: light.x, y: light.y });
    }

    let exact: Point | null = null;
    let exactDistance = threshold;
    for (const candidate of pointCandidates) {
      const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (distance <= exactDistance) {
        exact = candidate;
        exactDistance = distance;
      }
    }
    if (exact) return { ...exact };

    const nearestAxis = (value: number, candidates: number[]) => {
      let nearest: number | null = null;
      let distance = threshold;
      for (const candidate of candidates) {
        const nextDistance = Math.abs(candidate - value);
        if (nextDistance <= distance) {
          nearest = candidate;
          distance = nextDistance;
        }
      }
      return nearest;
    };

    const x = nearestAxis(point.x, xCandidates);
    const y = nearestAxis(point.y, yCandidates);
    return {
      x: x ?? gridPoint.x,
      y: y ?? gridPoint.y,
    };
  }

  private previewEntities(next: TabletopEntity[]) {
    const replacements = new Map(
      next.map((entity) => [entity.id, this.clampEntity(entity)]),
    );
    this.scenes.setEntities(
      this.scenes.scene.entities.map(
        (entity) => replacements.get(entity.id) ?? entity,
      ),
    );
    this.render(false);
  }

  private previewMarquee(bounds: TabletopBounds | null) {
    this.marqueeBounds = bounds;
    this.render(false);
  }

  private previewMeasure(measure: TabletopMeasurementPreview | null) {
    if (!measure) {
      this.toolOverlay.clearMeasure();
      this.render(false);
      return;
    }
    const distance = Math.hypot(
      measure.end.x - measure.start.x,
      measure.end.y - measure.start.y,
    );
    const scene = this.scenes.scene;
    const gridUnit = scene.gridSize * scene.gridScale;
    const label =
      scene.gridMode === "none"
        ? `${Math.round(distance)} px`
        : `${this.formatMeasure(distance / Math.max(1, gridUnit))} cél. · ${Math.round(distance)} px`;
    this.toolOverlay.renderMeasure(
      measure.start,
      measure.end,
      measure.kind === "movement" ? `Movimento · ${label}` : label,
      this.camera.zoom,
    );
    this.render(false);
  }

  private previewDrawing(points: Point[]) {
    if (points.length < 2) this.toolOverlay.clearDrawing();
    else this.toolOverlay.renderDrawing(points, this.drawingStyle);
    this.render(false);
  }

  private previewStructure(structure: TabletopStructurePreview | null) {
    if (!structure) this.toolOverlay.clearStructure();
    else
      this.toolOverlay.renderStructure(
        structure.start,
        structure.end,
        this.structureType,
        this.camera.zoom,
      );
    this.render(false);
  }

  private commitStructure(structure: TabletopStructurePreview) {
    if (this.readOnly) return;
    this.options.onCreateStructure?.(structure);
  }

  private previewVisibilityTool(preview: TabletopVisibilityToolPreview | null) {
    this.visibilityToolPreview = preview
      ? { ...preview, points: preview.points.map((point) => ({ ...point })) }
      : null;
    this.render(false);
  }

  private previewLight(light: TabletopLight) {
    this.visibilityState = {
      ...this.visibilityState,
      lights: this.visibilityState.lights.map((item) =>
        item.id === light.id ? { ...light } : item,
      ),
    };
    this.render(false);
  }

  private commitLightTransform(
    before: TabletopLight,
    after: TabletopLight,
    label: string,
  ) {
    if (this.readOnly) return;
    this.options.onUpdateLight?.(before, after, label);
  }

  private previewFog(stroke: TabletopFogStroke) {
    this.visibilityState = {
      ...this.visibilityState,
      fogStrokes: this.visibilityState.fogStrokes.map((item) =>
        item.id === stroke.id
          ? {
              ...stroke,
              points: stroke.points.map((point) => ({ ...point })),
            }
          : item,
      ),
    };
    this.render(false);
  }

  private commitFogTransform(
    before: TabletopFogStroke,
    after: TabletopFogStroke,
    label: string,
  ) {
    if (this.readOnly) return;
    this.options.onUpdateFog?.(before, after, label);
  }

  private commitVisibilityTool(preview: TabletopVisibilityToolPreview) {
    this.visibilityToolPreview = null;
    if (!this.readOnly) this.options.onCommitVisibilityTool?.(preview);
    this.render(false);
  }

  private previewStructureTransform(structure: TabletopWall) {
    this.visibilityState = {
      ...this.visibilityState,
      walls: this.visibilityState.walls.map((wall) =>
        wall.id === structure.id ? { ...structure } : wall,
      ),
    };
    this.render(false);
  }

  private commitStructureTransform(
    before: TabletopWall,
    after: TabletopWall,
    label: string,
  ) {
    if (this.readOnly) return;
    this.recordStructureMutation(before, after, label);
  }

  private cycleStructureState(id: string) {
    const before = this.visibilityState.walls.find((wall) => wall.id === id);
    if (!before) return;
    if (this.readOnly) {
      if (this.interactiveStructureIds.has(id))
        this.options.onActivateStructure?.({ ...before });
      return;
    }
    const wallType = nextTabletopStructureState(before);
    if (wallType === before.wallType) return;
    const after = { ...before, wallType, ...structureCollision(wallType) };
    this.recordStructureMutation(before, after, "Alterar estado da estrutura");
  }

  private activateEntity(id: string) {
    const entity = this.scenes.scene.entities.find((item) => item.id === id);
    if (!entity || !this.options.onActivateEntity) return false;
    return this.options.onActivateEntity({ ...entity }) === true;
  }

  private recordStructureMutation(
    before: TabletopWall,
    after: TabletopWall,
    label: string,
  ) {
    this.previewStructureTransform(after);
    this.options.onUpdateStructure?.(before, after, label);
    this.history.record({
      label,
      execute: () => {
        this.previewStructureTransform(after);
        this.options.onUpdateStructure?.(before, after, label);
      },
      undo: () => {
        this.previewStructureTransform(before);
        this.options.onUpdateStructure?.(after, before, `Desfazer ${label}`);
      },
    });
    this.render();
  }

  private commitDrawing(points: Point[]) {
    if (this.readOnly || points.length < 2) return;
    const targetLayer =
      this.scenes.scene.layers.find(
        (layer) => layer.layerType === "drawings",
      ) ?? this.scenes.scene.layers.find((layer) => layer.id === "drawings");
    if (!targetLayer || targetLayer.locked || !targetLayer.visible) {
      this.options.onAssetError?.(
        "A camada Desenhos precisa estar visível e desbloqueada.",
      );
      return;
    }
    const count =
      this.scenes.scene.entities.filter((entity) => entity.type === "drawing")
        .length + 1;
    const entity = createTabletopDrawingEntity({
      id: crypto.randomUUID(),
      label: `Traço ${count}`,
      layerId: targetLayer.id,
      zIndex: this.scenes.scene.entities.length + 1,
      points,
      style: this.drawingStyle,
    });
    if (!entity) return;
    const clamped = this.clampEntity(entity);
    this.executeMutation("Desenhar na cena", (entities) => [
      ...entities,
      clamped,
    ]);
    this.selection.replace([clamped.id]);
    this.render();
  }

  private formatMeasure(value: number) {
    if (!Number.isFinite(value)) return "0";
    if (Math.abs(value - Math.round(value)) < 0.02)
      return String(Math.round(value));
    return value < 10 ? value.toFixed(1) : String(Math.round(value));
  }

  private commitTransform(
    before: TabletopEntity[],
    after: TabletopEntity[],
    label: string,
  ) {
    if (this.readOnly) return;
    const beforeMap = new Map(before.map((entity) => [entity.id, entity]));
    const afterMap = new Map(after.map((entity) => [entity.id, entity]));
    const current = this.scenes.scene.entities;
    const beforeState = current.map(
      (entity) => beforeMap.get(entity.id) ?? entity,
    );
    const afterState = current.map(
      (entity) => afterMap.get(entity.id) ?? entity,
    );
    this.scenes.setEntities(beforeState);
    this.recordStates(label, beforeState, afterState);
  }

  private nudge(delta: Point) {
    if (this.readOnly) return;
    if (this.selectedFogId) {
      const before = this.visibilityState.fogStrokes.find(
        (stroke) => stroke.id === this.selectedFogId,
      );
      if (!before) return;
      const after = {
        ...before,
        points: before.points.map((point) => ({
          x: point.x + delta.x,
          y: point.y + delta.y,
        })),
      };
      this.previewFog(after);
      this.commitFogTransform(before, after, "Mover região de névoa");
      return;
    }
    if (this.selectedLightId) {
      const before = this.visibilityState.lights.find(
        (light) => light.id === this.selectedLightId,
      );
      if (!before) return;
      const after = {
        ...before,
        x: before.x + delta.x,
        y: before.y + delta.y,
      };
      this.previewLight(after);
      this.commitLightTransform(before, after, "Mover luz");
      return;
    }
    if (this.selectedStructureId) {
      const before = this.visibilityState.walls.find(
        (wall) => wall.id === this.selectedStructureId,
      );
      if (!before) return;
      const after = {
        ...before,
        x1: before.x1 + delta.x,
        y1: before.y1 + delta.y,
        x2: before.x2 + delta.x,
        y2: before.y2 + delta.y,
      };
      this.recordStructureMutation(before, after, "Mover estrutura");
      return;
    }
    const selected = new Set(
      this.editableSelection().map((entity) => entity.id),
    );
    if (selected.size === 0) return;
    this.executeMutation("Mover seleção", (entities) =>
      entities.map((entity) =>
        selected.has(entity.id)
          ? this.clampEntity({
              ...entity,
              x: entity.x + delta.x,
              y: entity.y + delta.y,
            })
          : entity,
      ),
    );
  }

  private executeMutation(
    label: string,
    mutation: (entities: TabletopEntity[]) => TabletopEntity[],
  ) {
    const before = this.scenes.scene.entities.map((entity) => ({ ...entity }));
    const after = mutation(before.map((entity) => ({ ...entity })));
    this.recordStates(label, before, after);
  }

  private clampEntity(entity: TabletopEntity) {
    return clampEntityToScene(
      entity,
      this.scenes.scene.width,
      this.scenes.scene.height,
    );
  }

  private recordStates(
    label: string,
    before: TabletopEntity[],
    after: TabletopEntity[],
  ) {
    this.history.execute({
      label,
      execute: () => this.scenes.setEntities(after),
      undo: () => this.scenes.setEntities(before),
    });
    this.render();
  }

  private paintBackground() {
    const scene = this.scenes.scene;
    this.sceneBackgroundShape.clear();
    this.sceneBackgroundShape
      .rect(0, 0, scene.width, scene.height)
      .fill({ color: 0x11151d });
    this.sceneBackgroundShape.stroke({
      color: 0x5f4b36,
      alpha: 0.8,
      width: 2,
    });
    this.syncBackgroundAsset(scene.backgroundAssetUrl);
  }

  private syncBackgroundAsset(url?: string) {
    if (this.backgroundSprite) {
      this.backgroundSprite.width = this.scenes.scene.width;
      this.backgroundSprite.height = this.scenes.scene.height;
    }
    if (this.backgroundAssetUrl === url) return;

    this.backgroundAssetUrl = url;
    if (this.backgroundSprite) {
      this.sceneBackground.removeChild(this.backgroundSprite);
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;
    }
    if (!url) return;

    void this.textures
      .load(url)
      .then((texture) => {
        if (this.destroyed || this.backgroundAssetUrl !== url) return;
        const sprite = new Sprite({ texture, label: "background-asset" });
        sprite.width = this.scenes.scene.width;
        sprite.height = this.scenes.scene.height;
        this.backgroundSprite = sprite;
        this.sceneBackground.addChild(sprite);
        this.render(false);
      })
      .catch(() => {
        if (this.backgroundAssetUrl === url)
          this.options.onAssetError?.(
            "Não foi possível carregar o mapa de fundo desta cena.",
          );
      });
  }

  private resize() {
    if (!this.host || this.destroyed) return;
    const previousWidth = this.app.renderer.width;
    const previousHeight = this.app.renderer.height;
    const worldCenter = this.camera.screenToWorld({
      x: previousWidth / 2,
      y: previousHeight / 2,
    });
    const width = Math.max(320, this.host.clientWidth);
    const height = Math.max(320, this.host.clientHeight);
    this.app.renderer.resize(width, height);
    this.camera.placeWorldAtScreen(worldCenter, {
      x: width / 2,
      y: height / 2,
    });
    this.render(false);
  }

  private render(notify = true) {
    if (this.destroyed || !this.host) return;
    const activeLevel = activeTabletopLevel(
      this.scenes.scene,
      this.activeLevelId,
    );
    this.grid.view.visible = this.gridVisible;
    const floorOffset =
      this.projectionMode === "isometric"
        ? tabletopElevationOffset(
            activeLevel.baseElevation,
            this.viewOrientation,
          )
        : { x: 0, y: 0 };
    this.grid.render(this.scenes.scene);
    this.grid.view.position.set(floorOffset.x, floorOffset.y);
    this.toolOverlay.view.position.set(floorOffset.x, floorOffset.y);
    this.selectionOverlay.view.position.set(floorOffset.x, floorOffset.y);
    this.entities.render(
      this.scenes.scene,
      this.selection.ids,
      this.projectionMode,
      activeLevel.id,
      this.viewOrientation,
    );
    this.visibility.render(
      this.scenes.scene,
      this.visibilityState,
      this.visibilityGuides,
      this.projectionMode,
      activeLevel.id,
      this.viewOrientation,
      this.visibilityToolPreview,
      this.selectedLightId,
      this.selectedFogId,
    );
    this.spatial.render(
      this.scenes.scene,
      this.visibilityState,
      this.projectionMode,
      this.selection.ids,
      this.selectedStructureId,
      activeLevel.id,
      this.viewOrientation,
    );
    this.toolOverlay.renderStructureSelection(
      this.selectedStructureId
        ? (this.visibilityState.walls.find(
            (wall) => wall.id === this.selectedStructureId,
          ) ?? null)
        : null,
      this.camera.zoom,
    );
    this.selectionOverlay.render(
      this.scenes.scene.entities,
      this.selection.ids,
      this.camera.zoom,
      this.marqueeBounds,
      this.editableSelection().length === 1,
    );
    this.app.render();
    this.emitViewChange();
    if (notify) this.options.onChange?.(this.snapshot);
  }

  private async destroyInitializedEngine() {
    if (!this.initialized) return;
    this.initialized = false;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeFrame) {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = 0;
    }
    this.interaction?.destroy();
    this.interaction = null;
    this.entities.destroy();
    this.grid.destroy();
    this.visibility.destroy();
    this.spatial.destroy();
    this.toolOverlay.destroy();
    this.selectionOverlay.destroy();
    this.backgroundSprite?.destroy();
    this.backgroundSprite = null;
    await this.textures.clear();
    this.app.destroy({ removeView: true }, { children: true, context: true });
    this.host = null;
  }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeFrame) {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = 0;
    }
    if (!this.initialized) {
      this.host = null;
      return;
    }
    await this.destroyInitializedEngine();
  }
}
