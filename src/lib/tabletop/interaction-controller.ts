import type { CameraController } from "./camera-controller";
import { normalizeBounds, type TabletopBounds } from "./geometry";
import {
  selectionHandlePoints,
  type TabletopTransformHandle,
} from "./selection-overlay";
import {
  transformTabletopStructure,
  type TabletopStructureHandle,
  type TabletopStructureHit,
} from "./tabletop-structure-editor";
import type { TabletopWall } from "./tabletop-visibility-service";
import type { Point, TabletopEntity } from "./types";

export type TabletopToolMode =
  | "select"
  | "pan"
  | "measure"
  | "draw"
  | "structure";

export interface TabletopMeasurementPreview {
  start: Point;
  end: Point;
  kind: "ruler" | "movement";
}

export interface TabletopStructurePreview {
  start: Point;
  end: Point;
}

interface InteractionBindings {
  camera: CameraController;
  hitTest(world: Point): string | undefined;
  hitTestStructure(world: Point): TabletopStructureHit | null;
  isSelected(id: string): boolean;
  selectedStructureId(): string | null;
  select(id: string, additive: boolean): void;
  selectStructure(id: string | null): void;
  selectAll(): void;
  selectInBounds(bounds: TabletopBounds, additive: boolean): void;
  clearSelection(): void;
  editableSelection(): TabletopEntity[];
  previewEntities(entities: TabletopEntity[]): void;
  previewMarquee(bounds: TabletopBounds | null): void;
  previewMeasure(measure: TabletopMeasurementPreview | null): void;
  previewDrawing(points: Point[]): void;
  commitDrawing(points: Point[]): void;
  previewStructure(structure: TabletopStructurePreview | null): void;
  commitStructure(structure: TabletopStructurePreview): void;
  editableStructure(id: string): TabletopWall | null;
  previewStructureTransform(structure: TabletopWall): void;
  commitStructureTransform(
    before: TabletopWall,
    after: TabletopWall,
    label: string,
  ): void;
  cycleStructureState(id: string): void;
  commitTransform(
    before: TabletopEntity[],
    after: TabletopEntity[],
    label: string,
  ): void;
  snap(point: Point): Point;
  renderView(): void;
  undo(): void;
  redo(): void;
  duplicate(): void;
  copy(): void;
  paste(): void;
  remove(): void;
  nudge(delta: Point): void;
  activateEntity(id: string): boolean;
  focusSelection(): void;
  fitToScreen(): void;
  activateTool(mode: TabletopToolMode): void;
  onContextMenu(position: Point, entityId?: string): void;
}

type PointerAction =
  | "pan"
  | "move"
  | "marquee"
  | "resize"
  | "rotate"
  | "measure"
  | "draw"
  | "structure"
  | "structure-transform";

const MIN_ENTITY_SIZE = 8;
const HANDLE_HIT_RADIUS = 11;

