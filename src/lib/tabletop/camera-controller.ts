import { Container } from "pixi.js";
import type { TabletopBounds } from "./geometry";
import type { Point } from "./types";

export type TabletopProjectionMode = "plan" | "isometric";

function projectPoint(point: Point, mode: TabletopProjectionMode): Point {
  if (mode === "plan") return point;
  return {
    x: point.x - point.y,
    y: (point.x + point.y) * 0.5,
  };
}

function unprojectPoint(point: Point, mode: TabletopProjectionMode): Point {
  if (mode === "plan") return point;
  return {
    x: point.y + point.x * 0.5,
    y: point.y - point.x * 0.5,
  };
}

export class CameraController {
  private minZoom = 0.15;
  private maxZoom = 4;
  private projectionMode: TabletopProjectionMode = "plan";
  private elevation = 0;

  constructor(private readonly viewport: Container) {}

  get zoom() {
    return this.viewport.scale.x;
  }

  get projection() {
    return this.projectionMode;
  }

  setProjection(mode: TabletopProjectionMode) {
    this.projectionMode = mode;
  }

  setElevation(elevation: number) {
    this.elevation = Number.isFinite(elevation) ? elevation : 0;
  }

  private projected(point: Point): Point {
    const projected = projectPoint(point, this.projectionMode);
    return this.projectionMode === "isometric"
      ? { x: projected.x, y: projected.y - this.elevation }
      : projected;
  }

  panBy(delta: Point) {
    this.viewport.position.set(
      this.viewport.position.x + delta.x,
      this.viewport.position.y + delta.y,
    );
  }

  setPosition(point: Point) {
    this.viewport.position.set(point.x, point.y);
  }

  placeWorldAtScreen(worldPoint: Point, screenPoint: Point) {
    const projected = this.projected(worldPoint);
    this.viewport.position.set(
      screenPoint.x - projected.x * this.zoom,
      screenPoint.y - projected.y * this.zoom,
    );
  }

  screenToWorld(point: Point): Point {
    const world = unprojectPoint(
      {
        x: (point.x - this.viewport.position.x) / this.zoom,
        y: (point.y - this.viewport.position.y) / this.zoom,
      },
      this.projectionMode,
    );
    return this.projectionMode === "isometric"
      ? { x: world.x + this.elevation, y: world.y + this.elevation }
      : world;
  }

  worldToScreen(point: Point): Point {
    const projected = this.projected(point);
    return {
      x: projected.x * this.zoom + this.viewport.position.x,
      y: projected.y * this.zoom + this.viewport.position.y,
    };
  }

  zoomAt(nextZoom: number, screenPoint: Point) {
    const worldPoint = this.screenToWorld(screenPoint);
    const zoom = Math.min(this.maxZoom, Math.max(this.minZoom, nextZoom));
    this.viewport.scale.set(zoom);
    this.placeWorldAtScreen(worldPoint, screenPoint);
  }

  setView(
    worldCenter: Point,
    zoom: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    const boundedZoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, Number.isFinite(zoom) ? zoom : 1),
    );
    this.viewport.scale.set(boundedZoom);
    this.placeWorldAtScreen(worldCenter, {
      x: screenWidth / 2,
      y: screenHeight / 2,
    });
  }

  center(
    sceneWidth: number,
    sceneHeight: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    this.placeWorldAtScreen(
      { x: sceneWidth / 2, y: sceneHeight / 2 },
      { x: screenWidth / 2, y: screenHeight / 2 },
    );
  }

  fit(
    sceneWidth: number,
    sceneHeight: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    this.fitBounds(
      { x: 0, y: 0, width: sceneWidth, height: sceneHeight },
      screenWidth,
      screenHeight,
      56,
      1,
    );
  }

  fitBounds(
    bounds: TabletopBounds,
    screenWidth: number,
    screenHeight: number,
    padding = 72,
    maxZoom = 2,
  ) {
    const corners = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { x: bounds.x, y: bounds.y + bounds.height },
    ].map((point) => this.projected(point));
    const projectedBounds = {
      x: Math.min(...corners.map((point) => point.x)),
      y: Math.min(...corners.map((point) => point.y)),
      width:
        Math.max(...corners.map((point) => point.x)) -
        Math.min(...corners.map((point) => point.x)),
      height:
        Math.max(...corners.map((point) => point.y)) -
        Math.min(...corners.map((point) => point.y)),
    };
    const availableWidth = Math.max(1, screenWidth - padding * 2);
    const availableHeight = Math.max(1, screenHeight - padding * 2);
    const zoom = Math.min(
      availableWidth / Math.max(projectedBounds.width, 1),
      availableHeight / Math.max(projectedBounds.height, 1),
      maxZoom,
    );
    this.viewport.scale.set(
      Math.min(this.maxZoom, Math.max(this.minZoom, zoom)),
    );
    this.viewport.position.set(
      screenWidth / 2 -
        (projectedBounds.x + projectedBounds.width / 2) * this.zoom,
      screenHeight / 2 -
        (projectedBounds.y + projectedBounds.height / 2) * this.zoom,
    );
  }
}
