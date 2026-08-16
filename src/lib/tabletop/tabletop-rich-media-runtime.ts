import type { Container } from "pixi.js";
import { EntityRenderer } from "./entity-renderer";
import { tabletopMediaKind } from "./tabletop-media";
import type { TabletopEntity } from "./types";

type RendererPrototype = {
  syncAsset(display: Container, entity: TabletopEntity): void;
};

const runtimeState = globalThis as typeof globalThis & {
  __tadeonRichMediaRuntimePatched?: boolean;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

if (!runtimeState.__tadeonRichMediaRuntimePatched) {
  runtimeState.__tadeonRichMediaRuntimePatched = true;
  const prototype = EntityRenderer.prototype as unknown as RendererPrototype;
  const originalSyncAsset = prototype.syncAsset;

  prototype.syncAsset = function syncRichMedia(
    this: EntityRenderer,
    display: Container,
    entity: TabletopEntity,
  ) {
    const properties = objectValue(entity.properties);
    const kind = tabletopMediaKind(properties.mime_type, entity.assetUrl);
    if (kind === "audio" || kind === "model") {
      // Audio and GLTF/GLB are intentionally handled by dedicated runtime layers.
      // Feeding them to Pixi Assets.load<Texture> produces decoder errors and can
      // leave a stale sprite attached to the entity. Calling the original path
      // with no visual URL clears that sprite while preserving the asset contract.
      originalSyncAsset.call(this, display, { ...entity, assetUrl: undefined });
      return;
    }
    originalSyncAsset.call(this, display, entity);
  };
}

export {};
