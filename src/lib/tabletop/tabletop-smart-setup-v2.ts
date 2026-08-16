import type { Point, TabletopEntitySeed, TabletopScene } from "./types";
import {
  analyzeTabletopMap,
  type TabletopSmartSetupAnalysis,
  type TabletopSmartStructureSuggestion,
} from "./tabletop-smart-setup";
import type { TabletopSurfaceType } from "./tabletop-regions";

export type SmartSetupSemanticKind =
  | "room"
  | "corridor"
  | "terrain"
  | "cover"
  | "stairs"
  | "landing"
  | "light_zone";

export interface SmartSetupEvidence {
  confidence: number;
  evidence: string[];
}

export interface SmartSetupBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SmartSetupRegionSuggestion extends SmartSetupEvidence {
  id: string;
  kind: Exclude<SmartSetupSemanticKind, "light_zone">;
  label: string;
  bounds: SmartSetupBounds;
  surface: TabletopSurfaceType;
  movementMultiplier: number;
  lightMultiplier: number;
  concealment: number;
  soundAbsorption: number;
  suggestedAutomation?: "level-transition" | "reveal-room" | "ambience";
}

export interface SmartSetupLightZone extends SmartSetupEvidence {
  id: string;
  center: Point;
  radius: number;
  intensity: number;
  temperature: number;
}

export interface SmartSetupGridAlignment extends SmartSetupEvidence {
  offsetX: number;
  offsetY: number;
  phaseScoreX: number;
  phaseScoreY: number;
}

export interface TabletopSmartSetupV2Analysis extends TabletopSmartSetupAnalysis {
  version: 2;
  gridAlignment: SmartSetupGridAlignment;
  rooms: SmartSetupRegionSuggestion[];
  corridors: SmartSetupRegionSuggestion[];
  terrain: SmartSetupRegionSuggestion[];
  cover: SmartSetupRegionSuggestion[];
  verticalTransitions: SmartSetupRegionSuggestion[];
  lightZones: SmartSetupLightZone[];
  semanticRegions: SmartSetupRegionSuggestion[];
  analysisScore: number;
}

interface ColorFrame {
  width: number;
  height: number;
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  luminance: Float32Array;
  gradientX: Float32Array;
  gradientY: Float32Array;
}

const MAX_V2_SAMPLE_EDGE = 512;
const MAX_REGIONS = 40;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return mean(values.map((value) => (value - average) ** 2));
}

function percentile(values: number[], quantile: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * quantile)))];
}

function modulo(value: number, divisor: number) {
  return divisor > 0 ? ((value % divisor) + divisor) % divisor : 0;
}

async function readColorFrame(scene: TabletopScene): Promise<ColorFrame | null> {
  if (!scene.backgroundAssetUrl || typeof document === "undefined") return null;
  try {
    const response = await fetch(scene.backgroundAssetUrl, { credentials: "omit" });
    if (!response.ok) return null;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_V2_SAMPLE_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(32, Math.round(bitmap.width * scale));
    const height = Math.max(32, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      bitmap.close();
      return null;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const pixels = context.getImageData(0, 0, width, height).data;
    const length = width * height;
    const r = new Float32Array(length);
    const g = new Float32Array(length);
    const b = new Float32Array(length);
    const luminance = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      const offset = index * 4;
      const alpha = pixels[offset + 3] / 255;
      r[index] = (pixels[offset] / 255) * alpha;
      g[index] = (pixels[offset + 1] / 255) * alpha;
      b[index] = (pixels[offset + 2] / 255) * alpha;
      luminance[index] = (r[index] * 0.2126 + g[index] * 0.7152 + b[index] * 0.0722) * alpha;
    }
    const gradientX = new Float32Array(length);
    const gradientY = new Float32Array(length);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        gradientX[index] = Math.abs(luminance[index + 1] - luminance[index - 1]);
        gradientY[index] = Math.abs(luminance[index + width] - luminance[index - width]);
      }
    }
    return { width, height, r, g, b, luminance, gradientX, gradientY };
  } catch {
    return null;
  }
}

