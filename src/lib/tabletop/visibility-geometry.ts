import { structureChannels } from "./tabletop-spatial";
import type { TabletopLight, TabletopWall } from "./tabletop-visibility-service";

export interface VisibilityPoint { x: number; y: number }

function raySegmentDistance(
  origin: VisibilityPoint,
  direction: VisibilityPoint,
  wall: Pick<TabletopWall, "x1" | "y1" | "x2" | "y2">,
) {
  const segment = { x: wall.x2 - wall.x1, y: wall.y2 - wall.y1 };
  const denominator = direction.x * segment.y - direction.y * segment.x;
  if (Math.abs(denominator) < 1e-9) return null;
  const offset = { x: wall.x1 - origin.x, y: wall.y1 - origin.y };
  const rayDistance = (offset.x * segment.y - offset.y * segment.x) / denominator;
  const segmentPosition = (offset.x * direction.y - offset.y * direction.x) / denominator;
  return rayDistance >= 0 && segmentPosition >= 0 && segmentPosition <= 1
    ? rayDistance
    : null;
}

function normalizedAngleDelta(angle: number, reference: number) {
  let delta = angle - reference;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  return delta;
}

function lightDirection(light: Pick<TabletopLight, "properties">) {
  return ((Number(light.properties?.direction) || 0) * Math.PI) / 180;
}

function lightRayLimit(
  light: Pick<TabletopLight, "radius" | "properties">,
  angle: number,
) {
  const radius = Math.max(8, light.radius);
  const shape = light.properties?.shape ?? "radial";
  if (shape === "radial") return radius;

  const direction = lightDirection(light);
  const delta = normalizedAngleDelta(angle, direction);
  if (shape === "cone") {
    const aperture = Math.max(1, Math.min(359, Number(light.properties?.angle) || 90));
    return Math.abs(delta) <= (aperture * Math.PI) / 360 + 1e-6 ? radius : 0;
  }

  // Beam/rectangle are star-shaped from the source, so each angular ray can be
  // capped by the nearest forward/side face. This preserves the authored light
  // geometry even after wall clipping instead of falling back to a 360° circle.
  if (Math.cos(delta) < -1e-6 || Math.abs(delta) > Math.PI / 2 + 1e-6) return 0;
  const halfWidth = shape === "line" ? Math.max(6, radius * 0.08) : radius * 0.42;
  const cosine = Math.max(1e-6, Math.cos(delta));
  const sine = Math.abs(Math.sin(delta));
  const forwardLimit = radius / cosine;
  const sideLimit = sine < 1e-6 ? Number.POSITIVE_INFINITY : halfWidth / sine;
  return Math.max(0, Math.min(forwardLimit, sideLimit));
}

function seedAngles(light: Pick<TabletopLight, "radius" | "properties">) {
  const shape = light.properties?.shape ?? "radial";
  const direction = lightDirection(light);
  const angles: number[] = [];
  if (shape === "radial") {
    for (let index = 0; index < 128; index += 1)
      angles.push((index / 128) * Math.PI * 2);
    return angles;
  }
  if (shape === "cone") {
    const aperture = Math.max(1, Math.min(359, Number(light.properties?.angle) || 90));
    const half = (aperture * Math.PI) / 360;
    const steps = Math.max(16, Math.ceil(aperture / 5));
    for (let index = 0; index <= steps; index += 1)
      angles.push(direction - half + (index / steps) * half * 2);
    return angles;
  }
  const steps = 72;
  for (let index = 0; index <= steps; index += 1)
    angles.push(direction - Math.PI / 2 + (index / steps) * Math.PI);
  return angles;
}

function wallRelevantToLight(
  wall: Pick<TabletopWall, "baseElevation" | "height">,
  lightElevation = 0,
) {
  const base = Number(wall.baseElevation) || 0;
  const height = Math.max(0, Number(wall.height) || 64);
  return lightElevation <= base + height + 0.5;
}

export function tabletopWallLightTransmission(wall: TabletopWall) {
  const channels = structureChannels(wall.wallType, wall.properties);
  if (wall.wallType === "door_open" || wall.wallType === "window_open" || wall.wallType === "window_broken") return 1;
  if (!channels.blocksLight) return channels.lightTransmission;
  return Math.min(channels.lightTransmission, 0.06);
}

