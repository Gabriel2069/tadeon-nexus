import { Graphics } from "pixi.js";
import type { GridMode, Point, TabletopScene } from "./types";

function drawSquare(view: Graphics, scene: TabletopScene, spacing: number) {
  for (let x = 0; x <= scene.width; x += spacing) view.moveTo(x, 0).lineTo(x, scene.height);
  for (let y = 0; y <= scene.height; y += spacing) view.moveTo(0, y).lineTo(scene.width, y);
}

function hexPoints(cx: number, cy: number, radius: number, pointy: boolean) {
  const offset = pointy ? Math.PI / 6 : 0;
  const points: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = offset + (Math.PI / 3) * index;
    points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  return points;
}

function drawHex(view: Graphics, scene: TabletopScene, radius: number, pointy: boolean) {
  const width = pointy ? Math.sqrt(3) * radius : radius * 2;
  const height = pointy ? radius * 2 : Math.sqrt(3) * radius;
  const stepX = pointy ? width : radius * 1.5;
  const stepY = pointy ? radius * 1.5 : height;
  for (let column = -1, x = 0; x <= scene.width + width; column += 1, x += stepX) {
    const yOffset = pointy ? (column % 2 === 0 ? 0 : stepY / 2) : 0;
    for (let y = yOffset; y <= scene.height + height; y += stepY) {
      const cy = pointy ? y : y + (column % 2 === 0 ? 0 : height / 2);
      view.poly(hexPoints(x, cy, radius, pointy));
    }
  }
}

function drawIsometric(view: Graphics, scene: TabletopScene, spacing: number) {
  const rise = spacing * 0.5;
  const span = scene.width + scene.height * 2;
  for (let offset = -scene.height * 2; offset <= span; offset += spacing) {
    view.moveTo(offset, 0).lineTo(offset + scene.height * 2, scene.height);
    view.moveTo(offset, 0).lineTo(offset - scene.height * 2, scene.height);
  }
  for (let y = 0; y <= scene.height; y += rise * 2) {
    view.moveTo(0, y).lineTo(scene.width, y);
  }
}

export function snapPointToGrid(point: Point, mode: GridMode, size: number): Point {
  const spacing = Math.max(8, size);
  if (mode === "none") return point;
  if (mode === "square") {
    return {
      x: Math.round(point.x / spacing) * spacing,
      y: Math.round(point.y / spacing) * spacing,
    };
  }
  if (mode === "isometric") {
    // Diamond lattice basis: (+S/2,+S/4) and (-S/2,+S/4).
    // Converting to that basis before rounding keeps an already-snapped point stable.
    const u = point.x / spacing + (2 * point.y) / spacing;
    const v = -point.x / spacing + (2 * point.y) / spacing;
    const ru = Math.round(u);
    const rv = Math.round(v);
    return {
      x: ((ru - rv) * spacing) / 2,
      y: ((ru + rv) * spacing) / 4,
    };
  }
  const pointy = mode === "hex_pointy";
  const radius = spacing / (pointy ? Math.sqrt(3) : 2);
  const x = pointy
    ? ((Math.sqrt(3) / 3) * point.x - (1 / 3) * point.y) / radius
    : ((2 / 3) * point.x) / radius;
  const z = pointy
    ? ((2 / 3) * point.y) / radius
    : ((-1 / 3) * point.x + (Math.sqrt(3) / 3) * point.y) / radius;
  const y = -x - z;
  let rx = Math.round(x);
  const ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dz >= dy) rz = -rx - ry;
  return pointy
    ? {
        x: radius * Math.sqrt(3) * (rx + rz / 2),
        y: radius * 1.5 * rz,
      }
    : {
        x: radius * 1.5 * rx,
        y: radius * Math.sqrt(3) * (rz + rx / 2),
      };
}

export class GridRenderer {
  readonly view = new Graphics();

  render(scene: TabletopScene) {
    this.view.clear();
    if (scene.gridMode === "none") return;
    const spacing = Math.max(8, scene.gridSize * scene.gridScale);
    if (scene.gridMode === "square") drawSquare(this.view, scene, spacing);
    else if (scene.gridMode === "hex_pointy") drawHex(this.view, scene, spacing / Math.sqrt(3), true);
    else if (scene.gridMode === "hex_flat") drawHex(this.view, scene, spacing / 2, false);
    else drawIsometric(this.view, scene, spacing);
    this.view.stroke({ color: 0x9c7a4f, alpha: 0.22, width: 1 });
  }

  destroy() {
    this.view.destroy();
  }
}