function bestGridPhase(
  energy: number[],
  spacing: number,
): { phase: number; score: number; confidence: number } {
  const step = Math.max(2, Math.round(spacing));
  if (step < 4 || energy.length < step * 2) return { phase: 0, score: 0, confidence: 0 };
  const scores: Array<{ phase: number; score: number }> = [];
  for (let phase = 0; phase < step; phase += 1) {
    const values: number[] = [];
    for (let index = phase; index < energy.length; index += step) values.push(energy[index]);
    scores.push({ phase, score: mean(values) });
  }
  scores.sort((left, right) => right.score - left.score);
  const best = scores[0] ?? { phase: 0, score: 0 };
  const baseline = mean(scores.map((entry) => entry.score));
  const second = scores[1]?.score ?? baseline;
  const separation = best.score <= 0 ? 0 : (best.score - Math.max(second, baseline)) / best.score;
  return {
    phase: best.phase,
    score: best.score,
    confidence: clamp(separation * 2.8 + (best.score > baseline * 1.2 ? 0.22 : 0), 0, 0.98),
  };
}

function inferGridAlignment(
  frame: ColorFrame | null,
  scene: TabletopScene,
  base: TabletopSmartSetupAnalysis,
): SmartSetupGridAlignment {
  if (!frame || base.grid.mode === "none") {
    return {
      offsetX: scene.gridOffsetX ?? 0,
      offsetY: scene.gridOffsetY ?? 0,
      phaseScoreX: 0,
      phaseScoreY: 0,
      confidence: 0,
      evidence: ["Sem amostra suficiente para recalcular a origem; preservei o alinhamento atual."],
    };
  }
  const scaleX = scene.width / frame.width;
  const scaleY = scene.height / frame.height;
  const sampleSpacingX = Math.max(3, base.grid.size / Math.max(scaleX, 0.001));
  const sampleSpacingY = Math.max(3, base.grid.size / Math.max(scaleY, 0.001));
  const verticalEnergy = Array.from({ length: frame.width }, () => 0);
  const horizontalEnergy = Array.from({ length: frame.height }, () => 0);
  for (let y = 1; y < frame.height - 1; y += 1) {
    for (let x = 1; x < frame.width - 1; x += 1) {
      const index = y * frame.width + x;
      verticalEnergy[x] += frame.gradientX[index];
      horizontalEnergy[y] += frame.gradientY[index];
    }
  }
  const x = bestGridPhase(verticalEnergy, sampleSpacingX);
  const y = bestGridPhase(horizontalEnergy, sampleSpacingY);
  const offsetX = modulo(x.phase * scaleX, Math.max(8, base.grid.size));
  const offsetY = modulo(y.phase * scaleY, Math.max(8, base.grid.size));
  const confidence = clamp(base.grid.confidence * 0.45 + Math.min(x.confidence, y.confidence) * 0.55);
  return {
    offsetX: Math.round(offsetX * 10) / 10,
    offsetY: Math.round(offsetY * 10) / 10,
    phaseScoreX: x.score,
    phaseScoreY: y.score,
    confidence,
    evidence: [
      `Fase horizontal mais consistente em x=${offsetX.toFixed(1)}px.`,
      `Fase vertical mais consistente em y=${offsetY.toFixed(1)}px.`,
      confidence >= 0.55
        ? "As duas periodicidades sustentam um alinhamento automático confiável."
        : "Origem sugerida com confiança moderada; revise visualmente antes de aplicar.",
    ],
  };
}

function axisDescriptor(structure: TabletopSmartStructureSuggestion) {
  const vertical = Math.abs(structure.start.x - structure.end.x) <= Math.abs(structure.start.y - structure.end.y);
  return vertical
    ? {
        axis: "vertical" as const,
        coordinate: (structure.start.x + structure.end.x) / 2,
        from: Math.min(structure.start.y, structure.end.y),
        to: Math.max(structure.start.y, structure.end.y),
      }
    : {
        axis: "horizontal" as const,
        coordinate: (structure.start.y + structure.end.y) / 2,
        from: Math.min(structure.start.x, structure.end.x),
        to: Math.max(structure.start.x, structure.end.x),
      };
}

function clusterCoordinates(values: number[], tolerance: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const result: number[] = [];
  for (const value of sorted) {
    const previous = result.at(-1);
    if (previous === undefined || Math.abs(value - previous) > tolerance) result.push(value);
    else result[result.length - 1] = (previous + value) / 2;
  }
  return result;
}

