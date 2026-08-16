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

const MAX_SAMPLE_EDGE = 768;

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
  const threshold = median(values) * 1.65;
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
    if (distance >= 8 && distance <= 160) distances.push(distance);
  }
  return distances.length >= 2 ? median(distances) : fallback;
}

function lineEnergy(image: SampledImage) {
  const vertical = Array.from({ length: image.width }, () => 0);
  const horizontal = Array.from({ length: image.height }, () => 0);
  for (let y = 1; y < image.height - 1; y += 1) {
    for (let x = 1; x < image.width - 1; x += 1) {
      const index = y * image.width + x;
      if (image.alpha[index] < 0.2) continue;
      const gx = Math.abs(image.luminance[index + 1] - image.luminance[index - 1]);
      const gy = Math.abs(image.luminance[index + image.width] - image.luminance[index - image.width]);
      vertical[x] += gx;
      horizontal[y] += gy;
    }
  }
  return { vertical, horizontal };
}

function inferGrid(image: SampledImage, scene: TabletopScene) {
  const energy = lineEnergy(image);
  const verticalPeaks = localPeaks(energy.vertical, 4);
  const horizontalPeaks = localPeaks(energy.horizontal, 4);
  const fallback = Math.max(16, Math.min(128, scene.gridSize * (image.width / Math.max(1, scene.width))));
  const verticalSpacing = estimateSpacing(verticalPeaks, fallback);
  const horizontalSpacing = estimateSpacing(horizontalPeaks, fallback);
  const agreement = 1 - Math.min(1, Math.abs(verticalSpacing - horizontalSpacing) / Math.max(verticalSpacing, horizontalSpacing, 1));
  const density = clamp((verticalPeaks.length + horizontalPeaks.length) / 22, 0, 1);
  const confidence = clamp(agreement * 0.58 + density * 0.42, 0, 1);
  const sampleSpacing = (verticalSpacing + horizontalSpacing) / 2;
  const sceneScale = scene.width / Math.max(1, image.width);
  const size = clamp(Math.round(sampleSpacing * sceneScale), 16, 256);
  return {
    mode: confidence > 0.28 ? ("square" as const) : scene.gridMode,
    size: confidence > 0.28 ? size : scene.gridSize,
    confidence,
    evidence: confidence > 0.55
      ? `Repetição ortogonal consistente a cada ~${size}px.`
      : confidence > 0.28
        ? `Há repetição de linhas, mas a grade deve ser conferida visualmente.`
        : `Não encontrei periodicidade suficiente; preservei a grade atual.`,
    verticalPeaks,
    horizontalPeaks,
  };
}

function scoreSegment(values: number[], from: number, to: number) {
  let sum = 0;
  let count = 0;
  for (let index = Math.max(0, from); index <= Math.min(values.length - 1, to); index += 1) {
    sum += values[index];
    count += 1;
  }
  return count ? sum / count : 0;
}

function structureSuggestions(image: SampledImage, scene: TabletopScene, grid: ReturnType<typeof inferGrid>) {
  const { vertical, horizontal } = lineEnergy(image);
  const verticalPeaks = localPeaks(vertical, Math.max(3, Math.round(image.width / 180)));
  const horizontalPeaks = localPeaks(horizontal, Math.max(3, Math.round(image.height / 180)));
  const medianVertical = Math.max(0.001, median(vertical));
  const medianHorizontal = Math.max(0.001, median(horizontal));
  const scaleX = scene.width / image.width;
  const scaleY = scene.height / image.height;
  const suggestions: TabletopSmartStructureSuggestion[] = [];
  const add = (type: TabletopStructureType, start: Point, end: Point, confidence: number, reason: string) => {
    if (suggestions.length >= 96) return;
    suggestions.push({ id: crypto.randomUUID(), type, start, end, confidence: clamp(confidence, 0, 1), reason });
  };

  for (const peak of verticalPeaks) {
    const ratio = peak.value / medianVertical;
    if (ratio < 1.8) continue;
    const x = peak.index * scaleX;
    const continuity = clamp(scoreSegment(vertical, peak.index - 1, peak.index + 1) / Math.max(peak.value, 0.001), 0, 1);
    add("wall", { x, y: 0 }, { x, y: scene.height }, clamp((ratio - 1) / 4 + continuity * 0.35, 0.28, 0.92), "Linha vertical de alto contraste e grande continuidade.");
  }
  for (const peak of horizontalPeaks) {
    const ratio = peak.value / medianHorizontal;
    if (ratio < 1.8) continue;
    const y = peak.index * scaleY;
    const continuity = clamp(scoreSegment(horizontal, peak.index - 1, peak.index + 1) / Math.max(peak.value, 0.001), 0, 1);
    add("wall", { x: 0, y }, { x: scene.width, y }, clamp((ratio - 1) / 4 + continuity * 0.35, 0.28, 0.92), "Linha horizontal de alto contraste e grande continuidade.");
  }

  // Evita transformar cada linha de grade detectada em parede. Linhas muito próximas
  // da periodicidade provável da grade recebem penalidade e são removidas.
  if (grid.confidence > 0.35) {
    const tolerance = Math.max(3, grid.size * 0.12);
    return suggestions.filter((entry) => {
      const coordinate = Math.abs(entry.start.x - entry.end.x) < 1 ? entry.start.x : entry.start.y;
      const remainder = coordinate % grid.size;
      return Math.min(remainder, grid.size - remainder) > tolerance || entry.confidence > 0.76;
    });
  }
  return suggestions;
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
  const grid = inferGrid(image, scene);
  const structures = structureSuggestions(image, scene, grid)
    .filter((entry) => entry.confidence >= 0.42)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 64);
  const average = image.luminance.reduce((sum, value) => sum + value, 0) / image.luminance.length;
  const diagnostics: string[] = [grid.evidence];
  if (structures.length) diagnostics.push(`${structures.length} eixo(s) arquitetônico(s) forte(s) encontrados para revisão.`);
  else diagnostics.push("Nenhuma parede confiável foi aplicada automaticamente; use o desenho assistido para completar a arquitetura.");
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
