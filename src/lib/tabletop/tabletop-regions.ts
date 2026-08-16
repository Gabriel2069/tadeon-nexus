import type { Point, TabletopEntity, TabletopScene } from "./types";

export type TabletopSurfaceType =
  | "normal"
  | "difficult"
  | "water"
  | "mud"
  | "ice"
  | "foliage"
  | "smoke"
  | "hazard"
  | "custom";

export type TabletopRegionTrigger = "enter" | "exit" | "stay";

export type TabletopRegionAutomationAction =
  | { type: "fog"; enabled: boolean }
  | { type: "illumination"; value: number }
  | {
      type: "door";
      wallId: string;
      wallType: "door_open" | "door_closed" | "door_locked";
    }
  | { type: "director_cue"; cueId: string }
  | { type: "audio"; command: "play" | "stop"; assetId?: string | null }
  | { type: "handout"; nodeId: string }
  | { type: "condition"; conditionId: string; operation: "apply" | "remove" }
  | { type: "level"; levelId: string };

export interface TabletopRegionAutomationRule {
  id: string;
  enabled: boolean;
  trigger: TabletopRegionTrigger;
  once: boolean;
  cooldownMs: number;
  actions: TabletopRegionAutomationAction[];
}

export interface TabletopRegionAutomation {
  enabled: boolean;
  rules: TabletopRegionAutomationRule[];
}

export interface TabletopRegionBehavior {
  enabled: boolean;
  surface: TabletopSurfaceType;
  movementMultiplier: number;
  lightMultiplier: number;
  soundAbsorption: number;
  concealment: number;
  elevationOffset: number;
  tint?: string;
  label?: string;
  notes?: string;
  automation?: TabletopRegionAutomation;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.max(minimum, Math.min(maximum, parsed))
    : fallback;
}

