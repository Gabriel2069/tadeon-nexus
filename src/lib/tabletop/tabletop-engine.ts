import { Application, Container, Graphics } from "pixi.js";
import { CameraController } from "./camera-controller";
import { CommandHistory } from "./command-history";
import { EntityRenderer } from "./entity-renderer";
import { GridRenderer } from "./grid-renderer";
import { InteractionController } from "./interaction-controller";
import { LayerManager } from "./layer-manager";
import { SceneManager } from "./scene-manager";
import { SelectionManager } from "./selection-manager";
import { TextureManager } from "./texture-manager";
import {
  cloneScene,
  EMPTY_TABLETOP_SCENE,
  type Point,
  type TabletopEntity,
  type TabletopEntitySeed,
  type TabletopScene,
  type TabletopSnapshot,
} from "./types";

export interface TabletopEngineOptions {
  onChange?: (snapshot: TabletopSnapshot) => void;
  onAssetError?: (message: string) => void;
  onContextMenu?: (position: Point, entityId?: string) => void;
}

export class TabletopEngine {
  private readonly app = new Application();
  private readonly viewport = new Container();
  private readonly sceneBackground = new Graphics();
  private readonly scenes = new SceneManager();
  private readonly selection = new SelectionManager();
  private readonly history = new CommandHistory();
  private readonly textures = new TextureManager();
  private readonly grid = new GridRenderer();
  private readonly layers = new LayerManager(() => this.scenes.scene.layers);
  private readonly camera = new CameraController(this.viewport);
  private readonly entities: EntityRenderer;
  private interaction: InteractionController | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private host: HTMLElement | null = null;
  private destroyed = false;
  private readOnly = false;
  private clipboard: TabletopEntity[] = [];

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
    this.app.canvas.className = "block h-full w-full touch-none outline-none";
    this.app.canvas.setAttribute("aria-label", "Canvas da Mesa Nexus");
    host.appendChild(this.app.canvas);

    this.viewport.addChild(
      this.sceneBackground,
      this.grid.view,
      this.entities.view,
    );
    this.app.stage.addChild(this.viewport);
    this.interaction = new InteractionController(this.app.canvas, {
      camera: this.camera,
      hitTest: (point) => this.hitTest(point),
      select: (id, additive) => this.select(id, additive),
      clearSelection: () => this.clearSelection(),
      editableSelection: () => this.editableSelection(),
      previewEntities: (entities) => this.previewEntities(entities),
      commitTransform: (before, after) => this.commitTransform(before, after),
      snap: (point) => this.snap(point),
      render: () => this.render(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      duplicate: () => this.duplicateSelected(),
      copy: () => this.copySelected(),
      paste: () => this.pasteClipboard(),
      remove: () => this.deleteSelected(),
      nudge: (delta) => this.nudge(delta),
      onContextMenu: (position, entityId) =>
        this.options.onContextMenu?.(position, entityId),
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.loadScene(EMPTY_TABLETOP_SCENE);
    this.fitToScreen();
  }

  get snapshot(): TabletopSnapshot {
    return {
      scene: cloneScene(this.scenes.scene),
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
    this.selection.clear();
    this.history.clear();
    this.paintBackground();
    this.render();
  }

  setReadOnly(readOnly: boolean) {
    this.readOnly = readOnly;
    if (readOnly) this.selection.clear();
    this.render();
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
    const entity: TabletopEntity = {
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
      linkedKnowledgeNodeId: seed.linkedKnowledgeNodeId ?? null,
      properties: seed.properties ?? {},
    };
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

  updateSelected(patch: Partial<TabletopEntity>, label = "Editar entidade") {
    if (this.readOnly) return;
    const selected = new Set(this.selection.ids);
    if (selected.size === 0) return;
    this.executeMutation(label, (entities) =>
      entities.map((entity) =>
        selected.has(entity.id) && this.layers.canEdit(entity)
          ? { ...entity, ...patch, id: entity.id }
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

  duplicateSelected() {
    if (this.readOnly) return;
    const source = this.selectedEntities.filter((entity) =>
      this.layers.canEdit(entity),
    );
    if (source.length === 0) return;
    const copies = source.map((entity, index) => ({
      ...entity,
      id: crypto.randomUUID(),
      label: `${entity.label} · cópia`,
      x: entity.x + 24,
      y: entity.y + 24,
      zIndex: entity.zIndex + index + 1,
    }));
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
      .map((entity, index) => ({
        ...entity,
        id: crypto.randomUUID(),
        label: `${entity.label} · cópia`,
        x: entity.x + 24,
        y: entity.y + 24,
        zIndex: this.scenes.scene.entities.length + index + 1,
      }));
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
    };
  }

  private select(id: string, additive: boolean) {
    this.selection.select(id, additive);
    this.render();
  }

  private clearSelection() {
    this.selection.clear();
    this.render();
  }

  private editableSelection() {
    if (this.readOnly) return [];
    return this.selectedEntities.filter((entity) =>
      this.layers.canEdit(entity),
    );
  }

  private hitTest(point: Point) {
    const entities = [...this.scenes.scene.entities].reverse();
    return entities.find((entity) => {
      const layer = this.layers.get(entity.layerId);
      return (
        !entity.hidden &&
        layer?.visible &&
        point.x >= entity.x &&
        point.x <= entity.x + entity.width &&
        point.y >= entity.y &&
        point.y <= entity.y + entity.height
      );
    })?.id;
  }

  private snap(point: Point): Point {
    const scene = this.scenes.scene;
    if (!scene.snap || scene.gridMode === "none") return point;
    const size = scene.gridSize * scene.gridScale;
    return {
      x: Math.round(point.x / size) * size,
      y: Math.round(point.y / size) * size,
    };
  }

  private previewEntities(next: TabletopEntity[]) {
    const replacements = new Map(next.map((entity) => [entity.id, entity]));
    this.scenes.setEntities(
      this.scenes.scene.entities.map(
        (entity) => replacements.get(entity.id) ?? entity,
      ),
    );
    this.render();
  }

  private commitTransform(before: TabletopEntity[], after: TabletopEntity[]) {
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
    this.recordStates("Mover seleção", beforeState, afterState);
  }

  private nudge(delta: Point) {
    if (this.readOnly) return;
    const selected = new Set(
      this.editableSelection().map((entity) => entity.id),
    );
    if (selected.size === 0) return;
    this.executeMutation("Mover seleção", (entities) =>
      entities.map((entity) =>
        selected.has(entity.id)
          ? { ...entity, x: entity.x + delta.x, y: entity.y + delta.y }
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
    this.sceneBackground.clear();
    this.sceneBackground
      .rect(0, 0, scene.width, scene.height)
      .fill({ color: 0x11151d });
    this.sceneBackground.stroke({ color: 0x5f4b36, alpha: 0.8, width: 2 });
  }

  private resize() {
    if (!this.host || this.destroyed) return;
    this.app.renderer.resize(
      Math.max(320, this.host.clientWidth),
      Math.max(320, this.host.clientHeight),
    );
    this.render(false);
  }

  private render(notify = true) {
    if (this.destroyed || !this.host) return;
    this.grid.render(this.scenes.scene);
    this.entities.render(
      this.scenes.scene.entities,
      this.layers.ordered(),
      this.selection.ids,
    );
    this.app.render();
    if (notify) this.options.onChange?.(this.snapshot);
  }

  async destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.interaction?.destroy();
    this.entities.destroy();
    this.grid.destroy();
    await this.textures.clear();
    this.app.destroy({ removeView: true }, { children: true, context: true });
    this.host = null;
  }
}
