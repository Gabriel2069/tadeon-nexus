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
} from "./tabletop-levels";
import type { TabletopScene } from "./types";
import type {
  TabletopFogStroke,
  TabletopVisibilityState,
} from "./tabletop-visibility-service";
import { buildVisibilityPolygon } from "./visibility-geometry";
import {
  isRoofStructure,
  structureFamily,
  type TabletopStructureType,
} from "./tabletop-spatial";

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
 * Legacy fog stored exploration as reveal cuts over an implicit covered level.
 * Once a hide region exists we switch to explicit regional paint, so painting
 * "Cobrir" affects only the selected geometry instead of darkening the map.
 */
export function tabletopFogUsesCoveredBase(strokes: TabletopFogStroke[]) {
  return strokes.length === 0 || strokes.every((stroke) => stroke.operation === "reveal");
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
        .stroke({
          color,
          alpha: selected ? 0.98 : 0.22,
          width: selected ? 3.5 : 1.5,
        });
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

export class TabletopVisibilityRenderer {
  readonly view = new Container({ label: "tabletop-visibility" });
  private readonly lightGlow = new Graphics({ label: "light-glow" });
  private readonly darkness = new Graphics({ label: "dynamic-darkness" });
  private readonly fog = new Graphics({ label: "fog-of-war" });
  private readonly guides = new Graphics({ label: "visibility-guides" });
  private readonly toolPreview = new Graphics({ label: "visibility-tool-preview" });

  constructor() {
    this.view.eventMode = "none";
    this.view.addChild(this.lightGlow, this.darkness, this.fog, this.guides, this.toolPreview);
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
    this.darkness.clear();
    this.fog.clear();
    this.guides.clear();
    this.toolPreview.clear();

    const activeLevel = activeTabletopLevel(scene, activeLevelId);
    const fallbackLevelId = activeTabletopLevel(scene).id;
    const levelState = filterVisibilityForLevel(state, activeLevel.id, fallbackLevelId);
    const levelOffset = projection === "isometric"
      ? tabletopElevationOffset(activeLevel.baseElevation, orientation)
      : { x: 0, y: 0 };
    this.view.position.set(levelOffset.x, levelOffset.y);

    const enabledLights = levelState.lights.filter((light) => light.enabled);
    for (const light of enabledLights) {
      const radius = Math.max(8, light.radius * Math.max(0.12, light.intensity));
      this.lightGlow.circle(light.x, light.y, radius).fill({
        color: colorFromHex(light.color),
        alpha: 0.08 + light.intensity * 0.16,
      });
    }

    const darknessAlpha = Math.max(0, 1 - state.globalIllumination) * 0.94;
    if (darknessAlpha > 0.001) {
      this.darkness.rect(0, 0, scene.width, scene.height).fill({
        color: DARKNESS_COLOR,
        alpha: darknessAlpha,
      });
      for (const light of enabledLights) {
        const radius = light.radius * Math.max(0.12, light.intensity);
        if (!light.castsShadows) {
          this.darkness.circle(light.x, light.y, radius).cut();
          continue;
        }
        const polygon = light.visibilityPolygon ?? buildVisibilityPolygon(
          { ...light, radius },
          levelState.walls,
          scene.width,
          scene.height,
        );
        if (polygon.length >= 3) this.darkness.poly(pointsForGraphics(polygon)).cut();
      }
    }

    if (state.fogEnabled) {
      const orderedFog = [...levelState.fogStrokes].sort(
        (left, right) => left.sequenceIndex - right.sequenceIndex,
      );
      if (tabletopFogUsesCoveredBase(orderedFog)) {
        this.fog.rect(0, 0, scene.width, scene.height).fill({
          color: FOG_COLOR,
          alpha: state.fogOpacity,
        });
      }
      for (const stroke of orderedFog)
        paintFogStroke(this.fog, stroke, FOG_COLOR, state.fogOpacity);
    }

    const previewOrigin = toolPreview?.points[0];
    if (toolPreview && previewOrigin) {
      const color = toolPreview.kind === "light"
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
        for (const point of toolPreview.points.slice(1)) this.toolPreview.lineTo(point.x, point.y);
        this.toolPreview.stroke({ color, alpha: 0.38, width: toolPreview.radius * 2 });
        this.toolPreview.moveTo(previewOrigin.x, previewOrigin.y);
        for (const point of toolPreview.points.slice(1)) this.toolPreview.lineTo(point.x, point.y);
        this.toolPreview.stroke({ color, alpha: 0.94, width: 2 });
      }
    }

    if (!showGuides) return;
    for (const wall of levelState.walls) {
      const type = wall.wallType as TabletopStructureType;
      const family = structureFamily(type);
      const open = type === "door_open" || type === "window_open";
      if (isRoofStructure(type)) {
        if (type === "roof_hidden") continue;
        this.guides
          .rect(
            Math.min(wall.x1, wall.x2),
            Math.min(wall.y1, wall.y2),
            Math.abs(wall.x2 - wall.x1),
            Math.abs(wall.y2 - wall.y1),
          )
          .fill({ color: 0x74242d, alpha: type === "roof_cutaway" ? 0.06 : 0.1 })
          .stroke({ color: 0xc88791, alpha: type === "roof_cutaway" ? 0.44 : 0.78, width: 3 });
        continue;
      }
      const color = family === "window"
        ? 0x79c8df
        : open
          ? 0x63d9a0
          : family === "door"
            ? 0xe6b663
            : 0x9fd5ee;
      this.guides.moveTo(wall.x1, wall.y1).lineTo(wall.x2, wall.y2).stroke({
        color,
        alpha: open ? 0.62 : 0.92,
        width: family === "wall" ? 3 : 5,
      });
    }

    const recentFog = levelState.fogStrokes.slice(-64);
    const selectedFog = selectedFogId
      ? levelState.fogStrokes.find((stroke) => stroke.id === selectedFogId)
      : null;
    const fogGuides = selectedFog
      ? [...recentFog.filter((stroke) => stroke.id !== selectedFog.id), selectedFog]
      : recentFog;
    for (const stroke of fogGuides) {
      const selected = stroke.id === selectedFogId;
      const color = stroke.operation === "reveal" ? 0x63d9a0 : 0xe06b76;
      previewFogShape(this.guides, stroke, color, selected);
      if (!selected) continue;
      const anchor = stroke.points[0];
      const handle = stroke.shape === "brush" && anchor
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

    for (const light of levelState.lights) {
      const selected = light.id === selectedLightId;
      this.guides
        .circle(light.x, light.y, Math.max(8, light.radius))
        .stroke({
          color: colorFromHex(light.color),
          alpha: selected ? 0.95 : light.enabled ? 0.58 : 0.2,
          width: selected ? 3 : 2,
        })
        .circle(light.x, light.y, 7)
        .fill({ color: colorFromHex(light.color), alpha: light.enabled ? 0.95 : 0.35 });
      if (selected)
        this.guides
          .circle(light.x + Math.max(8, light.radius), light.y, 8)
          .fill({ color: 0xf7f1df, alpha: 0.98 })
          .stroke({ color: colorFromHex(light.color), alpha: 1, width: 3 });
    }
  }

  destroy() {
    this.view.removeFromParent();
    this.view.destroy({ children: true });
  }
}
