import { Container, Graphics } from "pixi.js";
import type { TabletopProjectionMode } from "./camera-controller";
import type { TabletopVisibilityToolPreview } from "./interaction-controller";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  tabletopElevationOffset,
  type TabletopViewOrientation,
} from "./tabletop-projection";
import {
  activeTabletopLevel,
  filterVisibilityForLevel,
  tabletopEntityWorldElevation,
} from "./tabletop-levels";
import type { TabletopScene } from "./types";
import type {
  TabletopFogStroke,
  TabletopLight,
  TabletopVisibilityState,
} from "./tabletop-visibility-service";
import {
  buildVisibilityPolygon,
  lightTransmissionAlongRay,
  tabletopWallLightTransmission,
} from "./visibility-geometry";
import {
  isRoofStructure,
  structureChannels,
  structureFamily,
  type TabletopStructureType,
} from "./tabletop-spatial";

const DARKNESS_COLOR = 0x05070c;
const FOG_COLOR = 0x09111c;

type RenderPoint = { x: number; y: number };

function colorFromHex(value: string, fallback = 0xf2c66d) {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return fallback;
  return Number.parseInt(normalized, 16);
}

function pointsForGraphics(points: RenderPoint[]) {
  return points.flatMap((point) => [point.x, point.y]);
}

function sampledStrokePoints(stroke: TabletopFogStroke) {
  const minimumDistance = Math.max(4, stroke.radius * 0.22);
  const minimumDistanceSquared = minimumDistance * minimumDistance;
  const result: RenderPoint[] = [];
  for (const point of stroke.points) {
    const previous = result[result.length - 1];
    if (
      !previous ||
      (point.x - previous.x) ** 2 + (point.y - previous.y) ** 2 >= minimumDistanceSquared
    ) {
      result.push(point);
    }
  }
  return result;
}

function fogShapeBounds(stroke: TabletopFogStroke) {
  const first = stroke.points[0] ?? { x: 0, y: 0 };
  const last = stroke.points.at(-1) ?? first;
  return {
    x: Math.min(first.x, last.x),
    y: Math.min(first.y, last.y),
    width: Math.max(1, Math.abs(last.x - first.x)),
    height: Math.max(1, Math.abs(last.y - first.y)),
  };
}

function appendFogShape(graphics: Graphics, stroke: TabletopFogStroke) {
  if (stroke.shape === "rectangle") {
    const bounds = fogShapeBounds(stroke);
    return graphics.rect(bounds.x, bounds.y, bounds.width, bounds.height);
  }
  if (stroke.shape === "ellipse") {
    const bounds = fogShapeBounds(stroke);
    return graphics.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width / 2,
      bounds.height / 2,
    );
  }
  if (stroke.shape === "polygon" && stroke.points.length >= 3)
    return graphics.poly(pointsForGraphics(stroke.points));
  return null;
}

function paintFogStroke(
  graphics: Graphics,
  stroke: TabletopFogStroke,
  color: number,
  alpha: number,
) {
  if (stroke.shape === "brush") {
    for (const point of sampledStrokePoints(stroke)) {
      const path = graphics.circle(point.x, point.y, stroke.radius);
      if (stroke.operation === "reveal") path.cut();
      else path.fill({ color, alpha });
    }
    return;
  }
  const path = appendFogShape(graphics, stroke);
  if (!path) return;
  if (stroke.operation === "reveal") path.cut();
  else path.fill({ color, alpha });
}

/**
 * The first operation defines the baseline for the level. A reveal-first stack
 * starts covered and cuts openings; a hide-first stack starts revealed and adds
 * cover. This keeps mixed Reveal/Hide regions deterministic instead of changing
 * the whole map as soon as the first hide operation is appended.
 */
export function tabletopFogUsesCoveredBase(strokes: TabletopFogStroke[]) {
  return strokes.length === 0 || strokes[0]?.operation === "reveal";
}

