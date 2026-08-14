import { estimateTabletopPathCost } from "./tabletop-regions";
import type { Point, TabletopScene } from "./types";

export type TabletopPowerShape = "target" | "burst" | "cone" | "line" | "aura" | "wall";

export interface TabletopPowerSource {
  id: string;
  name: string;
  reach: string;
  effect?: string;
  damage?: string;
}

export interface TabletopPowerTemplate {
  id: string;
  name: string;
  shape: TabletopPowerShape;
  range: number;
  size: number;
  source: TabletopPowerSource;
}

export interface TabletopMovementPlan {
  points: Point[];
  distance: number;
  weightedDistance: number;
  cells: number;
  weightedCells: number;
}

function numericReach(value: string) {
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

export function inferPowerShape(source: TabletopPowerSource): TabletopPowerShape {
  const text = `${source.name} ${source.reach} ${source.effect ?? ""}`.toLowerCase();
  if (/cone|leque|arco/.test(text)) return "cone";
  if (/linha|raio linear|feixe|trajet[oó]ria/.test(text)) return "line";
  if (/parede|muralha|barreira/.test(text)) return "wall";
  if (/aura|emana|ao redor|adjacent|engajado/.test(text)) return "aura";
  if (/explos|área|area|raio|círc|circul|onda|campo/.test(text)) return "burst";
  return "target";
}

export function powerTemplateFromSource(
  source: TabletopPowerSource,
  gridSize: number,
): TabletopPowerTemplate {
  const shape = inferPowerShape(source);
  const parsedReach = numericReach(source.reach);
  const reachCells = parsedReach && parsedReach > 0 ? Math.max(1, Math.min(40, parsedReach)) : shape === "aura" ? 1.5 : 6;
  const range = reachCells * Math.max(8, gridSize);
  const size = shape === "line"
    ? Math.max(gridSize * 0.75, range * 0.12)
    : shape === "wall"
      ? Math.max(gridSize * 2, range * 0.55)
      : shape === "cone"
        ? range
        : shape === "aura"
          ? Math.max(gridSize * 1.5, range)
          : shape === "burst"
            ? Math.max(gridSize * 1.5, range * 0.36)
            : Math.max(gridSize * 0.8, range * 0.12);
  return {
    id: source.id,
    name: source.name,
    shape,
    range,
    size,
    source,
  };
}

export function buildMovementPlan(scene: TabletopScene, points: Point[]): TabletopMovementPlan {
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  const unit = Math.max(1, scene.gridSize * scene.gridScale);
  const weightedDistance = estimateTabletopPathCost(scene, points);
  return {
    points,
    distance,
    weightedDistance,
    cells: distance / unit,
    weightedCells: weightedDistance / unit,
  };
}

export function templatePath(
  template: TabletopPowerTemplate,
  origin: Point,
  target: Point,
) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const rawDistance = Math.hypot(dx, dy);
  const distance = Math.max(0.001, Math.min(template.range, rawDistance));
  const ux = dx / Math.max(0.001, rawDistance);
  const uy = dy / Math.max(0.001, rawDistance);
  const end = { x: origin.x + ux * distance, y: origin.y + uy * distance };
  if (template.shape === "target") {
    return { kind: "circle" as const, center: end, radius: template.size };
  }
  if (template.shape === "burst" || template.shape === "aura") {
    return {
      kind: "circle" as const,
      center: template.shape === "aura" ? origin : end,
      radius: template.size,
    };
  }
  if (template.shape === "line") {
    const nx = -uy;
    const ny = ux;
    const half = template.size / 2;
    return {
      kind: "polygon" as const,
      points: [
        { x: origin.x + nx * half, y: origin.y + ny * half },
        { x: end.x + nx * half, y: end.y + ny * half },
        { x: end.x - nx * half, y: end.y - ny * half },
        { x: origin.x - nx * half, y: origin.y - ny * half },
      ],
    };
  }
  if (template.shape === "wall") {
    const nx = -uy;
    const ny = ux;
    const half = template.size / 2;
    return {
      kind: "segment" as const,
      start: { x: end.x - nx * half, y: end.y - ny * half },
      end: { x: end.x + nx * half, y: end.y + ny * half },
      width: Math.max(4, template.size * 0.06),
    };
  }
  const halfAngle = Math.PI / 6;
  const angle = Math.atan2(uy, ux);
  return {
    kind: "polygon" as const,
    points: [
      origin,
      {
        x: origin.x + Math.cos(angle - halfAngle) * distance,
        y: origin.y + Math.sin(angle - halfAngle) * distance,
      },
      {
        x: origin.x + Math.cos(angle + halfAngle) * distance,
        y: origin.y + Math.sin(angle + halfAngle) * distance,
      },
    ],
  };
}
