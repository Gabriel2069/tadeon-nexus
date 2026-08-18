import { Graphics } from "pixi.js";
import "./pixi-destroy-safety";
import type { GridMode, Point, TabletopScene } from "./types";

function normalizedOffset(value: number | undefined, spacing: number) {
  if (!Number.isFinite(value) || spacing <= 0) return 0;
  return ((Number(value) % spacing) + spacing) % spacing;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function drawSquare(view: Graphics, scene: TabletopScene, spacing: number) {
  const offsetX = normalizedOffset(scene.gridOffsetX, spacing);
  const offsetY = normalizedOffset(scene.gridOffsetY, spacing);
  for (let x = offsetX; x <= scene.width; x += spacing)
    view.moveTo(x, 0).lineTo(x, scene.height);
  for (let y = offsetY; y <= scene.height; y += spacing)
    view.moveTo(0, y).lineTo(scene.width, y);
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

function clippedHexPoints(
  cx: number,
  cy: number,
  radius: number,
  pointy: boolean,
  width: number,
  height: number,
) {
  const points = hexPoints(cx, cy, radius, pointy);
  for (let index = 0; index < points.length; index += 2) {
    points[index] = clamp(points[index], 0, width);
    points[index + 1] = clamp(points[index + 1], 0, height);
  }
  return points;
}

function drawHex(view: Graphics, scene: TabletopScene, radius: number, pointy: boolean) {
  const width = pointy ? Math.sqrt(3) * radius : radius * 2;
  const height = pointy ? radius * 2 : Math.sqrt(3) * radius;
  const stepX = pointy ? width : radius * 1.5;
  const stepY = pointy ? radius * 1.5 : height;
  const offsetX = normalizedOffset(scene.gridOffsetX, stepX);
  const offsetY = normalizedOffset(scene.gridOffsetY, stepY);
  for (
    let column = -2, x = offsetX - stepX * 2;
    x <= scene.width + width;
    column += 1, x += stepX
  ) {
    const yOffset = pointy ? (column % 2 === 0 ? 0 : stepY / 2) : 0;
    for (let y = offsetY - stepY + yOffset; y <= scene.height + height; y += stepY) {
      const cy = pointy ? y : y + (column % 2 === 0 ? 0 : height / 2);
      if (x + radius < 0 || x - radius > scene.width || cy + radius < 0 || cy - radius > scene.height)
        continue;
      view.poly(clippedHexPoints(x, cy, radius, pointy, scene.width, scene.height));
    }
  }
}

function clipLineToScene(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
  height: number,
): [number, number, number, number] | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const tests: Array<[number, number]> = [
    [-dx, x1],
    [dx, width - x1],
    [-dy, y1],
    [dy, height - y1],
  ];
  for (const [p, q] of tests) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}

function drawClippedLine(
  view: Graphics,
  scene: TabletopScene,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const clipped = clipLineToScene(x1, y1, x2, y2, scene.width, scene.height);
  if (!clipped) return;
  view.moveTo(clipped[0], clipped[1]).lineTo(clipped[2], clipped[3]);
}

function drawIsometric(view: Graphics, scene: TabletopScene, spacing: number) {
  const rise = spacing * 0.5;
  const originX = normalizedOffset(scene.gridOffsetX, spacing);
  const originY = normalizedOffset(scene.gridOffsetY, Math.max(1, rise));
  const span = scene.width + scene.height * 2;
  for (
    let offset = -scene.height * 2 + originX;
    offset <= span + spacing;
    offset += spacing
  ) {
    drawClippedLine(view, scene, offset, originY, offset + scene.height * 2, scene.height + originY);
    drawClippedLine(view, scene, offset, originY, offset - scene.height * 2, scene.height + originY);
  }
  for (let y = originY; y <= scene.height; y += rise * 2)
    view.moveTo(0, y).lineTo(scene.width, y);
}

export function snapPointToGrid(
  point: Point,
  mode: GridMode,
  size: number,
  offsetX = 0,
  offsetY = 0,
): Point {
  const spacing = Math.max(8, size);
  if (mode === "none") return point;
  const local = { x: point.x - offsetX, y: point.y - offsetY };
  if (mode === "square") {
    return {
      x: Math.round(local.x / spacing) * spacing + offsetX,
      y: Math.round(local.y / spacing) * spacing + offsetY,
    };
  }
  if (mode === "isometric") {
    const u = local.x / spacing + (2 * local.y) / spacing;
    const v = -local.x / spacing + (2 * local.y) / spacing;
    const ru = Math.round(u);
    const rv = Math.round(v);
    return {
      x: ((ru - rv) * spacing) / 2 + offsetX,
      y: ((ru + rv) * spacing) / 4 + offsetY,
    };
  }
  const pointy = mode === "hex_pointy";
  const radius = spacing / (pointy ? Math.sqrt(3) : 2);
  const x = pointy
    ? ((Math.sqrt(3) / 3) * local.x - (1 / 3) * local.y) / radius
    : ((2 / 3) * local.x) / radius;
  const z = pointy
    ? ((2 / 3) * local.y) / radius
    : ((-1 / 3) * local.x + (Math.sqrt(3) / 3) * local.y) / radius;
  const y = -x - z;
  let rx = Math.round(x);
  const ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dz >= dy) rz = -rx - ry;
  const snapped = pointy
    ? {
        x: radius * Math.sqrt(3) * (rx + rz / 2),
        y: radius * 1.5 * rz,
      }
    : {
        x: radius * 1.5 * rx,
        y: radius * Math.sqrt(3) * (rz + rx / 2),
      };
  return { x: snapped.x + offsetX, y: snapped.y + offsetY };
}

export class GridRenderer {
  readonly view = new Graphics();

  render(scene: TabletopScene) {
    this.view.clear();
    if (scene.gridMode === "none") return;
    const spacing = Math.max(8, scene.gridSize * scene.gridScale);
    if (scene.gridMode === "square") drawSquare(this.view, scene, spacing);
    else if (scene.gridMode === "hex_pointy")
      drawHex(this.view, scene, spacing / Math.sqrt(3), true);
    else if (scene.gridMode === "hex_flat") drawHex(this.view, scene, spacing / 2, false);
    else drawIsometric(this.view, scene, spacing);
    this.view.stroke({ color: 0x9c7a4f, alpha: 0.22, width: 1 });
  }

  destroy() {
    this.view.removeFromParent();
    this.view.destroy();
  }
}