function previewFogShape(
  graphics: Graphics,
  stroke: TabletopFogStroke,
  color: number,
  selected: boolean,
) {
  if (stroke.shape === "brush") {
    const points = sampledStrokePoints(stroke);
    if (points.length === 1) {
      graphics
        .circle(points[0].x, points[0].y, stroke.radius)
        .fill({ color, alpha: selected ? 0.18 : 0.035 })
        .stroke({ color, alpha: selected ? 0.98 : 0.22, width: selected ? 3.5 : 1.5 });
    } else if (points.length > 1) {
      graphics.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      graphics.stroke({
        color,
        alpha: selected ? 0.88 : 0.16,
        width: selected ? Math.max(4, stroke.radius * 0.12) : 1.5,
      });
    }
    return;
  }
  const path = appendFogShape(graphics, stroke);
  path?.fill({ color, alpha: selected ? 0.16 : 0.025 }).stroke({
    color,
    alpha: selected ? 0.98 : 0.2,
    width: selected ? 3.5 : 1.5,
  });
}

function lightShapePoints(light: TabletopLight, radius: number) {
  const properties = light.properties ?? {};
  const shape = properties.shape ?? "radial";
  const direction = ((Number(properties.direction) || 0) * Math.PI) / 180;
  const angle = Math.max(1, Math.min(359, Number(properties.angle) || 90));
  if (shape === "cone") {
    const half = (angle * Math.PI) / 360;
    const steps = Math.max(8, Math.ceil(angle / 8));
    const points = [{ x: light.x, y: light.y }];
    for (let index = 0; index <= steps; index += 1) {
      const ray = direction - half + (index / steps) * half * 2;
      points.push({
        x: light.x + Math.cos(ray) * radius,
        y: light.y + Math.sin(ray) * radius,
      });
    }
    return points;
  }
  if (shape === "line") {
    const normal = direction + Math.PI / 2;
    const halfWidth = Math.max(6, radius * 0.08);
    return [
      {
        x: light.x + Math.cos(normal) * halfWidth,
        y: light.y + Math.sin(normal) * halfWidth,
      },
      {
        x: light.x + Math.cos(direction) * radius + Math.cos(normal) * halfWidth,
        y: light.y + Math.sin(direction) * radius + Math.sin(normal) * halfWidth,
      },
      {
        x: light.x + Math.cos(direction) * radius - Math.cos(normal) * halfWidth,
        y: light.y + Math.sin(direction) * radius - Math.sin(normal) * halfWidth,
      },
      {
        x: light.x - Math.cos(normal) * halfWidth,
        y: light.y - Math.sin(normal) * halfWidth,
      },
    ];
  }
  if (shape === "rectangle") {
    const depth = radius;
    const halfWidth = radius * 0.42;
    const cos = Math.cos(direction);
    const sin = Math.sin(direction);
    const nx = -sin;
    const ny = cos;
    return [
      { x: light.x + nx * halfWidth, y: light.y + ny * halfWidth },
      {
        x: light.x + cos * depth + nx * halfWidth,
        y: light.y + sin * depth + ny * halfWidth,
      },
      {
        x: light.x + cos * depth - nx * halfWidth,
        y: light.y + sin * depth - ny * halfWidth,
      },
      { x: light.x - nx * halfWidth, y: light.y - ny * halfWidth },
    ];
  }
  return null;
}

function appendLightShape(graphics: Graphics, light: TabletopLight, radius: number) {
  const points = lightShapePoints(light, radius);
  if (points) return graphics.poly(pointsForGraphics(points));
  return graphics.circle(light.x, light.y, radius);
}

function deterministicSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function resolveAttachedLight(
  scene: TabletopScene,
  activeLevel: ReturnType<typeof activeTabletopLevel>,
  light: TabletopLight,
): TabletopLight {
  if (!light.entityId) return light;
  const entity = scene.entities.find((candidate) => candidate.id === light.entityId);
  if (!entity) return light;
  return {
    ...light,
    enabled: light.enabled && !entity.hidden,
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
    elevation:
      tabletopEntityWorldElevation(entity, activeLevel) -
      activeLevel.baseElevation +
      (Number(light.elevation) || 0),
  };
}

