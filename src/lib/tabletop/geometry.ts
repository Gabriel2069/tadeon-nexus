import type { Point, TabletopEntity } from "./types";

const MIN_ENTITY_SIZE = 8;

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
