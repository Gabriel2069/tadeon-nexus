import { Container } from "pixi.js";
import type { TabletopBounds } from "./geometry";
import type { Point } from "./types";

export class CameraController {
  private minZoom = 0.15;
  private maxZoom = 4;

  constructor(private readonly viewport: Container) {}

  get zoom() {
    return this.viewport.scale.x;
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
    this.viewport.position.set(
      screenPoint.x - worldPoint.x * this.zoom,
      screenPoint.y - worldPoint.y * this.zoom,
    );
  }

  screenToWorld(point: Point): Point {
    return {
      x: (point.x - this.viewport.position.x) / this.zoom,
      y: (point.y - this.viewport.position.y) / this.zoom,
    };
  }

  worldToScreen(point: Point): Point {
    return {
      x: point.x * this.zoom + this.viewport.position.x,
      y: point.y * this.zoom + this.viewport.position.y,
    };
  }

  zoomAt(nextZoom: number, screenPoint: Point) {
    const worldPoint = this.screenToWorld(screenPoint);
    const zoom = Math.min(this.maxZoom, Math.max(this.minZoom, nextZoom));
    this.viewport.scale.set(zoom);
    this.viewport.position.set(
      screenPoint.x - worldPoint.x * zoom,
      screenPoint.y - worldPoint.y * zoom,
    );
  }

  center(
    sceneWidth: number,
    sceneHeight: number,
    screenWidth: number,
    screenHeight: number,
  ) {
    this.viewport.position.set(
      (screenWidth - sceneWidth * this.zoom) / 2,
      (screenHeight - sceneHeight * this.zoom) / 2,
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
    const availableWidth = Math.max(1, screenWidth - padding * 2);
    const availableHeight = Math.max(1, screenHeight - padding * 2);
    const zoom = Math.min(
      availableWidth / Math.max(bounds.width, 1),
      availableHeight / Math.max(bounds.height, 1),
      maxZoom,
    );
    this.viewport.scale.set(
      Math.min(this.maxZoom, Math.max(this.minZoom, zoom)),
    );
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    this.placeWorldAtScreen(center, {
      x: screenWidth / 2,
      y: screenHeight / 2,
    });
  }
}
