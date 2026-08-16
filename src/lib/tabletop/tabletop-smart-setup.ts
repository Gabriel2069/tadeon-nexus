import type { GridMode, Point, TabletopScene } from "./types";
import type { TabletopStructureType } from "./tabletop-spatial";

export interface TabletopSmartStructureSuggestion {
  id: string;
  type: TabletopStructureType;
  start: Point;
  end: Point;
  confidence: number;
  reason: string;
}

export interface TabletopSmartSetupAnalysis {
  sourceWidth: number;
  sourceHeight: number;
  grid: {
    mode: GridMode;
    size: number;
    confidence: number;
    evidence: string;
  };
  structures: TabletopSmartStructureSuggestion[];
  suggestedGlobalIllumination: number;
  suggestedFogEnabled: boolean;
  diagnostics: string[];
}

interface SampledImage {
  width: number;
  height: number;
  luminance: Float32Array;
  alpha: Float32Array;
}

interface EdgeField {
  vertical: Float32Array;
  horizontal: Float32Array;
  verticalEnergy: number[];
  horizontalEnergy: number[];
}

interface PixelRun {
  from: number;
  to: number;
  strength: number;
}

const MAX_SAMPLE_EDGE = 768;
const MAX_STRUCTURES = 96;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function localPeaks(values: number[], minimumGap = 3) {
  const baseline = Math.max(0.001, median(values));
  const threshold = baseline * 1.62;
  const peaks: Array<{ index: number; value: number }> = [];
  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] < threshold || values[index] < values[index - 1] || values[index] < values[index + 1]) continue;
    const previous = peaks.at(-1);
    if (previous && index - previous.index < minimumGap) {
      if (values[index] > previous.value) peaks[peaks.length - 1] = { index, value: values[index] };
      continue;
    }
    peaks.push({ index, value: values[index] });
  }
  return peaks;
}

function estimateSpacing(peaks: Array<{ index: number }>, fallback: number) {
  const distances: number[] = [];
  for (let index = 1; index < peaks.length; index += 1) {
    const distance = peaks[index].index - peaks[index - 1].index;
    if (distance >= 8 && distance <= 180) distances.push(distance);
  }
  return distances.length >= 2 ? median(distances) : fallback;
}

function edgeField(image: SampledImage): EdgeField {
  const vertical = new Float32Array(image.width * image.height);
  const horizontal = new Float32Array(image.width * image.height);
  const verticalEnergy = Array.from({ length: image.width }, () => 0);
  const horizontalEnergy = Array.from({ length: image.height }, () => 0);
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const index = y * image.width + x;
      if (image.alpha[index] < 0.2) continue;
      const gx = Math.abs(image.luminance[index + 1] - image.luminance[index - 1]);
      const gy = Math.abs(image.luminance[index + image.width] - image.luminance[index - image.width]);
      vertical[index] = gx;
      horizontal[index] = gy;
      verticalEnergy[x] += gx;
      horizontalEnergy[y] += gy;
    }
  }
  return { vertical, horizontal, verticalEnergy, horizontalEnergy };
}

function inferGrid(image: SampledImage, scene: TabletopScene, edges: EdgeField) {
  const verticalPeaks = localPeaks(edges.verticalEnergy, 4);
  const horizontalPeaks = localPeaks(edges.horizontalEnergy, 4);
  const fallback = Math.max(16, Math.min(128, scene.gridSize * (image.width / Math.max(1, scene.width))));
  const verticalSpacing = estimateSpacing(verticalPeaks, fallback);
  const horizontalSpacing = estimateSpacing(horizontalPeaks, fallback);
  const agreement = 1 - Math.min(1, Math.abs(verticalSpacing - horizontalSpacing) / Math.max(verticalSpacing, horizontalSpacing, 1));
  const density = clamp((verticalPeaks.length + horizontalPeaks.length) / 24, 0, 1);
  const confidence = clamp(agreement * 0.58 + density * 0.42, 0, 1);
  const sampleSpacing = (verticalSpacing + horizontalSpacing) / 2;
  const sceneScale = ((scene.width / Math.max(1, image.width)) + (scene.height / Math.max(1, image.height))) / 2;
  const size = clamp(Math.round(sampleSpacing * sceneScale), 16, 256);
  return {
    mode: confidence > 0.28 ? ("square" as const) : scene.gridMode,
    size: confidence > 0.28 ? size : scene.gridSize,
    sampleSpacing,
    confidence,
    evidence: confidence > 0.58
      ? `Repetição ortogonal consistente a cada ~${size}px.`
      : confidence > 0.28
        ? "Há repetição de linhas compatível com grade, mas o alinhamento merece conferência visual."
        : "Não encontrei periodicidade suficiente; preservei a grade atual.",
  };
}

