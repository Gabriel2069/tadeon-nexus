import type { TabletopQualityProfile } from "./tabletop-adaptive-performance";
import {
  sampleTabletopGpuVisibilityField,
  type TabletopGpuVisibilityField,
} from "./tabletop-gpu-visibility-field";
import type { TabletopEntity, TabletopScene } from "./types";

export type TabletopEntityLod = "full" | "reduced" | "shell" | "dormant";

export interface TabletopStreamingViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX?: number;
  velocityY?: number;
}

export interface TabletopStreamingEntry {
  entityId: string;
  lod: TabletopEntityLod;
  priority: number;
  visibility: number;
  distance: number;
  assetUrl?: string;
}

export interface TabletopStreamingPlan {
  sceneId: string;
  generatedAt: number;
  viewport: TabletopStreamingViewport;
  entries: TabletopStreamingEntry[];
  activeEntityIds: string[];
  preloadAssetUrls: string[];
  dormantEntityIds: string[];
  fingerprint: string;
}

function distanceToRect(entity: TabletopEntity, viewport: TabletopStreamingViewport) {
  const cx = entity.x + entity.width / 2;
  const cy = entity.y + entity.height / 2;
  const dx = Math.max(viewport.x - cx, 0, cx - (viewport.x + viewport.width));
  const dy = Math.max(viewport.y - cy, 0, cy - (viewport.y + viewport.height));
  return Math.hypot(dx, dy);
}

function intersectsExpandedViewport(
  entity: TabletopEntity,
  viewport: TabletopStreamingViewport,
  margin: number,
) {
  return !(
    entity.x + entity.width < viewport.x - margin ||
    entity.y + entity.height < viewport.y - margin ||
    entity.x > viewport.x + viewport.width + margin ||
    entity.y > viewport.y + viewport.height + margin
  );
}

function tierFactor(profile: TabletopQualityProfile) {
  if (profile.tier === "cinematic") return 1.55;
  if (profile.tier === "high") return 1.3;
  if (profile.tier === "balanced") return 1;
  return 0.72;
}

export function buildTabletopStreamingPlan(
  scene: TabletopScene,
  viewport: TabletopStreamingViewport,
  profile: TabletopQualityProfile,
  visibilityField?: TabletopGpuVisibilityField | null,
): TabletopStreamingPlan {
  const factor = tierFactor(profile);
  const span = Math.max(viewport.width, viewport.height, scene.gridSize * 6);
  const speed = Math.hypot(viewport.velocityX ?? 0, viewport.velocityY ?? 0);
  const preloadMargin = span * (0.42 + factor * 0.28) + Math.min(span, speed * 0.35);
  const shellMargin = span * (1.05 + factor * 0.38);
  const entries = scene.entities.map((entity): TabletopStreamingEntry => {
    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y + entity.height / 2;
    const visibility = visibilityField
      ? sampleTabletopGpuVisibilityField(visibilityField, centerX, centerY)
      : 1;
    const distance = distanceToRect(entity, viewport);
    const inView = intersectsExpandedViewport(entity, viewport, 0);
    const near = intersectsExpandedViewport(entity, viewport, preloadMargin);
    const shell = intersectsExpandedViewport(entity, viewport, shellMargin);
    let lod: TabletopEntityLod;
    if (entity.hidden || visibility <= 0.015) lod = "dormant";
    else if (inView) lod = "full";
    else if (near) lod = profile.tier === "economy" ? "shell" : "reduced";
    else if (shell) lod = "shell";
    else lod = "dormant";
    const areaBoost = Math.min(1, (entity.width * entity.height) / Math.max(1, scene.gridSize ** 2 * 6));
    const priority =
      lod === "full"
        ? 1
        : lod === "reduced"
          ? 0.7
          : lod === "shell"
            ? 0.34
            : 0.02;
    return {
      entityId: entity.id,
      lod,
      priority: Math.max(0, Math.min(1, priority * (0.72 + visibility * 0.24 + areaBoost * 0.04))),
      visibility,
      distance,
      assetUrl: entity.assetUrl,
    };
  });

  entries.sort((left, right) => right.priority - left.priority || left.distance - right.distance);
  const activeEntityIds = entries
    .filter((entry) => entry.lod === "full" || entry.lod === "reduced")
    .map((entry) => entry.entityId);
  const dormantEntityIds = entries
    .filter((entry) => entry.lod === "dormant")
    .map((entry) => entry.entityId);
  const preloadLimit = profile.tier === "cinematic" ? 120 : profile.tier === "high" ? 84 : profile.tier === "balanced" ? 56 : 28;
  const preloadAssetUrls = [
    ...new Set(
      entries
        .filter((entry) => entry.lod !== "dormant" && entry.assetUrl)
        .slice(0, preloadLimit)
        .map((entry) => entry.assetUrl as string),
    ),
  ];
  const fingerprint = [
    scene.id,
    Math.round(viewport.x / 24),
    Math.round(viewport.y / 24),
    Math.round(viewport.width / 24),
    Math.round(viewport.height / 24),
    profile.tier,
    visibilityField?.fingerprint ?? "no-field",
    activeEntityIds.join(","),
  ].join("::");
  return {
    sceneId: scene.id,
    generatedAt: performance.now(),
    viewport,
    entries,
    activeEntityIds,
    preloadAssetUrls,
    dormantEntityIds,
    fingerprint,
  };
}

export function filterSceneForTabletopStreaming(
  scene: TabletopScene,
  plan: TabletopStreamingPlan | null | undefined,
) {
  if (!plan || plan.sceneId !== scene.id) return scene;
  const active = new Set(
    plan.entries
      .filter((entry) => entry.lod !== "dormant")
      .map((entry) => entry.entityId),
  );
  return {
    ...scene,
    entities: scene.entities.filter((entity) => active.has(entity.id)),
  };
}
