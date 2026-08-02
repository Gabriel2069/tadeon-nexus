import { Container, Graphics } from "pixi.js";
import type { TabletopScene } from "./types";
import type {
  TabletopFogStroke,
  TabletopVisibilityState,
} from "./tabletop-visibility-service";
import { buildVisibilityPolygon } from "./visibility-geometry";

const DARKNESS_COLOR = 0x05070c;
const FOG_COLOR = 0x09111c;

function colorFromHex(value: string, fallback = 0xf2c66d) {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return fallback;
  return Number.parseInt(normalized, 16);
}

function pointsForGraphics(points: Array<{ x: number; y: number }>) {
  return points.flatMap((point) => [point.x, point.y]);
}

function sampledStrokePoints(stroke: TabletopFogStroke) {
  const minimumDistance = Math.max(4, stroke.radius * 0.22);
  const minimumDistanceSquared = minimumDistance * minimumDistance;
  const result: Array<{ x: number; y: number }> = [];
  for (const point of stroke.points) {
    const previous = result[result.length - 1];
    if (
      !previous ||
      (point.x - previous.x) ** 2 + (point.y - previous.y) ** 2 >=
        minimumDistanceSquared
    ) {
      result.push(point);
    }
  }
  return result;
}

export class TabletopVisibilityRenderer {
  readonly view = new Container({ label: "tabletop-visibility" });
  private readonly lightGlow = new Graphics({ label: "light-glow" });
  private readonly darkness = new Graphics({ label: "dynamic-darkness" });
  private readonly fog = new Graphics({ label: "fog-of-war" });
  private readonly guides = new Graphics({ label: "visibility-guides" });

  constructor() {
    this.view.eventMode = "none";
    this.view.addChild(this.lightGlow, this.darkness, this.fog, this.guides);
  }

  render(
    scene: TabletopScene,
    state: TabletopVisibilityState,
    showGuides = false,
  ) {
    this.lightGlow.clear();
    this.darkness.clear();
    this.fog.clear();
    this.guides.clear();

    const enabledLights = state.lights.filter((light) => light.enabled);
    for (const light of enabledLights) {
      const radius = Math.max(8, light.radius * Math.max(0.12, light.intensity));
      this.lightGlow
        .circle(light.x, light.y, radius)
        .fill({ color: colorFromHex(light.color), alpha: 0.08 + light.intensity * 0.16 });
    }

    const darknessAlpha = Math.max(0, 1 - state.globalIllumination) * 0.94;
    if (darknessAlpha > 0.001) {
      this.darkness
        .rect(0, 0, scene.width, scene.height)
        .fill({ color: DARKNESS_COLOR, alpha: darknessAlpha });
      for (const light of enabledLights) {
        const polygon = light.visibilityPolygon ?? buildVisibilityPolygon(
          {
            ...light,
            radius: light.radius * Math.max(0.12, light.intensity),
          },
          state.walls,
          scene.width,
          scene.height,
        );
        if (polygon.length >= 3)
          this.darkness.poly(pointsForGraphics(polygon)).cut();
      }
    }

    if (state.fogEnabled) {
      this.fog
        .rect(0, 0, scene.width, scene.height)
        .fill({ color: FOG_COLOR, alpha: state.fogOpacity });
      for (const stroke of [...state.fogStrokes].sort(
        (left, right) => left.sequenceIndex - right.sequenceIndex,
      )) {
        for (const point of sampledStrokePoints(stroke)) {
          const path = this.fog.circle(point.x, point.y, stroke.radius);
          if (stroke.operation === "reveal") path.cut();
          else path.fill({ color: FOG_COLOR, alpha: state.fogOpacity });
        }
      }
    }

    if (!showGuides) return;
    for (const wall of state.walls) {
      const open = wall.wallType === "door_open";
      const door = wall.wallType !== "wall";
      this.guides
        .moveTo(wall.x1, wall.y1)
        .lineTo(wall.x2, wall.y2)
        .stroke({
          color: open ? 0x63d9a0 : door ? 0xe6b663 : 0x9fd5ee,
          alpha: open ? 0.62 : 0.92,
          width: door ? 5 : 3,
        });
    }
    for (const light of state.lights) {
      this.guides
        .circle(light.x, light.y, Math.max(8, light.radius))
        .stroke({
          color: colorFromHex(light.color),
          alpha: light.enabled ? 0.58 : 0.2,
          width: 2,
        })
        .circle(light.x, light.y, 7)
        .fill({ color: colorFromHex(light.color), alpha: light.enabled ? 0.95 : 0.35 });
    }
  }

  destroy() {
    this.view.removeFromParent();
    this.view.destroy({ children: true });
  }
}