function stringValue(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeAutomationAction(value: unknown): TabletopRegionAutomationAction | null {
  const source = objectValue(value);
  if (source.type === "fog" && typeof source.enabled === "boolean")
    return { type: "fog", enabled: source.enabled };
  if (source.type === "illumination")
    return {
      type: "illumination",
      value: clamp(source.value, 0, 1, 1),
    };
  if (source.type === "door") {
    const wallId = stringValue(source.wallId, 96);
    const wallType =
      source.wallType === "door_open" ||
      source.wallType === "door_locked"
        ? source.wallType
        : "door_closed";
    return wallId ? { type: "door", wallId, wallType } : null;
  }
  if (source.type === "director_cue") {
    const cueId = stringValue(source.cueId, 96);
    return cueId ? { type: "director_cue", cueId } : null;
  }
  if (source.type === "audio") {
    const command = source.command === "stop" ? "stop" : "play";
    const assetId = stringValue(source.assetId, 96) || null;
    return { type: "audio", command, assetId };
  }
  if (source.type === "handout") {
    const nodeId = stringValue(source.nodeId, 96);
    return nodeId ? { type: "handout", nodeId } : null;
  }
  if (source.type === "condition") {
    const conditionId = stringValue(source.conditionId, 96);
    if (!conditionId) return null;
    return {
      type: "condition",
      conditionId,
      operation: source.operation === "remove" ? "remove" : "apply",
    };
  }
  if (source.type === "level") {
    const levelId = stringValue(source.levelId, 96);
    return levelId ? { type: "level", levelId } : null;
  }
  return null;
}

export function normalizeTabletopRegionAutomation(value: unknown): TabletopRegionAutomation {
  const source = objectValue(value);
  const rulesSource = Array.isArray(source.rules) ? source.rules.slice(0, 24) : [];
  const rules = rulesSource.flatMap((value, index) => {
    const rule = objectValue(value);
    const trigger: TabletopRegionTrigger =
      rule.trigger === "exit" || rule.trigger === "stay" ? rule.trigger : "enter";
    const actions = (Array.isArray(rule.actions) ? rule.actions : [])
      .slice(0, 12)
      .map(normalizeAutomationAction)
      .filter((action): action is TabletopRegionAutomationAction => Boolean(action));
    if (!actions.length) return [];
    return [
      {
        id: stringValue(rule.id, 96) || `region-rule-${index + 1}`,
        enabled: rule.enabled !== false,
        trigger,
        once: rule.once === true,
        cooldownMs: Math.round(clamp(rule.cooldownMs, 0, 3_600_000, trigger === "stay" ? 3000 : 0)),
        actions,
      } satisfies TabletopRegionAutomationRule,
    ];
  });
  return { enabled: source.enabled === true, rules };
}

export function tabletopRegionBehavior(entity: TabletopEntity): TabletopRegionBehavior | null {
  if (entity.type !== "area") return null;
  const properties = objectValue(entity.properties);
  const region = objectValue(properties.region);
  const surface: TabletopSurfaceType =
    region.surface === "difficult" ||
    region.surface === "water" ||
    region.surface === "mud" ||
    region.surface === "ice" ||
    region.surface === "foliage" ||
    region.surface === "smoke" ||
    region.surface === "hazard" ||
    region.surface === "custom"
      ? region.surface
      : "normal";
  const defaults: Record<TabletopSurfaceType, Partial<TabletopRegionBehavior>> = {
    normal: { movementMultiplier: 1, lightMultiplier: 1 },
    difficult: { movementMultiplier: 1.5, lightMultiplier: 1 },
    water: {
      movementMultiplier: 1.75,
      lightMultiplier: 0.84,
      soundAbsorption: 0.16,
    },
    mud: {
      movementMultiplier: 1.6,
      lightMultiplier: 0.92,
      soundAbsorption: 0.12,
    },
    ice: {
      movementMultiplier: 1.2,
      lightMultiplier: 1.08,
      soundAbsorption: 0.02,
    },
    foliage: {
      movementMultiplier: 1.4,
      lightMultiplier: 0.7,
      soundAbsorption: 0.32,
      concealment: 0.25,
    },
    smoke: {
      movementMultiplier: 1,
      lightMultiplier: 0.48,
      soundAbsorption: 0.08,
      concealment: 0.55,
    },
    hazard: { movementMultiplier: 1.25, lightMultiplier: 0.9 },
    custom: { movementMultiplier: 1, lightMultiplier: 1 },
  };
  const preset = defaults[surface];
  return {
    enabled: region.enabled !== false,
    surface,
    movementMultiplier: clamp(
      region.movementMultiplier,
      0.1,
      12,
      preset.movementMultiplier ?? 1,
    ),
    lightMultiplier: clamp(
      region.lightMultiplier,
      0,
      3,
      preset.lightMultiplier ?? 1,
    ),
    soundAbsorption: clamp(
      region.soundAbsorption,
      0,
      1,
      preset.soundAbsorption ?? 0,
    ),
    concealment: clamp(
      region.concealment,
      0,
      1,
      preset.concealment ?? 0,
    ),
    elevationOffset: clamp(region.elevationOffset, -100000, 100000, 0),
    tint: typeof region.tint === "string" ? region.tint : undefined,
    label: typeof region.label === "string" ? region.label : undefined,
    notes: typeof region.notes === "string" ? region.notes : undefined,
    automation: normalizeTabletopRegionAutomation(region.automation),
  };
}

export function pointInsideTabletopRegion(point: Point, entity: TabletopEntity) {
  if (entity.type !== "area") return false;
  const center = {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
  const angle = (-entity.rotation * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle) + entity.width / 2;
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle) + entity.height / 2;
  return (
    localX >= 0 &&
    localY >= 0 &&
    localX <= entity.width &&
    localY <= entity.height
  );
}

export function tabletopRegionsAtPoint(scene: TabletopScene, point: Point) {
  return scene.entities
    .map((entity) => ({ entity, behavior: tabletopRegionBehavior(entity) }))
    .filter(
      (
        entry,
      ): entry is { entity: TabletopEntity; behavior: TabletopRegionBehavior } =>
        Boolean(entry.behavior?.enabled) &&
        pointInsideTabletopRegion(point, entry.entity),
    );
}

export function tabletopRegionsForEntity(scene: TabletopScene, entity: TabletopEntity) {
  const center = {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
  return tabletopRegionsAtPoint(scene, center).filter(
    (entry) => !entity.levelId || !entry.entity.levelId || entity.levelId === entry.entity.levelId,
  );
}

export function tabletopMovementMultiplierAtPoint(scene: TabletopScene, point: Point) {
  return tabletopRegionsAtPoint(scene, point).reduce(
    (multiplier, entry) => multiplier * entry.behavior.movementMultiplier,
    1,
  );
}

export function tabletopLightMultiplierAtPoint(scene: TabletopScene, point: Point) {
  return Math.max(
    0,
    tabletopRegionsAtPoint(scene, point).reduce(
      (multiplier, entry) => multiplier * entry.behavior.lightMultiplier,
      1,
    ),
  );
}

export function estimateTabletopPathCost(scene: TabletopScene, points: Point[]) {
  if (points.length < 2) return 0;
  let cost = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const samples = Math.max(
      1,
      Math.ceil(distance / Math.max(8, scene.gridSize * 0.5)),
    );
    for (let sample = 0; sample < samples; sample += 1) {
      const t = (sample + 0.5) / samples;
      const point = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      };
      cost +=
        (distance / samples) * tabletopMovementMultiplierAtPoint(scene, point);
    }
  }
  return cost;
}
