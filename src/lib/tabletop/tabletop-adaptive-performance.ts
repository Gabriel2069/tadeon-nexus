export type TabletopQualityTier = "cinematic" | "high" | "balanced" | "economy";

export interface TabletopPerformanceSample {
  fps: number;
  entityCount: number;
  devicePixelRatio: number;
  memoryGb?: number;
  coarsePointer: boolean;
}

export interface TabletopQualityProfile {
  tier: TabletopQualityTier;
  maxResolution: number;
  nativeModels: boolean;
  effects: "full" | "reduced" | "minimal";
  textureBudgetMb: number;
}

/* Rendering resolution is the last quality lever we sacrifice. Modern phones
   and tablets commonly have dense screens, so dropping the backing canvas to
   1x/1.25x made the map visibly soft even while the device still had enough
   GPU headroom. Effects and native models can degrade first; the canvas keeps
   a useful high-DPI floor throughout the adaptive ladder. */
const PROFILES: Record<TabletopQualityTier, TabletopQualityProfile> = {
  cinematic: {
    tier: "cinematic",
    maxResolution: 2.5,
    nativeModels: true,
    effects: "full",
    textureBudgetMb: 512,
  },
  high: {
    tier: "high",
    maxResolution: 2,
    nativeModels: true,
    effects: "full",
    textureBudgetMb: 384,
  },
  balanced: {
    tier: "balanced",
    maxResolution: 1.6,
    nativeModels: true,
    effects: "reduced",
    textureBudgetMb: 256,
  },
  economy: {
    tier: "economy",
    maxResolution: 1.25,
    nativeModels: false,
    effects: "minimal",
    textureBudgetMb: 160,
  },
};

export function recommendTabletopQuality(sample: TabletopPerformanceSample): TabletopQualityProfile {
  const memoryPressure = sample.memoryGb !== undefined && sample.memoryGb <= 4;
  const dense = sample.entityCount > 420;
  const veryDense = sample.entityCount > 750;
  if (sample.fps < 38 || veryDense || (memoryPressure && sample.coarsePointer)) return PROFILES.economy;
  if (sample.fps < 50 || dense || memoryPressure) return PROFILES.balanced;
  if (sample.fps < 57 || sample.coarsePointer || sample.devicePixelRatio > 2.5) return PROFILES.high;
  return PROFILES.cinematic;
}

export function lowerTabletopQuality(tier: TabletopQualityTier): TabletopQualityProfile {
  if (tier === "cinematic") return PROFILES.high;
  if (tier === "high") return PROFILES.balanced;
  return PROFILES.economy;
}

export function raiseTabletopQuality(tier: TabletopQualityTier): TabletopQualityProfile {
  if (tier === "economy") return PROFILES.balanced;
  if (tier === "balanced") return PROFILES.high;
  return PROFILES.cinematic;
}