export function tabletopWallVisionTransmission(wall: TabletopWall) {
  const channels = structureChannels(wall.wallType, wall.properties);
  if (!wall.blocksVision) return channels.visionTransmission;
  return Math.min(channels.visionTransmission, 0.06);
}

export function buildVisibilityPolygon(
  light: Pick<TabletopLight, "x" | "y" | "radius" | "castsShadows" | "properties" | "elevation">,
  walls: TabletopWall[],
  sceneWidth: number,
  sceneHeight: number,
) {
  const lightElevation = Number(light.elevation) || 0;
  const boundary: TabletopWall[] = [
    { id: "top", x1: 0, y1: 0, x2: sceneWidth, y2: 0, wallType: "wall", blocksVision: true, blocksMovement: true, height: 100_000 },
    { id: "right", x1: sceneWidth, y1: 0, x2: sceneWidth, y2: sceneHeight, wallType: "wall", blocksVision: true, blocksMovement: true, height: 100_000 },
    { id: "bottom", x1: sceneWidth, y1: sceneHeight, x2: 0, y2: sceneHeight, wallType: "wall", blocksVision: true, blocksMovement: true, height: 100_000 },
    { id: "left", x1: 0, y1: sceneHeight, x2: 0, y2: 0, wallType: "wall", blocksVision: true, blocksMovement: true, height: 100_000 },
  ];
  const blockers = light.castsShadows
    ? [
        ...walls.filter(
          (wall) =>
            tabletopWallLightTransmission(wall) <= 0.06 &&
            wallRelevantToLight(wall, lightElevation),
        ),
        ...boundary,
      ]
    : boundary;

  const angles = seedAngles(light);
  for (const wall of blockers) {
    for (const point of [{ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 }]) {
      const angle = Math.atan2(point.y - light.y, point.x - light.x);
      if (lightRayLimit(light, angle) <= 0) continue;
      angles.push(angle - 0.0001, angle, angle + 0.0001);
    }
  }

  const shape = light.properties?.shape ?? "radial";
  const direction = lightDirection(light);
  const uniqueAngles = [...new Map(
    angles
      .filter((angle) => lightRayLimit(light, angle) > 0)
      .map((angle) => [Math.round(angle * 1_000_000), angle]),
  ).values()];
  uniqueAngles.sort((left, right) =>
    shape === "radial"
      ? ((left % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) -
        (((right % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2))
      : normalizedAngleDelta(left, direction) - normalizedAngleDelta(right, direction),
  );

  return uniqueAngles.map((angle) => {
    const directionVector = { x: Math.cos(angle), y: Math.sin(angle) };
    let distance = lightRayLimit(light, angle);
    for (const wall of blockers) {
      const hit = raySegmentDistance(
        { x: light.x, y: light.y },
        directionVector,
        wall,
      );
      if (hit !== null && hit < distance) distance = hit;
    }
    return {
      x: light.x + directionVector.x * distance,
      y: light.y + directionVector.y * distance,
    };
  });
}

/**
 * Returns transmissive structures crossed by a ray. Used by renderers and
 * previews to make glass, smoke-like barriers and force fields visibly alter
 * light without treating them as opaque walls.
 */
export function lightTransmissionAlongRay(
  origin: VisibilityPoint,
  target: VisibilityPoint,
  walls: TabletopWall[],
  lightElevation = 0,
) {
  const length = Math.hypot(target.x - origin.x, target.y - origin.y);
  if (length < 1e-6) return 1;
  const direction = {
    x: (target.x - origin.x) / length,
    y: (target.y - origin.y) / length,
  };
  const crossed = walls
    .filter((wall) => wallRelevantToLight(wall, lightElevation))
    .map((wall) => ({
      wall,
      distance: raySegmentDistance(origin, direction, wall),
    }))
    .filter(
      (entry): entry is { wall: TabletopWall; distance: number } =>
        entry.distance !== null && entry.distance < length * 0.985,
    )
    .sort((left, right) => left.distance - right.distance);
  let transmission = 1;
  for (const { wall } of crossed) {
    transmission *= tabletopWallLightTransmission(wall);
    if (transmission <= 0.02) return 0;
  }
  return Math.max(0, Math.min(1, transmission));
}
