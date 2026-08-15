import { Suspense, lazy, useEffect, useState } from "react";

const LocateBridge = lazy(() =>
  import("@/components/tabletop/tabletop-locate-bridge").then((module) => ({
    default: module.TabletopLocateBridge,
  })),
);
const PlayerInteractionBridge = lazy(() =>
  import("@/components/tabletop/tabletop-player-interaction-bridge").then((module) => ({
    default: module.TabletopPlayerInteractionBridge,
  })),
);
const ReliabilityEditorBridge = lazy(() =>
  import("@/components/tabletop/tabletop-reliability-editor-bridge").then((module) => ({
    default: module.TabletopReliabilityEditorBridge,
  })),
);
const AtmosphereBridge = lazy(() =>
  import("@/components/tabletop/tabletop-atmosphere-bridge").then((module) => ({
    default: module.TabletopAtmosphereBridge,
  })),
);
const CreativeDockBridge = lazy(() =>
  import("@/components/tabletop/tabletop-creative-dock-bridge").then((module) => ({
    default: module.TabletopCreativeDockBridge,
  })),
);
const DirectorEnhancementBridge = lazy(() =>
  import("@/components/tabletop/tabletop-director-enhancement-bridge").then((module) => ({
    default: module.TabletopDirectorEnhancementBridge,
  })),
);
const PlaceablesInspectorBridge = lazy(() =>
  import("@/components/tabletop/tabletop-placeables-inspector-bridge").then((module) => ({
    default: module.TabletopPlaceablesInspectorBridge,
  })),
);
const IntegrationToolsBridge = lazy(() =>
  import("@/components/tabletop/tabletop-integration-tools-bridge").then((module) => ({
    default: module.TabletopIntegrationToolsBridge,
  })),
);
const SemanticTransformBridge = lazy(() =>
  import("@/components/tabletop/tabletop-semantic-transform-bridge").then((module) => ({
    default: module.TabletopSemanticTransformBridge,
  })),
);

export function TabletopDeferredEnhancements({ master }: { master: boolean }) {
  const [tier, setTier] = useState(0);

  useEffect(() => {
    let alive = true;
    const first = window.setTimeout(() => alive && setTier(1), 80);
    const second = window.setTimeout(() => alive && setTier(2), 520);
    const third = window.setTimeout(() => alive && setTier(3), 1150);
    return () => {
      alive = false;
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(third);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      {tier >= 1 && (
        <>
          <LocateBridge />
          <PlayerInteractionBridge />
        </>
      )}
      {tier >= 2 && (
        <>
          <ReliabilityEditorBridge />
          <AtmosphereBridge />
        </>
      )}
      {master && tier >= 3 && (
        <>
          <CreativeDockBridge />
          <DirectorEnhancementBridge />
          <PlaceablesInspectorBridge />
          <IntegrationToolsBridge />
          <SemanticTransformBridge />
        </>
      )}
    </Suspense>
  );
}
