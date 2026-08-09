import type { TabletopEntity } from "./types";

export type TabletopAlignment =
  | "left"
  | "center-x"
  | "right"
  | "top"
  | "center-y"
  | "bottom";

export type TabletopDistribution = "horizontal" | "vertical";
export type TabletopStackEdge = "front" | "back";

function selectedEntities(
  entities: TabletopEntity[],
  selectedIds: ReadonlySet<string>,
) {
  return entities.filter((entity) => selectedIds.has(entity.id));
}

export function alignTabletopEntities(
  entities: TabletopEntity[],
  selectedIds: ReadonlySet<string>,
  alignment: TabletopAlignment,
) {
  const selected = selectedEntities(entities, selectedIds);
  if (selected.length < 2) return entities;

  const left = Math.min(...selected.map((entity) => entity.x));
  const right = Math.max(...selected.map((entity) => entity.x + entity.width));
  const top = Math.min(...selected.map((entity) => entity.y));
  const bottom = Math.max(
    ...selected.map((entity) => entity.y + entity.height),
  );
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return entities.map((entity) => {
    if (!selectedIds.has(entity.id)) return entity;
    if (alignment === "left") return { ...entity, x: left };
    if (alignment === "center-x")
      return { ...entity, x: centerX - entity.width / 2 };
    if (alignment === "right") return { ...entity, x: right - entity.width };
    if (alignment === "top") return { ...entity, y: top };
    if (alignment === "center-y")
      return { ...entity, y: centerY - entity.height / 2 };
    return { ...entity, y: bottom - entity.height };
  });
}

export function distributeTabletopEntities(
  entities: TabletopEntity[],
  selectedIds: ReadonlySet<string>,
  axis: TabletopDistribution,
) {
  const selected = selectedEntities(entities, selectedIds);
  if (selected.length < 3) return entities;

  const horizontal = axis === "horizontal";
  const ordered = [...selected].sort((a, b) => {
    const aCenter = horizontal ? a.x + a.width / 2 : a.y + a.height / 2;
    const bCenter = horizontal ? b.x + b.width / 2 : b.y + b.height / 2;
    return aCenter - bCenter;
  });
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const start = horizontal
    ? first.x + first.width / 2
    : first.y + first.height / 2;
  const end = horizontal ? last.x + last.width / 2 : last.y + last.height / 2;
  const step = (end - start) / (ordered.length - 1);
  const positions = new Map(
    ordered.map((entity, index) => [entity.id, start + step * index]),
  );

  return entities.map((entity) => {
    const position = positions.get(entity.id);
    if (position === undefined) return entity;
    return horizontal
      ? { ...entity, x: position - entity.width / 2 }
      : { ...entity, y: position - entity.height / 2 };
  });
}

export function moveTabletopEntitiesToEdge(
  entities: TabletopEntity[],
  selectedIds: ReadonlySet<string>,
  edge: TabletopStackEdge,
) {
  const selected = selectedEntities(entities, selectedIds).sort(
    (a, b) => a.zIndex - b.zIndex,
  );
  if (selected.length === 0) return entities;

  const boundary =
    edge === "front"
      ? Math.max(0, ...entities.map((entity) => entity.zIndex))
      : Math.min(0, ...entities.map((entity) => entity.zIndex));
  const order = new Map(
    selected.map((entity, index) => [
      entity.id,
      edge === "front"
        ? boundary + index + 1
        : boundary - selected.length + index,
    ]),
  );

  return entities.map((entity) => {
    const zIndex = order.get(entity.id);
    return zIndex === undefined ? entity : { ...entity, zIndex };
  });
}
