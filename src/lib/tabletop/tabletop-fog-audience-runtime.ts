import {
  TabletopVisibilityService,
  normalizeTabletopFogAudience,
  type TabletopFogAudience,
  type TabletopVisibilityState,
} from "./tabletop-visibility-service";

let currentAudience: TabletopFogAudience = { scope: "global" };

export function setTabletopFogAudience(audience: TabletopFogAudience) {
  currentAudience = normalizeTabletopFogAudience(audience);
}

export function getTabletopFogAudience() {
  return currentAudience;
}

type VisibilityServicePrototype = {
  save(
    this: TabletopVisibilityService,
    sceneId: string,
    state: TabletopVisibilityState,
  ): Promise<unknown>;
};

const runtimeState = globalThis as typeof globalThis & {
  __tadeonFogAudienceRuntimePatched?: boolean;
};

if (!runtimeState.__tadeonFogAudienceRuntimePatched) {
  runtimeState.__tadeonFogAudienceRuntimePatched = true;
  const prototype = TabletopVisibilityService.prototype as unknown as VisibilityServicePrototype;
  const originalSave = prototype.save;
  prototype.save = function saveWithFogAudience(
    this: TabletopVisibilityService,
    sceneId: string,
    state: TabletopVisibilityState,
  ) {
    const nextState: TabletopVisibilityState = {
      ...state,
      fogStrokes: state.fogStrokes.map((stroke) => ({
        ...stroke,
        audience: stroke.audience ?? currentAudience,
      })),
    };
    return originalSave.call(this, sceneId, nextState);
  };
}