function sampleLine(edges: EdgeField, image: SampledImage, axis: "vertical" | "horizontal", coordinate: number) {
  const values: number[] = [];
  if (axis === "vertical") {
    for (let y = 0; y < image.height; y += 1) {
      let value = 0;
      for (let dx = -1; dx <= 1; dx += 1) {
        const x = clamp(coordinate + dx, 0, image.width - 1);
        value = Math.max(value, edges.vertical[y * image.width + x]);
      }
      values.push(value);
    }
  } else {
    for (let x = 0; x < image.width; x += 1) {
      let value = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const y = clamp(coordinate + dy, 0, image.height - 1);
        value = Math.max(value, edges.horizontal[y * image.width + x]);
      }
      values.push(value);
    }
  }
  return values;
}

function extractRuns(values: number[], minimumLength: number, gapTolerance: number): PixelRun[] {
  const nonZero = values.filter((value) => value > 0.015);
  const threshold = Math.max(0.055, median(nonZero) * 1.25);
  const runs: PixelRun[] = [];
  let start = -1;
  let lastStrong = -1;
  let strength = 0;
  let samples = 0;
  for (let index = 0; index < values.length; index += 1) {
    const strong = values[index] >= threshold;
    if (strong) {
      if (start < 0) start = index;
      lastStrong = index;
      strength += values[index];
      samples += 1;
    }
    const exceededGap = start >= 0 && lastStrong >= 0 && index - lastStrong > gapTolerance;
    const endOfLine = index === values.length - 1;
    if ((exceededGap || endOfLine) && start >= 0 && lastStrong >= start) {
      const length = lastStrong - start + 1;
      if (length >= minimumLength) runs.push({ from: start, to: lastStrong, strength: strength / Math.max(1, samples) });
      start = -1;
      lastStrong = -1;
      strength = 0;
      samples = 0;
    }
  }
  return runs;
}

function nearGridLine(coordinate: number, gridSize: number, tolerance: number) {
  const remainder = ((coordinate % gridSize) + gridSize) % gridSize;
  return Math.min(remainder, gridSize - remainder) <= tolerance;
}

function inferArchitecturalSegments(
  image: SampledImage,
  scene: TabletopScene,
  edges: EdgeField,
  grid: ReturnType<typeof inferGrid>,
) {
  const scaleX = scene.width / image.width;
  const scaleY = scene.height / image.height;
  const sampleMinLength = Math.max(10, grid.sampleSpacing * 0.62);
  const gapTolerance = Math.max(2, Math.round(grid.sampleSpacing * 0.12));
  const verticalPeaks = localPeaks(edges.verticalEnergy, Math.max(3, Math.round(grid.sampleSpacing * 0.18)));
  const horizontalPeaks = localPeaks(edges.horizontalEnergy, Math.max(3, Math.round(grid.sampleSpacing * 0.18)));
  const medianVertical = Math.max(0.001, median(edges.verticalEnergy));
  const medianHorizontal = Math.max(0.001, median(edges.horizontalEnergy));
  const walls: TabletopSmartStructureSuggestion[] = [];

  const pushWall = (axis: "vertical" | "horizontal", coordinate: number, run: PixelRun, energyRatio: number) => {
    if (walls.length >= 64) return;
    const sceneCoordinate = axis === "vertical" ? coordinate * scaleX : coordinate * scaleY;
    const gridTolerance = Math.max(3, grid.size * 0.09);
    // Grid art is a frequent false positive. Keep a line on a grid coordinate only
    // when its local edge strength is substantially above the grid baseline.
    if (grid.confidence > 0.4 && nearGridLine(sceneCoordinate, grid.size, gridTolerance) && energyRatio < 3.15 && run.strength < 0.2) return;
    const start = axis === "vertical"
      ? { x: sceneCoordinate, y: run.from * scaleY }
      : { x: run.from * scaleX, y: sceneCoordinate };
    const end = axis === "vertical"
      ? { x: sceneCoordinate, y: run.to * scaleY }
      : { x: run.to * scaleX, y: sceneCoordinate };
    const lengthCells = Math.hypot(end.x - start.x, end.y - start.y) / Math.max(1, grid.size);
    const confidence = clamp(0.36 + Math.min(0.28, (energyRatio - 1.5) * 0.1) + Math.min(0.22, run.strength * 0.7) + Math.min(0.1, lengthCells * 0.012), 0.38, 0.96);
    walls.push({ id: crypto.randomUUID(), type: "wall", start, end, confidence, reason: `Trecho ${axis === "vertical" ? "vertical" : "horizontal"} contínuo de alto contraste (${lengthCells.toFixed(1)} cél.).` });
  };

  for (const peak of verticalPeaks) {
    const ratio = peak.value / medianVertical;
    if (ratio < 1.72) continue;
    for (const run of extractRuns(sampleLine(edges, image, "vertical", peak.index), sampleMinLength, gapTolerance)) pushWall("vertical", peak.index, run, ratio);
  }
  for (const peak of horizontalPeaks) {
    const ratio = peak.value / medianHorizontal;
    if (ratio < 1.72) continue;
    for (const run of extractRuns(sampleLine(edges, image, "horizontal", peak.index), sampleMinLength, gapTolerance)) pushWall("horizontal", peak.index, run, ratio);
  }
  return walls;
}

