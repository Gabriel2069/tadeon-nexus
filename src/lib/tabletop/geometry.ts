import type { Point, TabletopEntity } from "./types";

const MIN_ENTITY_SIZE = 8;

export interface TabletopBounds extends Point {
  width: number;
  height: number;
}

function finiteOr(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

export function clampEntityToScene(
  entity: TabletopEntity,
  sceneWidth: number,
  sceneHeight: number,
): TabletopEntity {
  const safeSceneWidth = Math.max(MIN_ENTITY_SIZE, finiteOr(sceneWidth, 1_920));
  const safeSceneHeight = Math.max(
    MIN_ENTITY_SIZE,
    finiteOr(sceneHeight, 1_080),
  );
  const width = Math.min(
    safeSceneWidth,
    Math.max(MIN_ENTITY_SIZE, finiteOr(entity.width, MIN_ENTITY_SIZE)),
  );
  const height = Math.min(
    safeSceneHeight,
    Math.max(MIN_ENTITY_SIZE, finiteOr(entity.height, MIN_ENTITY_SIZE)),
  );
  const x = Math.max(
    0,
    Math.min(finiteOr(entity.x, 0), safeSceneWidth - width),
  );
  const y = Math.max(
    0,
    Math.min(finiteOr(entity.y, 0), safeSceneHeight - height),
  );
  const rawRotation = finiteOr(entity.rotation, 0);
  const rotation = ((rawRotation % 360) + 360) % 360;

  return { ...entity, x, y, width, height, rotation };
}

export function pointInRotatedRect(point: Point, entity: TabletopEntity) {
  const centerX = entity.x + entity.width / 2;
  const centerY = entity.y + entity.height / 2;
  const radians = (-entity.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - centerX;
  const deltaY = point.y - centerY;
  const localX = deltaX * cosine - deltaY * sine + entity.width / 2;
  const localY = deltaX * sine + deltaY * cosine + entity.height / 2;

  return (
    localX >= 0 &&
    localX <= entity.width &&
    localY >= 0 &&
    localY <= entity.height
  );
}

export function rotatePointAround(
  point: Point,
  center: Point,
  degrees: number,
): Point {
  const radians = (degrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;
  return {
    x: center.x + deltaX * cosine - deltaY * sine,
    y: center.y + deltaX * sine + deltaY * cosine,
  };
}

export function entityCorners(entity: TabletopEntity): Point[] {
  const center = {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
  return [
    { x: entity.x, y: entity.y },
    { x: entity.x + entity.width, y: entity.y },
    { x: entity.x + entity.width, y: entity.y + entity.height },
    { x: entity.x, y: entity.y + entity.height },
  ].map((point) => rotatePointAround(point, center, entity.rotation));
}

export function boundsFromPoints(points: Point[]): TabletopBounds | null {
  if (points.length === 0) return null;
  const left = Math.min(...points.map((point) => point.x));
  const right = Math.max(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const bottom = Math.max(...points.map((point) => point.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function boundsFromEntities(
  entities: TabletopEntity[],
): TabletopBounds | null {
  return boundsFromPoints(entities.flatMap(entityCorners));
}

export function normalizeBounds(start: Point, end: Point): TabletopBounds {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function boundsIntersect(first: TabletopBounds, second: TabletopBounds) {
  return !(
    first.x + first.width < second.x ||
    second.x + second.width < first.x ||
    first.y + first.height < second.y ||
    second.y + second.height < first.y
  );
}

export function entityIntersectsBounds(
  entity: TabletopEntity,
  bounds: TabletopBounds,
) {
  const entityBounds = boundsFromPoints(entityCorners(entity));
  return entityBounds ? boundsIntersect(entityBounds, bounds) : false;
}