function boundaryCoverage(
  structures: TabletopSmartStructureSuggestion[],
  axis: "vertical" | "horizontal",
  coordinate: number,
  from: number,
  to: number,
  tolerance: number,
) {
  const relevant = structures
    .filter((structure) => structure.type === "wall")
    .map(axisDescriptor)
    .filter((entry) => entry.axis === axis && Math.abs(entry.coordinate - coordinate) <= tolerance)
    .map((entry) => ({ from: Math.max(from, entry.from), to: Math.min(to, entry.to) }))
    .filter((entry) => entry.to > entry.from)
    .sort((left, right) => left.from - right.from);
  if (!relevant.length) return 0;
  let covered = 0;
  let cursor = from;
  for (const entry of relevant) {
    if (entry.to <= cursor) continue;
    const start = Math.max(cursor, entry.from);
    if (start > cursor + tolerance) cursor = start;
    const end = Math.max(cursor, entry.to);
    covered += Math.max(0, end - Math.max(cursor, entry.from));
    cursor = end;
  }
  return clamp(covered / Math.max(1, to - from));
}

function inferRooms(
  base: TabletopSmartSetupAnalysis,
  scene: TabletopScene,
): { rooms: SmartSetupRegionSuggestion[]; corridors: SmartSetupRegionSuggestion[] } {
  const walls = base.structures.filter((entry) => entry.type === "wall");
  const tolerance = Math.max(5, base.grid.size * 0.18);
  const descriptors = walls.map(axisDescriptor);
  const xs = clusterCoordinates(
    descriptors.filter((entry) => entry.axis === "vertical").map((entry) => entry.coordinate),
    tolerance,
  );
  const ys = clusterCoordinates(
    descriptors.filter((entry) => entry.axis === "horizontal").map((entry) => entry.coordinate),
    tolerance,
  );
  const rooms: SmartSetupRegionSuggestion[] = [];
  const corridors: SmartSetupRegionSuggestion[] = [];
  for (let xi = 0; xi < xs.length - 1; xi += 1) {
    for (let yi = 0; yi < ys.length - 1; yi += 1) {
      const x1 = xs[xi];
      const x2 = xs[xi + 1];
      const y1 = ys[yi];
      const y2 = ys[yi + 1];
      const width = x2 - x1;
      const height = y2 - y1;
      if (width < base.grid.size * 0.65 || height < base.grid.size * 0.65) continue;
      if (width * height > scene.width * scene.height * 0.42) continue;
      const sides = [
        boundaryCoverage(walls, "vertical", x1, y1, y2, tolerance),
        boundaryCoverage(walls, "vertical", x2, y1, y2, tolerance),
        boundaryCoverage(walls, "horizontal", y1, x1, x2, tolerance),
        boundaryCoverage(walls, "horizontal", y2, x1, x2, tolerance),
      ];
      const minimum = Math.min(...sides);
      const average = mean(sides);
      if (minimum < 0.46 || average < 0.66) continue;
      const aspect = Math.max(width, height) / Math.max(1, Math.min(width, height));
      const narrow = Math.min(width, height) <= base.grid.size * 2.15;
      const kind = aspect >= 2.65 || narrow ? "corridor" : "room";
      const confidence = clamp(average * 0.72 + minimum * 0.18 + base.grid.confidence * 0.1, 0.48, 0.96);
      const target = kind === "room" ? rooms : corridors;
      target.push({
        id: crypto.randomUUID(),
        kind,
        label: kind === "room" ? `Cômodo ${rooms.length + 1}` : `Corredor ${corridors.length + 1}`,
        bounds: { x: x1, y: y1, width, height },
        surface: "normal",
        movementMultiplier: 1,
        lightMultiplier: 1,
        concealment: 0,
        soundAbsorption: kind === "room" ? 0.06 : 0.02,
        suggestedAutomation: "reveal-room",
        confidence,
        evidence: [
          `${Math.round(average * 100)}% do perímetro encontrado em trechos estruturais.`,
          kind === "corridor" ? `Proporção ${aspect.toFixed(1)}:1 compatível com circulação.` : "Contorno fechado compatível com ambiente navegável.",
        ],
      });
      if (rooms.length + corridors.length >= 28) return { rooms, corridors };
    }
  }
  return { rooms, corridors };
}

