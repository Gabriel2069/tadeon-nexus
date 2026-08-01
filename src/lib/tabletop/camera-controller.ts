import { Container } from "pixi.js";
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
    const padding = 48;
    const zoom = Math.min(
      (screenWidth - padding * 2) / sceneWidth,
      (screenHeight - padding * 2) / sceneHeight,
      1,
    );
    this.viewport.scale.set(Math.max(this.minZoom, zoom));
    this.center(sceneWidth, sceneHeight, screenWidth, screenHeight);
  }
}
