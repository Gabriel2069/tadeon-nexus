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
  light: Pick<TabletopLight, "x" | "y" | "radius" | "castsShadows">,
  walls: TabletopWall[],
  sceneWidth: number,
  sceneHeight: number,
) {
  const radius = Math.max(8, light.radius);
  const boundary: TabletopWall[] = [
    { id: "top", x1: 0, y1: 0, x2: sceneWidth, y2: 0, wallType: "wall", blocksVision: true, blocksMovement: true },
    { id: "right", x1: sceneWidth, y1: 0, x2: sceneWidth, y2: sceneHeight, wallType: "wall", blocksVision: true, blocksMovement: true },
    { id: "bottom", x1: sceneWidth, y1: sceneHeight, x2: 0, y2: sceneHeight, wallType: "wall", blocksVision: true, blocksMovement: true },
    { id: "left", x1: 0, y1: sceneHeight, x2: 0, y2: 0, wallType: "wall", blocksVision: true, blocksMovement: true },
  ];
  const blockers = light.castsShadows
    ? [
        ...walls.filter((wall) => tabletopWallLightTransmission(wall) <= 0.06),
        ...boundary,
      ]
    : boundary;
  const angles: number[] = [];
  for (let index = 0; index < 96; index += 1) angles.push((index / 96) * Math.PI * 2);
  for (const wall of blockers) {
    for (const point of [{ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 }]) {
      const angle = Math.atan2(point.y - light.y, point.x - light.x);
      angles.push(angle - 0.0001, angle, angle + 0.0001);
    }
  }
  return angles
    .sort((a, b) => a - b)
    .map((angle) => {
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      let distance = radius;
      for (const wall of blockers) {
        const hit = raySegmentDistance({ x: light.x, y: light.y }, direction, wall);
        if (hit !== null && hit < distance) distance = hit;
      }
      return { x: light.x + direction.x * distance, y: light.y + direction.y * distance };
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
) {
  const length = Math.hypot(target.x - origin.x, target.y - origin.y);
  if (length < 1e-6) return 1;
  const direction = {
    x: (target.x - origin.x) / length,
    y: (target.y - origin.y) / length,
  };
  const crossed = walls
    .map((wall) => ({
      wall,
      distance: raySegmentDistance(origin, direction, wall),
    }))
    .filter(
      (entry): entry is { wall: TabletopWall; distance: number } =>
        entry.distance !== null && entry.distance <= length,
    )
    .sort((left, right) => left.distance - right.distance);
  let transmission = 1;
  for (const { wall } of crossed) {
    transmission *= tabletopWallLightTransmission(wall);
    if (transmission <= 0.02) return 0;
  }
  return Math.max(0, Math.min(1, transmission));
}
