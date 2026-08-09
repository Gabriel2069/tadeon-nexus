import type { CameraController } from "./camera-controller";
import type { Point, TabletopEntity } from "./types";

interface InteractionBindings {
  camera: CameraController;
  hitTest(world: Point): string | undefined;
  select(id: string, additive: boolean): void;
  selectAll(): void;
  clearSelection(): void;
  editableSelection(): TabletopEntity[];
  previewEntities(entities: TabletopEntity[]): void;
  commitTransform(before: TabletopEntity[], after: TabletopEntity[]): void;
  snap(point: Point): Point;
  render(): void;
  undo(): void;
  redo(): void;
  duplicate(): void;
  copy(): void;
  paste(): void;
  remove(): void;
  nudge(delta: Point): void;
  onContextMenu(position: Point, entityId?: string): void;
}

export class InteractionController {
  private pointerId: number | null = null;
  private lastScreen: Point | null = null;
  private dragStartWorld: Point | null = null;
  private dragBefore: TabletopEntity[] = [];
  private panning = false;
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
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
    canvas.addEventListener("keydown", this.onKeyDown);
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
        this.pointerId = null;
        this.lastScreen = null;
        this.dragStartWorld = null;
        this.dragBefore = [];
        this.panning = false;
        this.pinching = true;
        const pinch = this.getPinchMetrics();
        this.pinchDistance = pinch?.distance ?? null;
        this.pinchCenter = pinch?.center ?? null;
        this.bindings.render();
        return;
      }
    }
    const world = this.bindings.camera.screenToWorld(screen);
    const hit = this.bindings.hitTest(world);
    this.pointerId = event.pointerId;
    this.lastScreen = screen;
    this.panning = event.button === 1 || !hit;

    if (hit) {
      this.bindings.select(
        hit,
        event.shiftKey || event.metaKey || event.ctrlKey,
      );
      this.dragBefore = this.bindings
        .editableSelection()
        .map((entity) => ({ ...entity }));
      this.dragStartWorld = world;
    } else if (!event.shiftKey) {
      this.bindings.clearSelection();
    }
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (
      event.pointerType === "touch" &&
      this.touchPointers.has(event.pointerId)
    )
      this.touchPointers.set(event.pointerId, this.screenPoint(event));

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
        this.bindings.render();
      }
      return;
    }

    if (this.pointerId !== event.pointerId || !this.lastScreen) return;
    const screen = this.screenPoint(event);
    if (this.panning) {
      this.bindings.camera.panBy({
        x: screen.x - this.lastScreen.x,
        y: screen.y - this.lastScreen.y,
      });
    } else if (this.dragStartWorld && this.dragBefore.length > 0) {
      const world = this.bindings.camera.screenToWorld(screen);
      const delta = {
        x: world.x - this.dragStartWorld.x,
        y: world.y - this.dragStartWorld.y,
      };
      this.bindings.previewEntities(
        this.dragBefore.map((entity) => {
          const next = this.bindings.snap({
            x: entity.x + delta.x,
            y: entity.y + delta.y,
          });
          return { ...entity, ...next };
        }),
      );
    }
    this.lastScreen = screen;
    this.bindings.render();
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
      return;
    }
    if (this.pointerId !== event.pointerId) return;
    if (!this.panning && this.dragBefore.length > 0) {
      const after = this.bindings
        .editableSelection()
        .map((entity) => ({ ...entity }));
      if (JSON.stringify(after) !== JSON.stringify(this.dragBefore)) {
        this.bindings.commitTransform(this.dragBefore, after);
      }
    }
    this.pointerId = null;
    this.lastScreen = null;
    this.dragStartWorld = null;
    this.dragBefore = [];
    this.panning = false;
    if (this.canvas.hasPointerCapture(event.pointerId))
      this.canvas.releasePointerCapture(event.pointerId);
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0015);
    this.bindings.camera.zoomAt(
      this.bindings.camera.zoom * factor,
      this.screenPoint(event),
    );
    this.bindings.render();
  };

  private onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    const screen = this.screenPoint(event);
    const world = this.bindings.camera.screenToWorld(screen);
    const hit = this.bindings.hitTest(world);
    if (hit) this.bindings.select(hit, event.shiftKey);
    this.bindings.onContextMenu({ x: event.clientX, y: event.clientY }, hit);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const modifier = event.metaKey || event.ctrlKey;
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
      this.bindings.clearSelection();
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
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.touchPointers.clear();
  }
}
