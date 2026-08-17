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

/* Resolution is the last lever we sacrifice. The previous ladder still pushed
   dense 3x mobile/tablet displays to 2x/1.6x and made zoom/projection visibly
   soft. Effects, model complexity and cache budget degrade first; even economy
   keeps a 2x backing canvas when the hardware DPR supports it. */
const PROFILES: Record<TabletopQualityTier, TabletopQualityProfile> = {
  cinematic: {
    tier: "cinematic",
    maxResolution: 3,
    nativeModels: true,
    effects: "full",
    textureBudgetMb: 512,
  },
  high: {
    tier: "high",
    maxResolution: 3,
    nativeModels: true,
    effects: "full",
    textureBudgetMb: 384,
  },
  balanced: {
    tier: "balanced",
    maxResolution: 2.5,
    nativeModels: true,
    effects: "reduced",
    textureBudgetMb: 256,
  },
  economy: {
    tier: "economy",
    maxResolution: 2,
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
  if (sample.fps < 57 || sample.coarsePointer || sample.devicePixelRatio > 3) return PROFILES.high;
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