function frameRectStats(frame: ColorFrame, scene: TabletopScene, bounds: SmartSetupBounds) {
  const scaleX = frame.width / Math.max(1, scene.width);
  const scaleY = frame.height / Math.max(1, scene.height);
  const x1 = Math.max(0, Math.floor(bounds.x * scaleX));
  const y1 = Math.max(0, Math.floor(bounds.y * scaleY));
  const x2 = Math.min(frame.width - 1, Math.ceil((bounds.x + bounds.width) * scaleX));
  const y2 = Math.min(frame.height - 1, Math.ceil((bounds.y + bounds.height) * scaleY));
  const luminance: number[] = [];
  const gradient: number[] = [];
  const greenBias: number[] = [];
  const blueBias: number[] = [];
  for (let y = y1; y <= y2; y += 2) {
    for (let x = x1; x <= x2; x += 2) {
      const index = y * frame.width + x;
      luminance.push(frame.luminance[index]);
      gradient.push(frame.gradientX[index] + frame.gradientY[index]);
      greenBias.push(frame.g[index] - (frame.r[index] + frame.b[index]) / 2);
      blueBias.push(frame.b[index] - frame.r[index]);
    }
  }
  return {
    luminance: mean(luminance),
    variance: variance(luminance),
    gradient: mean(gradient),
    greenBias: mean(greenBias),
    blueBias: mean(blueBias),
  };
}

function inferTerrain(
  frame: ColorFrame | null,
  scene: TabletopScene,
  gridSize: number,
): SmartSetupRegionSuggestion[] {
  if (!frame) return [];
  const tile = Math.max(gridSize * 2.2, Math.min(scene.width, scene.height) / 14);
  const candidates: Array<{ bounds: SmartSetupBounds; stats: ReturnType<typeof frameRectStats> }> = [];
  for (let y = 0; y < scene.height; y += tile) {
    for (let x = 0; x < scene.width; x += tile) {
      const bounds = {
        x,
        y,
        width: Math.min(tile, scene.width - x),
        height: Math.min(tile, scene.height - y),
      };
      candidates.push({ bounds, stats: frameRectStats(frame, scene, bounds) });
    }
  }
  const roughThreshold = percentile(candidates.map((entry) => entry.stats.variance + entry.stats.gradient * 0.24), 0.78);
  return candidates
    .filter((entry) => entry.stats.variance + entry.stats.gradient * 0.24 >= roughThreshold)
    .sort(
      (left, right) =>
        right.stats.variance + right.stats.gradient * 0.24 -
        (left.stats.variance + left.stats.gradient * 0.24),
    )
    .slice(0, 8)
    .map((entry, index) => {
      const foliage = entry.stats.greenBias > 0.035;
      const watery = entry.stats.blueBias > 0.045 && entry.stats.variance < roughThreshold * 1.2;
      const surface: TabletopSurfaceType = foliage ? "foliage" : watery ? "water" : "difficult";
      return {
        id: crypto.randomUUID(),
        kind: "terrain" as const,
        label: `${surface === "foliage" ? "Vegetação" : surface === "water" ? "Área aquática" : "Terreno complexo"} ${index + 1}`,
        bounds: entry.bounds,
        surface,
        movementMultiplier: surface === "water" ? 1.75 : surface === "foliage" ? 1.4 : 1.5,
        lightMultiplier: surface === "foliage" ? 0.72 : surface === "water" ? 0.88 : 0.95,
        concealment: surface === "foliage" ? 0.24 : 0,
        soundAbsorption: surface === "foliage" ? 0.28 : surface === "water" ? 0.14 : 0.08,
        suggestedAutomation: "ambience" as const,
        confidence: clamp(0.44 + entry.stats.variance * 2.8 + entry.stats.gradient * 0.9, 0.44, 0.84),
        evidence: [
          `Textura local ${(entry.stats.variance * 1000).toFixed(1)} / gradiente ${(entry.stats.gradient * 100).toFixed(1)}.`,
          foliage ? "Dominância cromática verde reforça hipótese de vegetação." : watery ? "Dominância azul e textura relativamente uniforme reforçam hipótese aquática." : "Alta variação local sugere terreno não uniforme.",
        ],
      };
    });
}