export class InteractionController {
  private pointerId: number | null = null;
  private pointerAction: PointerAction | null = null;
  private lastScreen: Point | null = null;
  private dragStartWorld: Point | null = null;
  private dragBefore: TabletopEntity[] = [];
  private marqueeStartWorld: Point | null = null;
  private measureStartWorld: Point | null = null;
  private drawPoints: Point[] = [];
  private structureStartWorld: Point | null = null;
  private structureBefore: TabletopWall | null = null;
  private activeStructureHandle: TabletopStructureHandle | null = null;
  private activeHandle: TabletopTransformHandle | null = null;
  private mode: TabletopToolMode = "select";
  private spacePressed = false;
  private readonly touchPointers = new Map<number, Point>();
  private pinching = false;
  private pinchDistance: number | null = null;
  private pinchCenter: Point | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly bindings: InteractionBindings,
  ) {
    canvas.tabIndex = 0;
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("dblclick", this.onDoubleClick);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    canvas.addEventListener("keydown", this.onKeyDown);
    canvas.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("blur", this.onBlur);
    this.updateCursor();
  }

  setMode(mode: TabletopToolMode) {
    this.mode = mode;
    this.bindings.previewMeasure(null);
    this.bindings.previewDrawing([]);
    this.bindings.previewStructure(null);
    this.updateCursor();
  }

  private screenPoint(event: PointerEvent | WheelEvent | MouseEvent): Point {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    const screen = this.screenPoint(event);

    if (event.pointerType === "touch") {
      this.touchPointers.set(event.pointerId, screen);
      this.canvas.setPointerCapture(event.pointerId);
      if (this.touchPointers.size >= 2) {
        if (this.dragBefore.length > 0)
          this.bindings.previewEntities(this.dragBefore);
        if (this.structureBefore)
          this.bindings.previewStructureTransform(this.structureBefore);
        this.bindings.previewMarquee(null);
        this.bindings.previewMeasure(null);
        this.bindings.previewDrawing([]);
        this.bindings.previewStructure(null);
        this.clearPointerState();
        this.pinching = true;
        const pinch = this.getPinchMetrics();
        this.pinchDistance = pinch?.distance ?? null;
        this.pinchCenter = pinch?.center ?? null;
        this.bindings.renderView();
        return;
      }
    }

    const world = this.bindings.camera.screenToWorld(screen);
    const handle =
      event.button === 0 &&
      event.pointerType !== "touch" &&
      this.mode === "select" &&
      !this.spacePressed
        ? this.hitTransformHandle(screen)
        : null;
    const candidateStructureHit =
      event.button === 0 && this.mode === "select" && !this.spacePressed
        ? this.bindings.hitTestStructure(world)
        : null;
    const candidateEntityHit = this.bindings.hitTest(world);
    const structureHit =
      candidateStructureHit &&
      (candidateStructureHit.id === this.bindings.selectedStructureId() ||
        !candidateEntityHit)
        ? candidateStructureHit
        : null;
    const hit = structureHit ? undefined : candidateEntityHit;
    const temporaryPan =
      event.button === 1 ||
      this.spacePressed ||
      this.mode === "pan" ||
      (event.pointerType === "touch" &&
        !hit &&
        !structureHit &&
        this.mode === "select");

    this.pointerId = event.pointerId;
    this.lastScreen = screen;
    this.dragStartWorld = world;

    if (handle) {
      this.pointerAction = handle.handle === "rotate" ? "rotate" : "resize";
      this.activeHandle = handle.handle;
      this.dragBefore = [{ ...handle.entity }];
    } else if (temporaryPan) {
      this.pointerAction = "pan";
    } else if (structureHit) {
      this.bindings.selectStructure(structureHit.id);
      const structure = this.bindings.editableStructure(structureHit.id);
      if (structure) {
        this.pointerAction = "structure-transform";
        this.structureBefore = { ...structure };
        this.activeStructureHandle = structureHit.handle;
      }
    } else if (this.mode === "measure") {
      const start = event.altKey ? world : this.bindings.snap(world);
      this.pointerAction = "measure";
      this.measureStartWorld = start;
      this.bindings.previewMeasure({ start, end: start, kind: "ruler" });
    } else if (this.mode === "draw") {
      this.pointerAction = "draw";
      this.drawPoints = [world];
      this.bindings.previewDrawing(this.drawPoints);
    } else if (this.mode === "structure") {
      const start = event.altKey ? world : this.bindings.snap(world);
      this.pointerAction = "structure";
      this.structureStartWorld = start;
      this.bindings.previewStructure({ start, end: start });
    } else if (hit) {
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      if (additive || !this.bindings.isSelected(hit))
        this.bindings.select(hit, additive);
      this.dragBefore = this.bindings
        .editableSelection()
        .map((entity) => ({ ...entity }));
      this.pointerAction = this.dragBefore.length > 0 ? "move" : null;
    } else {
      if (!event.shiftKey) this.bindings.clearSelection();
      this.pointerAction = "marquee";
      this.marqueeStartWorld = world;
      this.bindings.previewMarquee(normalizeBounds(world, world));
    }

    this.canvas.setPointerCapture(event.pointerId);
    this.updateCursor(screen);
  };

  private onPointerMove = (event: PointerEvent) => {
    const screen = this.screenPoint(event);
    if (
      event.pointerType === "touch" &&
      this.touchPointers.has(event.pointerId)
    )
      this.touchPointers.set(event.pointerId, screen);

    if (this.pinching) {
      const pinch = this.getPinchMetrics();
      if (
        pinch &&
        this.pinchDistance &&
        this.pinchCenter &&
        pinch.distance > 0
      ) {
        this.bindings.camera.panBy({
          x: pinch.center.x - this.pinchCenter.x,
          y: pinch.center.y - this.pinchCenter.y,
        });
        this.bindings.camera.zoomAt(
          this.bindings.camera.zoom * (pinch.distance / this.pinchDistance),
          pinch.center,
        );
        this.pinchDistance = pinch.distance;
        this.pinchCenter = pinch.center;
        this.bindings.renderView();
      }
      return;
    }

    if (
      this.pointerId !== event.pointerId ||
      !this.lastScreen ||
      !this.pointerAction
    ) {
      this.updateCursor(screen);
      return;
    }

    const world = this.bindings.camera.screenToWorld(screen);
    if (this.pointerAction === "pan") {
      this.bindings.camera.panBy({
        x: screen.x - this.lastScreen.x,
        y: screen.y - this.lastScreen.y,
      });
      this.bindings.renderView();
    } else if (
      this.pointerAction === "move" &&
      this.dragStartWorld &&
      this.dragBefore.length > 0
    ) {
      let delta = {
        x: world.x - this.dragStartWorld.x,
        y: world.y - this.dragStartWorld.y,
      };
      if (event.shiftKey) {
        delta =
          Math.abs(delta.x) >= Math.abs(delta.y)
            ? { x: delta.x, y: 0 }
            : { x: 0, y: delta.y };
      }
      const preview = this.dragBefore.map((entity) => {
        const origin = {
          x: entity.x + delta.x,
          y: entity.y + delta.y,
        };
        const next = event.altKey ? origin : this.bindings.snap(origin);
        return { ...entity, ...next };
      });
      this.bindings.previewEntities(preview);
      const before = this.dragBefore[0];
      const after = preview[0];
      if (before && after)
        this.bindings.previewMeasure({
          start: {
            x: before.x + before.width / 2,
            y: before.y + before.height / 2,
          },
          end: {
            x: after.x + after.width / 2,
            y: after.y + after.height / 2,
          },
          kind: "movement",
        });
    } else if (this.pointerAction === "marquee" && this.marqueeStartWorld) {
      this.bindings.previewMarquee(
        normalizeBounds(this.marqueeStartWorld, world),
      );
    } else if (
      this.pointerAction === "resize" &&
      this.activeHandle &&
      this.dragBefore[0]
    ) {
      const target = event.altKey ? world : this.bindings.snap(world);
      this.bindings.previewEntities([
        this.resizeEntity(
          this.dragBefore[0],
          this.activeHandle,
          target,
          event.shiftKey,
        ),
      ]);
    } else if (this.pointerAction === "rotate" && this.dragBefore[0]) {
      this.bindings.previewEntities([
        this.rotateEntity(this.dragBefore[0], world, event.shiftKey),
      ]);
    } else if (this.pointerAction === "measure" && this.measureStartWorld) {
      const end = event.altKey ? world : this.bindings.snap(world);
      this.bindings.previewMeasure({
        start: this.measureStartWorld,
        end,
        kind: "ruler",
      });
    } else if (this.pointerAction === "draw" && this.drawPoints[0]) {
      if (event.shiftKey) {
        this.drawPoints = [this.drawPoints[0], world];
      } else {
        const last = this.drawPoints[this.drawPoints.length - 1];
        const minimumStep = 2 / Math.max(this.bindings.camera.zoom, 0.01);
        if (Math.hypot(world.x - last.x, world.y - last.y) >= minimumStep)
          this.drawPoints.push(world);
      }
      this.bindings.previewDrawing(this.drawPoints);
    } else if (this.pointerAction === "structure" && this.structureStartWorld) {
      let end = event.altKey ? world : this.bindings.snap(world);
      if (event.shiftKey) {
        const delta = {
          x: end.x - this.structureStartWorld.x,
          y: end.y - this.structureStartWorld.y,
        };
        end =
          Math.abs(delta.x) >= Math.abs(delta.y)
            ? { x: end.x, y: this.structureStartWorld.y }
            : { x: this.structureStartWorld.x, y: end.y };
      }
      this.bindings.previewStructure({
        start: this.structureStartWorld,
        end,
      });
    } else if (
      this.pointerAction === "structure-transform" &&
      this.structureBefore &&
      this.activeStructureHandle &&
      this.dragStartWorld
    ) {
      const next = transformTabletopStructure(
        this.structureBefore,
        this.activeStructureHandle,
        this.dragStartWorld,
        world,
        {
          axisLock: event.shiftKey,
          bypassSnap: event.altKey,
          snap: (point) => this.bindings.snap(point),
        },
      );
      this.bindings.previewStructureTransform(next);
      if (this.activeStructureHandle === "body") {
        this.bindings.previewMeasure({
          start: {
            x: (this.structureBefore.x1 + this.structureBefore.x2) / 2,
            y: (this.structureBefore.y1 + this.structureBefore.y2) / 2,
          },
          end: { x: (next.x1 + next.x2) / 2, y: (next.y1 + next.y2) / 2 },
          kind: "movement",
        });
      } else {
        this.bindings.previewMeasure({
          start:
            this.activeStructureHandle === "start"
              ? { x: next.x2, y: next.y2 }
              : { x: next.x1, y: next.y1 },
          end:
            this.activeStructureHandle === "start"
              ? { x: next.x1, y: next.y1 }
              : { x: next.x2, y: next.y2 },
          kind: "ruler",
        });
      }
    }

    this.lastScreen = screen;
    this.updateCursor(screen);
  };

  private onPointerUp = (event: PointerEvent) => {
    if (event.pointerType === "touch")
      this.touchPointers.delete(event.pointerId);
    if (this.pinching) {
      if (this.touchPointers.size < 2) {
        this.pinching = false;
        this.pinchDistance = null;
        this.pinchCenter = null;
      }
      if (this.canvas.hasPointerCapture(event.pointerId))
        this.canvas.releasePointerCapture(event.pointerId);
      this.updateCursor();
      return;
    }
    if (this.pointerId !== event.pointerId) return;

    if (this.pointerAction === "marquee" && this.marqueeStartWorld) {
      const end = this.bindings.camera.screenToWorld(this.screenPoint(event));
      const bounds = normalizeBounds(this.marqueeStartWorld, end);
      if (
        bounds.width * this.bindings.camera.zoom >= 4 ||
        bounds.height * this.bindings.camera.zoom >= 4
      )
        this.bindings.selectInBounds(bounds, event.shiftKey);
      this.bindings.previewMarquee(null);
    } else if (
      (this.pointerAction === "move" ||
        this.pointerAction === "resize" ||
        this.pointerAction === "rotate") &&
      this.dragBefore.length > 0
    ) {
      const after = this.bindings
        .editableSelection()
        .map((entity) => ({ ...entity }));
      if (JSON.stringify(after) !== JSON.stringify(this.dragBefore)) {
        const label =
          this.pointerAction === "resize"
            ? "Redimensionar entidade"
            : this.pointerAction === "rotate"
              ? "Rotacionar entidade"
              : "Mover seleção";
        this.bindings.commitTransform(this.dragBefore, after, label);
      }
      this.bindings.previewMeasure(null);
    } else if (this.pointerAction === "draw") {
      const end = this.bindings.camera.screenToWorld(this.screenPoint(event));
      if (event.shiftKey && this.drawPoints[0])
        this.drawPoints = [this.drawPoints[0], end];
      else if (this.drawPoints.length > 0) this.drawPoints.push(end);
      this.bindings.commitDrawing(this.drawPoints);
      this.bindings.previewDrawing([]);
    } else if (this.pointerAction === "structure" && this.structureStartWorld) {
      const world = this.bindings.camera.screenToWorld(this.screenPoint(event));
      let end = event.altKey ? world : this.bindings.snap(world);
      if (event.shiftKey) {
        const delta = {
          x: end.x - this.structureStartWorld.x,
          y: end.y - this.structureStartWorld.y,
        };
        end =
          Math.abs(delta.x) >= Math.abs(delta.y)
            ? { x: end.x, y: this.structureStartWorld.y }
            : { x: this.structureStartWorld.x, y: end.y };
      }
      this.bindings.commitStructure({
        start: this.structureStartWorld,
        end,
      });
      this.bindings.previewStructure(null);
    } else if (
      this.pointerAction === "structure-transform" &&
      this.structureBefore
    ) {
      const after = this.bindings.editableStructure(this.structureBefore.id);
      if (
        after &&
        JSON.stringify(after) !== JSON.stringify(this.structureBefore)
      ) {
        const label =
          this.activeStructureHandle === "body"
            ? "Mover estrutura"
            : "Editar vértice da estrutura";
        this.bindings.commitStructureTransform(
          this.structureBefore,
          { ...after },
          label,
        );
      }
      this.bindings.previewMeasure(null);
    }

    this.releasePointer(event.pointerId);
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (event.pointerType === "touch")
      this.touchPointers.delete(event.pointerId);
    if (this.dragBefore.length > 0)
      this.bindings.previewEntities(this.dragBefore);
    if (this.structureBefore)
      this.bindings.previewStructureTransform(this.structureBefore);
    this.bindings.previewMarquee(null);
    this.bindings.previewMeasure(null);
    this.bindings.previewDrawing([]);
    this.bindings.previewStructure(null);
    this.releasePointer(event.pointerId);
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
    if (event.ctrlKey || event.metaKey) {
      const factor = Math.exp(-event.deltaY * multiplier * 0.0025);
      this.bindings.camera.zoomAt(
        this.bindings.camera.zoom * factor,
        this.screenPoint(event),
      );
    } else {
      this.bindings.camera.panBy({
        x: -(event.shiftKey ? event.deltaY : event.deltaX) * multiplier,
        y: event.shiftKey ? 0 : -event.deltaY * multiplier,
      });
    }
    this.bindings.renderView();
  };

  private onDoubleClick = (event: MouseEvent) => {
    if (event.button !== 0) return;
    if (
      this.mode === "measure" ||
      this.mode === "draw" ||
      this.mode === "structure"
    )
      return;
    event.preventDefault();
    const screen = this.screenPoint(event);
    const world = this.bindings.camera.screenToWorld(screen);
    const entityHit = this.bindings.hitTest(world);
    const candidateStructureHit = this.bindings.hitTestStructure(world);
    const structureHit =
      candidateStructureHit &&
      (candidateStructureHit.id === this.bindings.selectedStructureId() ||
        !entityHit)
        ? candidateStructureHit
        : null;
    if (structureHit) {
      this.bindings.selectStructure(structureHit.id);
      this.bindings.cycleStructureState(structureHit.id);
      return;
    }
    const hit = entityHit;
    if (hit) {
      if (!this.bindings.isSelected(hit)) this.bindings.select(hit, false);
      if (!this.bindings.activateEntity(hit)) this.bindings.focusSelection();
    } else {
      this.bindings.fitToScreen();
    }
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const screen = this.screenPoint(event);
    const world = this.bindings.camera.screenToWorld(screen);
    const entityHit = this.bindings.hitTest(world);
    const candidateStructureHit = this.bindings.hitTestStructure(world);
    const structureHit =
      candidateStructureHit &&
      (candidateStructureHit.id === this.bindings.selectedStructureId() ||
        !entityHit)
        ? candidateStructureHit
        : null;
    if (structureHit) {
      this.bindings.selectStructure(structureHit.id);
      return;
    }
    const hit = structureHit ? undefined : entityHit;
    if (hit && !this.bindings.isSelected(hit))
      this.bindings.select(hit, event.shiftKey);
    this.bindings.onContextMenu({ x: event.clientX, y: event.clientY }, hit);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (event.code === "Space") {
      event.preventDefault();
      this.spacePressed = true;
      this.updateCursor();
      return;
    }
    if (!modifier) {
      const toolShortcuts: Partial<Record<string, TabletopToolMode>> = {
        v: "select",
        h: "pan",
        r: "measure",
        d: "draw",
        b: "structure",
      };
      const shortcut = toolShortcuts[event.key.toLowerCase()];
      if (shortcut) {
        event.preventDefault();
        this.bindings.activateTool(shortcut);
        return;
      }
    }
    if (modifier && event.key.toLowerCase() === "a") {
      event.preventDefault();
      this.bindings.selectAll();
      return;
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) this.bindings.redo();
      else this.bindings.undo();
      return;
    }
    if (modifier && event.key.toLowerCase() === "y") {
      event.preventDefault();
      this.bindings.redo();
      return;
    }
    if (modifier && event.key.toLowerCase() === "d") {
      event.preventDefault();
      this.bindings.duplicate();
      return;
    }
    if (modifier && event.key.toLowerCase() === "c") {
      event.preventDefault();
      this.bindings.copy();
      return;
    }
    if (modifier && event.key.toLowerCase() === "v") {
      event.preventDefault();
      this.bindings.paste();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.bindings.remove();
      return;
    }
    if (event.key === "Escape") {
      if (this.dragBefore.length > 0)
        this.bindings.previewEntities(this.dragBefore);
      if (this.structureBefore)
        this.bindings.previewStructureTransform(this.structureBefore);
      this.bindings.previewMarquee(null);
      this.bindings.previewMeasure(null);
      this.bindings.previewDrawing([]);
      this.bindings.previewStructure(null);
      this.clearPointerState();
      this.bindings.clearSelection();
      if (
        this.mode === "measure" ||
        this.mode === "draw" ||
        this.mode === "structure"
      )
        this.bindings.activateTool("select");
      this.updateCursor();
      return;
    }
    const step = event.shiftKey ? 10 : 1;
    const arrows: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    if (arrows[event.key]) {
      event.preventDefault();
      this.bindings.nudge(arrows[event.key]);
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    if (event.code !== "Space") return;
    this.spacePressed = false;
    this.updateCursor();
  };

  private onBlur = () => {
    this.spacePressed = false;
    this.updateCursor();
  };

  private hitTransformHandle(screen: Point) {
    const selected = this.bindings.editableSelection();
    if (selected.length !== 1) return null;
    const entity = selected[0];
    let closest: {
      handle: TabletopTransformHandle;
      entity: TabletopEntity;
      distance: number;
    } | null = null;
    for (const item of selectionHandlePoints(
      entity,
      this.bindings.camera.zoom,
    )) {
      const handleScreen = this.bindings.camera.worldToScreen(item.point);
      const distance = Math.hypot(
        screen.x - handleScreen.x,
        screen.y - handleScreen.y,
      );
      if (
        distance <= HANDLE_HIT_RADIUS &&
        (!closest || distance < closest.distance)
      )
        closest = { handle: item.handle, entity, distance };
    }
    return closest;
  }

  private resizeEntity(
    entity: TabletopEntity,
    handle: TabletopTransformHandle,
    world: Point,
    keepAspect: boolean,
  ) {
    const signs: Record<
      Exclude<TabletopTransformHandle, "rotate">,
      { x: number; y: number }
    > = {
      "north-west": { x: -1, y: -1 },
      "north-east": { x: 1, y: -1 },
      "south-east": { x: 1, y: 1 },
      "south-west": { x: -1, y: 1 },
    };
    if (handle === "rotate") return entity;
    const sign = signs[handle];
    const radians = (entity.rotation * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const center = {
      x: entity.x + entity.width / 2,
      y: entity.y + entity.height / 2,
    };
    const oppositeOffset = {
      x: (-sign.x * entity.width) / 2,
      y: (-sign.y * entity.height) / 2,
    };
    const opposite = {
      x: center.x + oppositeOffset.x * cosine - oppositeOffset.y * sine,
      y: center.y + oppositeOffset.x * sine + oppositeOffset.y * cosine,
    };
    const delta = { x: world.x - opposite.x, y: world.y - opposite.y };
    const local = {
      x: delta.x * cosine + delta.y * sine,
      y: -delta.x * sine + delta.y * cosine,
    };
    let width = Math.max(MIN_ENTITY_SIZE, sign.x * local.x);
    let height = Math.max(MIN_ENTITY_SIZE, sign.y * local.y);

    if (keepAspect) {
      const aspect = Math.max(
        0.01,
        entity.width / Math.max(entity.height, MIN_ENTITY_SIZE),
      );
      if (Math.abs(width - entity.width) >= Math.abs(height - entity.height))
        height = width / aspect;
      else width = height * aspect;
    }

    const centerOffset = {
      x: (sign.x * width) / 2,
      y: (sign.y * height) / 2,
    };
    const nextCenter = {
      x: opposite.x + centerOffset.x * cosine - centerOffset.y * sine,
      y: opposite.y + centerOffset.x * sine + centerOffset.y * cosine,
    };
    return {
      ...entity,
      x: nextCenter.x - width / 2,
      y: nextCenter.y - height / 2,
      width,
      height,
    };
  }

  private rotateEntity(
    entity: TabletopEntity,
    world: Point,
    snapAngle: boolean,
  ) {
    const center = {
      x: entity.x + entity.width / 2,
      y: entity.y + entity.height / 2,
    };
    let rotation =
      (Math.atan2(world.y - center.y, world.x - center.x) * 180) / Math.PI + 90;
    if (snapAngle) rotation = Math.round(rotation / 15) * 15;
    return { ...entity, rotation };
  }

  private updateCursor(screen?: Point) {
    if (this.pointerAction === "pan") {
      this.canvas.style.cursor = "grabbing";
      return;
    }
    if (this.mode === "pan" || this.spacePressed) {
      this.canvas.style.cursor = "grab";
      return;
    }
    if (this.mode === "measure") {
      this.canvas.style.cursor = "crosshair";
      return;
    }
    if (this.mode === "draw") {
      this.canvas.style.cursor = "cell";
      return;
    }
    if (this.mode === "structure") {
      this.canvas.style.cursor = "crosshair";
      return;
    }
    if (screen) {
      const handle = this.hitTransformHandle(screen)?.handle;
      if (handle === "rotate") {
        this.canvas.style.cursor = "grab";
        return;
      }
      if (handle === "north-west" || handle === "south-east") {
        this.canvas.style.cursor = "nwse-resize";
        return;
      }
      if (handle === "north-east" || handle === "south-west") {
        this.canvas.style.cursor = "nesw-resize";
        return;
      }
      const world = this.bindings.camera.screenToWorld(screen);
      const entityHit = this.bindings.hitTest(world);
      const candidateStructureHit = this.bindings.hitTestStructure(world);
      const structureHit =
        candidateStructureHit &&
        (candidateStructureHit.id === this.bindings.selectedStructureId() ||
          !entityHit)
          ? candidateStructureHit
          : null;
      if (structureHit) {
        this.canvas.style.cursor =
          structureHit.handle === "body" ? "move" : "crosshair";
        return;
      }
      const hit = entityHit;
      if (hit) {
        this.canvas.style.cursor = "move";
        return;
      }
    }
    this.canvas.style.cursor = "crosshair";
  }

  private releasePointer(pointerId: number) {
    if (this.canvas.hasPointerCapture(pointerId))
      this.canvas.releasePointerCapture(pointerId);
    this.clearPointerState();
    this.updateCursor();
  }

  private clearPointerState() {
    this.pointerId = null;
    this.pointerAction = null;
    this.lastScreen = null;
    this.dragStartWorld = null;
    this.dragBefore = [];
    this.marqueeStartWorld = null;
    this.measureStartWorld = null;
    this.drawPoints = [];
    this.structureStartWorld = null;
    this.structureBefore = null;
    this.activeStructureHandle = null;
    this.activeHandle = null;
  }

  private getPinchMetrics() {
    const [first, second] = [...this.touchPointers.values()];
    if (!first || !second) return null;
    return {
      center: {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      },
      distance: Math.hypot(second.x - first.x, second.y - first.y),
    };
  }

  destroy() {
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("dblclick", this.onDoubleClick);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("blur", this.onBlur);
    this.touchPointers.clear();
  }
}
