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
export type TabletopFormation = "row" | "column" | "grid" | "ring";

export interface TabletopRepeatOptions {
  copies: number;
  stepX: number;
  stepY: number;
  elevationStep: number;
  rotationStep: number;
}

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

/** A whole formation moves inside the scene; individual pieces never pile up at its edge. */
export function formTabletopEntities(
  entities: TabletopEntity[], ids: ReadonlySet<string>, formation: TabletopFormation,
  gap: number, columns: number, sceneWidth: number, sceneHeight: number,
): TabletopEntity[] | null {
  const selected = entities.filter(entity => ids.has(entity.id));
  if (selected.length < 2) return null;
  const spacing = Math.max(0, Math.min(4096, finite(gap, 0)));
  const count = selected.length;
  const cols = formation === "row" ? count : formation === "column" ? 1
    : Math.max(1, Math.min(count, Math.round(finite(columns, Math.ceil(Math.sqrt(count))))));
  const cellW = Math.max(...selected.map(e => e.width)) + spacing;
  const cellH = Math.max(...selected.map(e => e.height)) + spacing;
  const centerX = (Math.min(...selected.map(e => e.x)) + Math.max(...selected.map(e => e.x + e.width))) / 2;
  const centerY = (Math.min(...selected.map(e => e.y)) + Math.max(...selected.map(e => e.y + e.height))) / 2;
  const radius = (Math.max(...selected.map(e => Math.hypot(e.width, e.height))) + spacing) / (2 * Math.sin(Math.PI / count));
  const positioned = selected.map((e, index) => {
    const angle = index * Math.PI * 2 / count - Math.PI / 2;
    const x = formation === "ring" ? centerX + Math.cos(angle) * radius
      : centerX + (index % cols - (cols - 1) / 2) * cellW;
    const y = formation === "ring" ? centerY + Math.sin(angle) * radius
      : centerY + (Math.floor(index / cols) - (Math.ceil(count / cols) - 1) / 2) * cellH;
    return { ...e, x: x - e.width / 2, y: y - e.height / 2 };
  });
  const left = Math.min(...positioned.map(e => e.x)), top = Math.min(...positioned.map(e => e.y));
  const right = Math.max(...positioned.map(e => e.x + e.width)), bottom = Math.max(...positioned.map(e => e.y + e.height));
  if (right - left > sceneWidth || bottom - top > sceneHeight) return null;
  const dx = Math.max(0, -left) - Math.max(0, right - sceneWidth);
  const dy = Math.max(0, -top) - Math.max(0, bottom - sceneHeight);
  const updates = new Map(positioned.map(e => [e.id, { ...e, x: e.x + dx, y: e.y + dy }]));
  return entities.map(e => updates.get(e.id) ?? e);
}

/** Repeat a selection as a unit, retaining authored 3D settings and relative offsets. */
export function repeatTabletopEntities(
  selected: TabletopEntity[], options: TabletopRepeatOptions,
  sceneWidth: number, sceneHeight: number, createId: () => string,
): TabletopEntity[] | null {
  if (!selected.length) return null;
  const copies = Math.max(1, Math.min(24, Math.round(finite(options.copies, 1))));
  if (selected.length * copies > 240) return null;
  const stepX = finite(options.stepX, 0), stepY = finite(options.stepY, 0);
  const elevation = Math.max(-4096, Math.min(4096, finite(options.elevationStep, 0)));
  const rotation = finite(options.rotationStep, 0);
  const result: TabletopEntity[] = [];
  for (let copy = 1; copy <= copies; copy++) {
    for (const entity of selected) {
      const x = entity.x + stepX * copy, y = entity.y + stepY * copy;
      if (x < 0 || y < 0 || x + entity.width > sceneWidth || y + entity.height > sceneHeight) return null;
      result.push({ ...entity, id: createId(), label: `${entity.label} · ${copy + 1}`,
        x, y, rotation: ((entity.rotation + rotation * copy) % 360 + 360) % 360,
        elevation: (entity.elevation ?? 0) + elevation * copy,
        properties: entity.properties == null ? entity.properties : structuredClone(entity.properties),
      });
    }
  }
  return result;
}

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