function inferCover(base: TabletopSmartSetupAnalysis): SmartSetupRegionSuggestion[] {
  const grid = Math.max(8, base.grid.size);
  return base.structures
    .filter((entry) => entry.type === "wall")
    .map((entry) => ({ entry, length: Math.hypot(entry.end.x - entry.start.x, entry.end.y - entry.start.y) }))
    .filter(({ length }) => length >= grid * 0.5 && length <= grid * 2.35)
    .sort((left, right) => right.entry.confidence - left.entry.confidence)
    .slice(0, 10)
    .map(({ entry, length }, index) => {
      const padding = Math.max(10, grid * 0.22);
      const x = Math.min(entry.start.x, entry.end.x) - padding;
      const y = Math.min(entry.start.y, entry.end.y) - padding;
      return {
        id: crypto.randomUUID(),
        kind: "cover" as const,
        label: `Cobertura ${index + 1}`,
        bounds: {
          x,
          y,
          width: Math.max(padding * 2, Math.abs(entry.end.x - entry.start.x) + padding * 2),
          height: Math.max(padding * 2, Math.abs(entry.end.y - entry.start.y) + padding * 2),
        },
        surface: "normal" as const,
        movementMultiplier: 1,
        lightMultiplier: 0.9,
        concealment: 0.28,
        soundAbsorption: 0.04,
        confidence: clamp(entry.confidence * 0.76, 0.4, 0.8),
        evidence: [`Trecho estrutural curto de ${(length / grid).toFixed(1)} cél. é compatível com cobertura ou obstáculo baixo.`],
      };
    });
}

function periodicityScore(values: number[], minimumGap: number) {
  if (values.length < 5) return { count: 0, regularity: 0 };
  const threshold = percentile(values, 0.72);
  const peaks: number[] = [];
  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] < threshold || values[index] < values[index - 1] || values[index] < values[index + 1]) continue;
    if (!peaks.length || index - peaks[peaks.length - 1] >= minimumGap) peaks.push(index);
  }
  if (peaks.length < 4) return { count: peaks.length, regularity: 0 };
  const gaps = peaks.slice(1).map((value, index) => value - peaks[index]);
  const average = mean(gaps);
  const deviation = Math.sqrt(variance(gaps));
  return { count: peaks.length, regularity: clamp(1 - deviation / Math.max(1, average)) };
}

function inferVerticalTransitions(
  frame: ColorFrame | null,
  scene: TabletopScene,
  regions: SmartSetupRegionSuggestion[],
): SmartSetupRegionSuggestion[] {
  if (!frame) return [];
  const scaleX = frame.width / Math.max(1, scene.width);
  const scaleY = frame.height / Math.max(1, scene.height);
  const candidates: SmartSetupRegionSuggestion[] = [];
  for (const region of regions) {
    const { bounds } = region;
    const x1 = Math.max(0, Math.floor(bounds.x * scaleX));
    const x2 = Math.min(frame.width - 1, Math.ceil((bounds.x + bounds.width) * scaleX));
    const y1 = Math.max(0, Math.floor(bounds.y * scaleY));
    const y2 = Math.min(frame.height - 1, Math.ceil((bounds.y + bounds.height) * scaleY));
    const rows: number[] = [];
    const columns: number[] = [];
    for (let y = y1; y <= y2; y += 1) {
      let total = 0;
      for (let x = x1; x <= x2; x += 2) total += frame.gradientY[y * frame.width + x];
      rows.push(total / Math.max(1, Math.ceil((x2 - x1 + 1) / 2)));
    }
    for (let x = x1; x <= x2; x += 1) {
      let total = 0;
      for (let y = y1; y <= y2; y += 2) total += frame.gradientX[y * frame.width + x];
      columns.push(total / Math.max(1, Math.ceil((y2 - y1 + 1) / 2)));
    }
    const horizontal = periodicityScore(rows, 2);
    const vertical = periodicityScore(columns, 2);
    const best = horizontal.regularity >= vertical.regularity ? horizontal : vertical;
    if (best.count < 4 || best.regularity < 0.62) continue;
    candidates.push({
      id: crypto.randomUUID(),
      kind: "stairs",
      label: `Escada provável ${candidates.length + 1}`,
      bounds,
      surface: "difficult",
      movementMultiplier: 1.25,
      lightMultiplier: 1,
      concealment: 0,
      soundAbsorption: 0.04,
      suggestedAutomation: "level-transition",
      confidence: clamp(0.42 + best.regularity * 0.42 + Math.min(0.12, best.count * 0.012), 0.5, 0.92),
      evidence: [`${best.count} bordas paralelas com regularidade de ${Math.round(best.regularity * 100)}% dentro da região.`],
    });
    if (candidates.length >= 6) break;
  }
  return candidates;
}