function axisAndCoordinate(entry: TabletopSmartStructureSuggestion) {
  if (Math.abs(entry.start.x - entry.end.x) < 1) return { axis: "vertical" as const, coordinate: entry.start.x, from: Math.min(entry.start.y, entry.end.y), to: Math.max(entry.start.y, entry.end.y) };
  return { axis: "horizontal" as const, coordinate: entry.start.y, from: Math.min(entry.start.x, entry.end.x), to: Math.max(entry.start.x, entry.end.x) };
}

function inferOpenings(walls: TabletopSmartStructureSuggestion[], gridSize: number) {
  const openings: TabletopSmartStructureSuggestion[] = [];
  const grouped = new Map<string, ReturnType<typeof axisAndCoordinate>[] & { source?: TabletopSmartStructureSuggestion[] }>();
  const sourceGroups = new Map<string, TabletopSmartStructureSuggestion[]>();
  for (const wall of walls) {
    const descriptor = axisAndCoordinate(wall);
    const bucket = Math.round(descriptor.coordinate / Math.max(4, gridSize * 0.16));
    const key = `${descriptor.axis}:${bucket}`;
    sourceGroups.set(key, [...(sourceGroups.get(key) ?? []), wall]);
  }
  void grouped;
  for (const entries of sourceGroups.values()) {
    const sorted = entries.map((wall) => ({ wall, ...axisAndCoordinate(wall) })).sort((a, b) => a.from - b.from);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const next = sorted[index];
      const gap = next.from - previous.to;
      if (gap < gridSize * 0.42 || gap > gridSize * 1.65) continue;
      const confidence = clamp(Math.min(previous.wall.confidence, next.wall.confidence) - 0.08, 0.42, 0.86);
      const coordinate = (previous.coordinate + next.coordinate) / 2;
      const start = previous.axis === "vertical" ? { x: coordinate, y: previous.to } : { x: previous.to, y: coordinate };
      const end = previous.axis === "vertical" ? { x: coordinate, y: next.from } : { x: next.from, y: coordinate };
      openings.push({
        id: crypto.randomUUID(),
        type: gap <= gridSize * 1.18 ? "door_closed" : "window_closed",
        start,
        end,
        confidence,
        reason: `Vão de ${(gap / gridSize).toFixed(1)} cél. entre dois trechos estruturais compatíveis.`,
      });
      if (openings.length >= 18) return openings;
    }
  }
  return openings;
}

function spans(value: { from: number; to: number }, from: number, to: number, tolerance: number) {
  return value.from <= from + tolerance && value.to >= to - tolerance;
}

