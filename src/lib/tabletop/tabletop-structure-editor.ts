import {
  isRoofStructure,
  structureFamily,
  structureStateOptions,
} from "./tabletop-spatial";
import type { TabletopWall } from "./tabletop-visibility-service";
import type { Point, TabletopEntity } from "./types";

export type TabletopStructureHandle = "start" | "end" | "body";

export interface TabletopStructureHit {
  id: string;
  handle: TabletopStructureHandle;
}

interface StructureTransformOptions {
  axisLock: boolean;
  bypassSnap: boolean;
  snap: (point: Point) => Point;
}

function squaredDistance(left: Point, right: Point) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON)
    return Math.sqrt(squaredDistance(point, start));
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
    ),
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function pointInsideRoof(point: Point, wall: TabletopWall, tolerance: number) {
  return (
    point.x >= Math.min(wall.x1, wall.x2) - tolerance &&
    point.x <= Math.max(wall.x1, wall.x2) + tolerance &&
    point.y >= Math.min(wall.y1, wall.y2) - tolerance &&
    point.y <= Math.max(wall.y1, wall.y2) + tolerance
  );
}

function pointNearRoofBoundary(
  point: Point,
  wall: TabletopWall,
  tolerance: number,
) {
  const minX = Math.min(wall.x1, wall.x2);
  const maxX = Math.max(wall.x1, wall.x2);
  const minY = Math.min(wall.y1, wall.y2);
  const maxY = Math.max(wall.y1, wall.y2);
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  if (squaredDistance(point, center) <= (tolerance * 1.2) ** 2) return true;
  const edges: Array<[Point, Point]> = [
    [{ x: minX, y: minY }, { x: maxX, y: minY }],
    [{ x: maxX, y: minY }, { x: maxX, y: maxY }],
    [{ x: maxX, y: maxY }, { x: minX, y: maxY }],
    [{ x: minX, y: maxY }, { x: minX, y: minY }],
  ];
  return edges.some(
    ([start, end]) => distanceToSegment(point, start, end) <= tolerance,
  );
}

export function hitTestTabletopStructure(
  point: Point,
  walls: TabletopWall[],
  tolerance: number,
  selectedId: string | null,
): TabletopStructureHit | null {
  const safeTolerance = Math.max(1, tolerance);
  const handleToleranceSquared = (safeTolerance * 1.2) ** 2;
  const selected = selectedId
    ? walls.find((wall) => wall.id === selectedId)
    : undefined;

  if (selected) {
    if (
      squaredDistance(point, { x: selected.x1, y: selected.y1 }) <=
      handleToleranceSquared
    )
      return { id: selected.id, handle: "start" };
    if (
      squaredDistance(point, { x: selected.x2, y: selected.y2 }) <=
      handleToleranceSquared
    )
      return { id: selected.id, handle: "end" };
  }

  const ordered = selected
    ? [selected, ...walls.filter((wall) => wall.id !== selected.id).reverse()]
    : [...walls].reverse();
  for (const wall of ordered) {
    if (wall.wallType === "roof_hidden" && wall.id !== selectedId) continue;
    if (isRoofStructure(wall.wallType)) {
      if (pointNearRoofBoundary(point, wall, safeTolerance))
        return { id: wall.id, handle: "body" };
      continue;
    }
    if (
      distanceToSegment(
        point,
        { x: wall.x1, y: wall.y1 },
        { x: wall.x2, y: wall.y2 },
      ) <= safeTolerance
    )
      return { id: wall.id, handle: "body" };
  }
  return null;
}

function lockDelta(delta: Point): Point {
  return Math.abs(delta.x) >= Math.abs(delta.y)
    ? { x: delta.x, y: 0 }
    : { x: 0, y: delta.y };
}

function lockEndpoint(point: Point, fixed: Point): Point {
  const delta = { x: point.x - fixed.x, y: point.y - fixed.y };
  return Math.abs(delta.x) >= Math.abs(delta.y)
    ? { x: point.x, y: fixed.y }
    : { x: fixed.x, y: point.y };
}

export function transformTabletopStructure(
  structure: TabletopWall,
  handle: TabletopStructureHandle,
  dragStart: Point,
  current: Point,
  options: StructureTransformOptions,
): TabletopWall {
  if (handle === "body") {
    let delta = {
      x: current.x - dragStart.x,
      y: current.y - dragStart.y,
    };
    if (options.axisLock) delta = lockDelta(delta);
    if (!options.bypassSnap) {
      const snapped = options.snap({
        x: structure.x1 + delta.x,
        y: structure.y1 + delta.y,
      });
      delta = { x: snapped.x - structure.x1, y: snapped.y - structure.y1 };
    }
    return {
      ...structure,
      x1: structure.x1 + delta.x,
      y1: structure.y1 + delta.y,
      x2: structure.x2 + delta.x,
      y2: structure.y2 + delta.y,
    };
  }

  const fixed =
    handle === "start"
      ? { x: structure.x2, y: structure.y2 }
      : { x: structure.x1, y: structure.y1 };
  let target = options.axisLock ? lockEndpoint(current, fixed) : current;
  if (!options.bypassSnap) target = options.snap(target);
  return handle === "start"
    ? { ...structure, x1: target.x, y1: target.y }
    : { ...structure, x2: target.x, y2: target.y };
}

export function nextTabletopStructureState(wall: TabletopWall) {
  const family = structureFamily(wall.wallType);
  const options = structureStateOptions(family);
  if (options.length <= 1) return wall.wallType;

  // Secret is an authored property, not a transient door state. Keep it in the
  // explicit editor, but never let the generic quick-cycle create a secret door
  // accidentally. Cycling a secret door deliberately reveals it as closed.
  const cycle = family === "door"
    ? options.filter((option) => option !== "door_secret")
    : options;
  if (wall.wallType === "door_secret") return "door_closed";
  const index = cycle.indexOf(wall.wallType);
  return cycle[(index + 1) % cycle.length];
}

export function entityIsBelowRoof(entity: TabletopEntity, roof: TabletopWall) {
  if (!isRoofStructure(roof.wallType)) return false;
  const center = {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
  return pointInsideRoof(center, roof, 0);
}