function inferLightZones(frame: ColorFrame | null, scene: TabletopScene): SmartSetupLightZone[] {
  if (!frame) return [];
  const block = Math.max(8, Math.round(Math.min(frame.width, frame.height) / 24));
  const cells: Array<{ x: number; y: number; luminance: number; variance: number }> = [];
  for (let y = 0; y < frame.height; y += block) {
    for (let x = 0; x < frame.width; x += block) {
      const values: number[] = [];
      for (let sy = y; sy < Math.min(frame.height, y + block); sy += 2)
        for (let sx = x; sx < Math.min(frame.width, x + block); sx += 2)
          values.push(frame.luminance[sy * frame.width + sx]);
      cells.push({ x, y, luminance: mean(values), variance: variance(values) });
    }
  }
  const threshold = percentile(cells.map((cell) => cell.luminance), 0.88);
  const scaleX = scene.width / frame.width;
  const scaleY = scene.height / frame.height;
  return cells
    .filter((cell) => cell.luminance >= threshold && cell.variance < 0.08)
    .sort((left, right) => right.luminance - left.luminance)
    .slice(0, 8)
    .map((cell) => ({
      id: crypto.randomUUID(),
      center: { x: (cell.x + block / 2) * scaleX, y: (cell.y + block / 2) * scaleY },
      radius: Math.max(scene.gridSize * 2, block * Math.max(scaleX, scaleY) * 2.4),
      intensity: clamp(0.45 + cell.luminance * 0.48, 0.45, 0.94),
      temperature: cell.luminance > 0.82 ? 5200 : 4200,
      confidence: clamp(0.38 + cell.luminance * 0.52 - cell.variance, 0.45, 0.9),
      evidence: [`Mancha luminosa no percentil superior do mapa (${Math.round(cell.luminance * 100)}% de luminância).`],
    }));
}

export function smartSetupRegionToEntitySeed(region: SmartSetupRegionSuggestion): TabletopEntitySeed {
  return {
    type: "area",
    label: region.label,
    width: Math.max(12, region.bounds.width),
    height: Math.max(12, region.bounds.height),
    properties: {
      region: {
        enabled: true,
        surface: region.surface,
        movementMultiplier: region.movementMultiplier,
        lightMultiplier: region.lightMultiplier,
        concealment: region.concealment,
        soundAbsorption: region.soundAbsorption,
        label: region.label,
        notes: `Detectado pelo Setup inteligente v2 · confiança ${Math.round(region.confidence * 100)}%.`,
      },
      smart_setup: {
        version: 2,
        kind: region.kind,
        confidence: region.confidence,
        evidence: region.evidence,
        suggestedAutomation: region.suggestedAutomation ?? null,
      },
    },
  };
}

export async function analyzeTabletopMapV2(scene: TabletopScene): Promise<TabletopSmartSetupV2Analysis> {
  const [base, frame] = await Promise.all([analyzeTabletopMap(scene), readColorFrame(scene)]);
  const gridAlignment = inferGridAlignment(frame, scene, base);
  const { rooms, corridors } = inferRooms(base, scene);
  const terrain = inferTerrain(frame, scene, base.grid.size);
  const cover = inferCover(base);
  const navigable = [...rooms, ...corridors];
  const verticalTransitions = inferVerticalTransitions(frame, scene, navigable);
  const lightZones = inferLightZones(frame, scene);
  const semanticRegions = [...navigable, ...terrain, ...cover, ...verticalTransitions]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, MAX_REGIONS);
  const structuralConfidence = base.structures.length
    ? mean(base.structures.map((entry) => entry.confidence))
    : 0;
  const semanticConfidence = semanticRegions.length
    ? mean(semanticRegions.map((entry) => entry.confidence))
    : 0;
  const analysisScore = Math.round(
    clamp(
      base.grid.confidence * 0.2 +
        gridAlignment.confidence * 0.18 +
        structuralConfidence * 0.28 +
        semanticConfidence * 0.24 +
        (lightZones.length ? mean(lightZones.map((zone) => zone.confidence)) * 0.1 : 0),
    ) * 100,
  );
  return {
    ...base,
    version: 2,
    gridAlignment,
    rooms,
    corridors,
    terrain,
    cover,
    verticalTransitions,
    lightZones,
    semanticRegions,
    analysisScore,
    diagnostics: [
      ...base.diagnostics,
      `Setup v2: ${rooms.length} cômodo(s), ${corridors.length} corredor(es), ${terrain.length} zona(s) de terreno, ${verticalTransitions.length} transição(ões) vertical(is) e ${lightZones.length} foco(s) de luz.`,
      `Qualidade agregada da leitura: ${analysisScore}/100. Sugestões permanecem assistidas e reversíveis.`,
    ],
  };
}