function inferRoofs(walls: TabletopSmartStructureSuggestion[], gridSize: number) {
  const vertical = walls.map((wall) => ({ wall, ...axisAndCoordinate(wall) })).filter((entry) => entry.axis === "vertical");
  const horizontal = walls.map((wall) => ({ wall, ...axisAndCoordinate(wall) })).filter((entry) => entry.axis === "horizontal");
  const roofs: TabletopSmartStructureSuggestion[] = [];
  const tolerance = Math.max(8, gridSize * 0.32);
  const verticalCoordinates = [...new Set(vertical.map((entry) => Math.round(entry.coordinate)))].sort((a, b) => a - b);
  const horizontalCoordinates = [...new Set(horizontal.map((entry) => Math.round(entry.coordinate)))].sort((a, b) => a - b);

  for (let leftIndex = 0; leftIndex < verticalCoordinates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < verticalCoordinates.length; rightIndex += 1) {
      const left = verticalCoordinates[leftIndex];
      const right = verticalCoordinates[rightIndex];
      const width = right - left;
      if (width < gridSize * 1.4 || width > gridSize * 14) continue;
      for (let topIndex = 0; topIndex < horizontalCoordinates.length; topIndex += 1) {
        for (let bottomIndex = topIndex + 1; bottomIndex < horizontalCoordinates.length; bottomIndex += 1) {
          const top = horizontalCoordinates[topIndex];
          const bottom = horizontalCoordinates[bottomIndex];
          const height = bottom - top;
          if (height < gridSize * 1.4 || height > gridSize * 14) continue;
          const leftWall = vertical.find((entry) => Math.abs(entry.coordinate - left) <= tolerance && spans(entry, top, bottom, tolerance));
          const rightWall = vertical.find((entry) => Math.abs(entry.coordinate - right) <= tolerance && spans(entry, top, bottom, tolerance));
          const topWall = horizontal.find((entry) => Math.abs(entry.coordinate - top) <= tolerance && spans(entry, left, right, tolerance));
          const bottomWall = horizontal.find((entry) => Math.abs(entry.coordinate - bottom) <= tolerance && spans(entry, left, right, tolerance));
          if (!leftWall || !rightWall || !topWall || !bottomWall) continue;
          const confidence = clamp((leftWall.wall.confidence + rightWall.wall.confidence + topWall.wall.confidence + bottomWall.wall.confidence) / 4 - 0.07, 0.45, 0.9);
          const duplicate = roofs.some((roof) => Math.abs(roof.start.x - left) < tolerance && Math.abs(roof.start.y - top) < tolerance && Math.abs(roof.end.x - right) < tolerance && Math.abs(roof.end.y - bottom) < tolerance);
          if (duplicate) continue;
          roofs.push({ id: crypto.randomUUID(), type: "roof_visible", start: { x: left, y: top }, end: { x: right, y: bottom }, confidence, reason: `Contorno fechado de ${(width / gridSize).toFixed(1)} × ${(height / gridSize).toFixed(1)} cél. sugere área coberta.` });
          if (roofs.length >= 12) return roofs;
        }
      }
    }
  }
  return roofs;
}

async function sampleImage(url: string): Promise<SampledImage> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("SMART_SETUP_IMAGE_LOAD_FAILED"));
  });
  image.src = url;
  await loaded;
  const ratio = Math.min(1, MAX_SAMPLE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(32, Math.round(image.naturalWidth * ratio));
  const height = Math.max(32, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("SMART_SETUP_CANVAS_UNAVAILABLE");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = new Float32Array(width * height);
  const alpha = new Float32Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    luminance[index] = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152 + pixels[offset + 2] * 0.0722) / 255;
    alpha[index] = pixels[offset + 3] / 255;
  }
  return { width, height, luminance, alpha };
}

export async function analyzeTabletopMap(scene: TabletopScene): Promise<TabletopSmartSetupAnalysis> {
  if (!scene.backgroundAssetUrl) throw new Error("SMART_SETUP_BACKGROUND_REQUIRED");
  const image = await sampleImage(scene.backgroundAssetUrl);
  const edges = edgeField(image);
  const grid = inferGrid(image, scene, edges);
  const walls = inferArchitecturalSegments(image, scene, edges, grid).filter((entry) => entry.confidence >= 0.42);
  const openings = inferOpenings(walls, grid.size).filter((entry) => entry.confidence >= 0.42);
  const roofs = inferRoofs(walls, grid.size).filter((entry) => entry.confidence >= 0.45);
  const structures = [...walls, ...openings, ...roofs]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, MAX_STRUCTURES);
  const average = image.luminance.reduce((sum, value) => sum + value, 0) / image.luminance.length;
  const diagnostics: string[] = [grid.evidence];
  diagnostics.push(`${walls.length} trecho(s) de parede, ${openings.length} vão(s) provável(is) e ${roofs.length} área(s) coberta(s) encontrados para revisão.`);
  if (!walls.length) diagnostics.push("Nenhuma parede confiável foi inferida; o assistente preservará a arquitetura existente.");
  if (average < 0.24) diagnostics.push("Mapa visualmente escuro: iluminação global reduzida é sugerida.");
  return {
    sourceWidth: image.width,
    sourceHeight: image.height,
    grid: { mode: grid.mode, size: grid.size, confidence: grid.confidence, evidence: grid.evidence },
    structures,
    suggestedGlobalIllumination: average < 0.24 ? 0.18 : average < 0.42 ? 0.42 : 0.72,
    suggestedFogEnabled: true,
    diagnostics,
  };
}