function lightOffset(
  light: Pick<TabletopLight, "elevation">,
  projection: TabletopProjectionMode,
  orientation: TabletopViewOrientation,
) {
  return projection === "isometric"
    ? tabletopElevationOffset(Number(light.elevation) || 0, orientation)
    : { x: 0, y: 0 };
}

function offsetPoint(point: RenderPoint, offset: RenderPoint): RenderPoint {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

function offsetLight(
  light: TabletopLight,
  projection: TabletopProjectionMode,
  orientation: TabletopViewOrientation,
): TabletopLight {
  const offset = lightOffset(light, projection, orientation);
  return { ...light, x: light.x + offset.x, y: light.y + offset.y };
}

function visibilityPolygonForLight(
  light: TabletopLight,
  radius: number,
  walls: TabletopVisibilityState["walls"],
  scene: TabletopScene,
) {
  return buildVisibilityPolygon(
    { ...light, radius },
    walls,
    scene.width,
    scene.height,
  );
}

function paintReactiveGlow(
  graphics: Graphics,
  light: TabletopLight,
  radius: number,
  walls: TabletopVisibilityState["walls"],
  scene: TabletopScene,
  projection: TabletopProjectionMode,
  orientation: TabletopViewOrientation,
  color: number,
  alpha: number,
) {
  const renderLight = offsetLight(light, projection, orientation);
  if (!light.castsShadows) {
    appendLightShape(graphics, renderLight, radius).fill({ color, alpha });
    return;
  }

  const polygon = visibilityPolygonForLight(light, radius, walls, scene);
  if (polygon.length < 2) return;
  const offset = lightOffset(light, projection, orientation);
  const origin = { x: light.x, y: light.y };
  const renderOrigin = offsetPoint(origin, offset);
  const shaped = (light.properties?.shape ?? "radial") !== "radial";
  const pairCount = shaped ? polygon.length - 1 : polygon.length;

  for (let index = 0; index < pairCount; index += 1) {
    const left = polygon[index];
    const right = polygon[(index + 1) % polygon.length];
    if (!left || !right) continue;
    const midpoint = {
      x: origin.x + (((left.x + right.x) / 2) - origin.x) * 0.97,
      y: origin.y + (((left.y + right.y) / 2) - origin.y) * 0.97,
    };
    const transmission = lightTransmissionAlongRay(
      origin,
      midpoint,
      walls,
      Number(light.elevation) || 0,
    );
    if (transmission <= 0.015) continue;
    const renderLeft = offsetPoint(left, offset);
    const renderRight = offsetPoint(right, offset);
    graphics
      .poly(pointsForGraphics([renderOrigin, renderLeft, renderRight]))
      .fill({ color, alpha: alpha * transmission });
  }
}

function darknessCutPolygon(
  light: TabletopLight,
  radius: number,
  walls: TabletopVisibilityState["walls"],
  scene: TabletopScene,
  projection: TabletopProjectionMode,
  orientation: TabletopViewOrientation,
) {
  const polygon = visibilityPolygonForLight(light, radius, walls, scene);
  const offset = lightOffset(light, projection, orientation);
  const rendered = polygon.map((point) => offsetPoint(point, offset));
  if ((light.properties?.shape ?? "radial") !== "radial")
    rendered.unshift(offsetPoint({ x: light.x, y: light.y }, offset));
  return rendered;
}

function lightRadiusHandle(light: TabletopLight, radius: number) {
  const direction = ((Number(light.properties?.direction) || 0) * Math.PI) / 180;
  return {
    x: light.x + Math.cos(direction) * radius,
    y: light.y + Math.sin(direction) * radius,
  };
}

export class TabletopVisibilityRenderer {
  readonly view = new Container({ label: "tabletop-visibility" });
  private readonly lightGlow = new Graphics({ label: "light-glow" });
  private readonly lightParticles = new Graphics({ label: "light-particles" });
  private readonly darkness = new Graphics({ label: "dynamic-darkness" });
  private readonly fog = new Graphics({ label: "fog-of-war" });
  private readonly guides = new Graphics({ label: "visibility-guides" });
  private readonly toolPreview = new Graphics({ label: "visibility-tool-preview" });

  constructor() {
    this.view.eventMode = "none";
    this.view.addChild(
      this.lightGlow,
      this.lightParticles,
      this.darkness,
      this.fog,
      this.guides,
      this.toolPreview,
    );
  }

  render(
    scene: TabletopScene,
    state: TabletopVisibilityState,
    showGuides = false,
    projection: TabletopProjectionMode = "plan",
    activeLevelId?: string | null,
    orientation: TabletopViewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION,
    toolPreview?: TabletopVisibilityToolPreview | null,
    selectedLightId?: string | null,
    selectedFogId?: string | null,
  ) {
    this.lightGlow.clear();
    this.lightParticles.clear();
    this.darkness.clear();
    this.fog.clear();
    this.guides.clear();
    this.toolPreview.clear();

    const activeLevel = activeTabletopLevel(scene, activeLevelId);
    const fallbackLevelId = activeTabletopLevel(scene).id;
    const levelState = filterVisibilityForLevel(state, activeLevel.id, fallbackLevelId);
    const levelOffset =
      projection === "isometric"
        ? tabletopElevationOffset(activeLevel.baseElevation, orientation)
        : { x: 0, y: 0 };
    this.view.position.set(levelOffset.x, levelOffset.y);

    const resolvedLights = levelState.lights.map((light) =>
      resolveAttachedLight(scene, activeLevel, light),
    );
    const enabledLights = resolvedLights.filter((light) => light.enabled);
    for (const light of enabledLights) {
      const radius = Math.max(8, light.radius * Math.max(0.12, light.intensity));
      const color = colorFromHex(light.color);
      const softness = Math.max(
        0,
        Math.min(1, Number(light.properties?.softness ?? 0.4)),
      );
      for (const [scale, layerAlpha] of [
        [1, 0.055],
        [0.72, 0.07],
        [0.42, 0.1],
      ] as const) {
        paintReactiveGlow(
          this.lightGlow,
          light,
          radius * scale,
          levelState.walls,
          scene,
          projection,
          orientation,
          color,
          layerAlpha * (0.55 + light.intensity) * (1 + softness * 0.35),
        );
      }

      const renderLight = offsetLight(light, projection, orientation);
      const particles = light.properties?.particles ?? "none";
      if (particles !== "none") {
        const seed = deterministicSeed(light.id);
        const count = Math.max(4, Math.min(28, Math.round(radius / 42)));
        for (let index = 0; index < count; index += 1) {
          const phase = ((seed + index * 977) % 1000) / 1000;
          const angle = phase * Math.PI * 2;
          const distance =
            radius *
            (0.18 + (((seed >> (index % 16)) + index * 37) % 70) / 100);
          const size =
            particles === "mist" ? 3.2 : particles === "embers" ? 1.8 : 1.2;
          this.lightParticles
            .circle(
              renderLight.x + Math.cos(angle) * distance,
              renderLight.y + Math.sin(angle) * distance,
              size,
            )
            .fill({ color, alpha: particles === "mist" ? 0.08 : 0.28 });
        }
      }
    }

    const darknessAlpha = Math.max(0, 1 - state.globalIllumination) * 0.94;
    if (darknessAlpha > 0.001) {
      this.darkness
        .rect(0, 0, scene.width, scene.height)
        .fill({ color: DARKNESS_COLOR, alpha: darknessAlpha });
      for (const light of enabledLights) {
        const radius = light.radius * Math.max(0.12, light.intensity);
        const renderLight = offsetLight(light, projection, orientation);
        if (!light.castsShadows) {
          const shaped = lightShapePoints(renderLight, radius);
          if (shaped) this.darkness.poly(pointsForGraphics(shaped)).cut();
          else this.darkness.circle(renderLight.x, renderLight.y, radius).cut();
          continue;
        }
        const polygon = darknessCutPolygon(
          light,
          radius,
          levelState.walls,
          scene,
          projection,
          orientation,
        );
        if (polygon.length >= 3)
          this.darkness.poly(pointsForGraphics(polygon)).cut();
      }
    }

    if (state.fogEnabled) {
      const orderedFog = [...levelState.fogStrokes].sort(
        (left, right) => left.sequenceIndex - right.sequenceIndex,
      );
      if (tabletopFogUsesCoveredBase(orderedFog)) {
        this.fog
          .rect(0, 0, scene.width, scene.height)
          .fill({ color: FOG_COLOR, alpha: state.fogOpacity });
      }
      for (const stroke of orderedFog)
        paintFogStroke(this.fog, stroke, FOG_COLOR, state.fogOpacity);
    }

    const previewOrigin = toolPreview?.points[0];
    if (toolPreview && previewOrigin) {
      const color =
        toolPreview.kind === "light"
          ? 0xf2c66d
          : toolPreview.kind === "fog_reveal"
            ? 0x63d9a0
            : 0xe06b76;
      if (toolPreview.kind === "light") {
        this.toolPreview
          .circle(previewOrigin.x, previewOrigin.y, toolPreview.radius)
          .fill({ color, alpha: 0.08 })
          .stroke({ color, alpha: 0.92, width: 2 })
          .circle(previewOrigin.x, previewOrigin.y, 7)
          .fill({ color, alpha: 1 });
      } else if (toolPreview.shape !== "brush" && toolPreview.points.length >= 2) {
        previewFogShape(
          this.toolPreview,
          {
            id: "preview",
            operation: toolPreview.kind === "fog_reveal" ? "reveal" : "hide",
            shape: toolPreview.shape,
            points: toolPreview.points,
            radius: toolPreview.radius,
            sequenceIndex: 0,
          },
          color,
          true,
        );
      } else if (toolPreview.points.length === 1) {
        this.toolPreview
          .circle(previewOrigin.x, previewOrigin.y, toolPreview.radius)
          .fill({ color, alpha: 0.18 })
          .stroke({ color, alpha: 0.82, width: 2.5 });
      } else {
        this.toolPreview.moveTo(previewOrigin.x, previewOrigin.y);
        for (const point of toolPreview.points.slice(1))
          this.toolPreview.lineTo(point.x, point.y);
        this.toolPreview.stroke({
          color,
          alpha: 0.38,
          width: toolPreview.radius * 2,
        });
        this.toolPreview.moveTo(previewOrigin.x, previewOrigin.y);
        for (const point of toolPreview.points.slice(1))
          this.toolPreview.lineTo(point.x, point.y);
        this.toolPreview.stroke({ color, alpha: 0.94, width: 2 });
      }
    }

    // Keep transmissive architecture legible, while the actual glow above is
    // already attenuated ray-by-ray through the same material channels.
    for (const wall of levelState.walls) {
      const transmission = tabletopWallLightTransmission(wall);
      if (transmission <= 0.06 || transmission >= 0.995) continue;
      const channels = structureChannels(wall.wallType, wall.properties);
      const color =
        channels.material === "glass"
          ? 0x8fdcf1
          : channels.material === "force"
            ? 0xb895ff
            : 0xd9d7a4;
      this.lightGlow
        .moveTo(wall.x1, wall.y1)
        .lineTo(wall.x2, wall.y2)
        .stroke({
          color,
          alpha: 0.08 + (1 - transmission) * 0.2,
          width: Math.max(2, Number(wall.thickness) || 4),
        });
    }

    if (!showGuides) return;
    for (const wall of levelState.walls) {
      const type = wall.wallType as TabletopStructureType;
      const family = structureFamily(type);
      const channels = structureChannels(type, wall.properties);
      const open = type === "door_open" || type === "window_open";
      if (isRoofStructure(type)) {
        if (type === "roof_hidden") continue;
        const opacity = Math.max(
          0,
          Math.min(
            1,
            channels.roofOpacity ?? (type === "roof_cutaway" ? 0.28 : 1),
          ),
        );
        this.guides
          .rect(
            Math.min(wall.x1, wall.x2),
            Math.min(wall.y1, wall.y2),
            Math.abs(wall.x2 - wall.x1),
            Math.abs(wall.y2 - wall.y1),
          )
          .fill({ color: 0x74242d, alpha: 0.03 + opacity * 0.08 })
          .stroke({ color: 0xc88791, alpha: 0.28 + opacity * 0.52, width: 3 });
        continue;
      }
      const color =
        family === "window"
          ? 0x79c8df
          : family === "barrier"
            ? 0xb895ff
            : open
              ? 0x63d9a0
              : family === "door"
                ? 0xe6b663
                : 0x9fd5ee;
      const transmission = tabletopWallLightTransmission(wall);
      this.guides
        .moveTo(wall.x1, wall.y1)
        .lineTo(wall.x2, wall.y2)
        .stroke({
          color,
          alpha: open ? 0.62 : 0.62 + (1 - transmission) * 0.34,
          width: family === "wall" ? 3 : 5,
        });
      if (family === "window" || family === "barrier") {
        this.guides
          .moveTo(wall.x1, wall.y1)
          .lineTo(wall.x2, wall.y2)
          .stroke({
            color: 0xf5fbff,
            alpha: 0.14 + transmission * 0.26,
            width: 1,
          });
      }
    }

    const recentFog = levelState.fogStrokes.slice(-64);
    const selectedFog = selectedFogId
      ? levelState.fogStrokes.find((stroke) => stroke.id === selectedFogId)
      : null;
    const fogGuides = selectedFog
      ? [
          ...recentFog.filter((stroke) => stroke.id !== selectedFog.id),
          selectedFog,
        ]
      : recentFog;
    for (const stroke of fogGuides) {
      const selected = stroke.id === selectedFogId;
      const color = stroke.operation === "reveal" ? 0x63d9a0 : 0xe06b76;
      previewFogShape(this.guides, stroke, color, selected);
      if (!selected) continue;
      const anchor = stroke.points[0];
      const handle =
        stroke.shape === "brush" && anchor
          ? { x: anchor.x + stroke.radius, y: anchor.y }
          : stroke.points.at(-1);
      if (anchor)
        this.guides
          .circle(anchor.x, anchor.y, 7)
          .fill({ color, alpha: 1 })
          .stroke({ color: 0xf7f1df, alpha: 0.96, width: 2.5 });
      if (handle)
        this.guides
          .circle(handle.x, handle.y, 9)
          .fill({ color: 0xf7f1df, alpha: 0.98 })
          .stroke({ color, alpha: 1, width: 3 });
    }

    for (const light of resolvedLights) {
      const selected = light.id === selectedLightId;
      const radius = Math.max(8, light.radius);
      const color = colorFromHex(light.color);
      const renderLight = offsetLight(light, projection, orientation);
      appendLightShape(this.guides, renderLight, radius).stroke({
        color,
        alpha: selected ? 0.95 : light.enabled ? 0.58 : 0.2,
        width: selected ? 3 : 2,
      });
      this.guides
        .circle(renderLight.x, renderLight.y, 7)
        .fill({ color, alpha: light.enabled ? 0.95 : 0.35 });
      if (selected) {
        const handle = lightRadiusHandle(renderLight, radius);
        this.guides
          .circle(handle.x, handle.y, 8)
          .fill({ color: 0xf7f1df, alpha: 0.98 })
          .stroke({ color, alpha: 1, width: 3 });
      }
    }
  }

  destroy() {
    this.view.removeFromParent();
    this.view.destroy({ children: true });
  }
}
