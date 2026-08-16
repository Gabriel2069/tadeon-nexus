import { Suspense, lazy, useEffect, useState } from "react";

const LocateBridge = lazy(() => import("@/components/tabletop/tabletop-locate-bridge").then((module) => ({ default: module.TabletopLocateBridge })));
const PlayerInteractionBridge = lazy(() => import("@/components/tabletop/tabletop-player-interaction-bridge").then((module) => ({ default: module.TabletopPlayerInteractionBridge })));
const ReliabilityEditorBridge = lazy(() => import("@/components/tabletop/tabletop-reliability-editor-bridge").then((module) => ({ default: module.TabletopReliabilityEditorBridge })));
const AtmosphereBridge = lazy(() => import("@/components/tabletop/tabletop-atmosphere-bridge").then((module) => ({ default: module.TabletopAtmosphereBridge })));
const SpatialAudioBridge = lazy(() => import("@/components/tabletop/tabletop-spatial-audio-bridge").then((module) => ({ default: module.TabletopSpatialAudioBridge })));
const NativeModelBridge = lazy(() => import("@/components/tabletop/tabletop-native-model-bridge").then((module) => ({ default: module.TabletopNativeModelBridge })));
const RoofForegroundBridge = lazy(() => import("@/components/tabletop/tabletop-roof-foreground-bridge").then((module) => ({ default: module.TabletopRoofForegroundBridge })));
const AdaptivePerformanceBridge = lazy(() => import("@/components/tabletop/tabletop-adaptive-performance-bridge").then((module) => ({ default: module.TabletopAdaptivePerformanceBridge })));
const CreativeDockBridge = lazy(() => import("@/components/tabletop/tabletop-creative-dock-bridge").then((module) => ({ default: module.TabletopCreativeDockBridge })));
const FogGeometryBridge = lazy(() => import("@/components/tabletop/tabletop-fog-geometry-bridge").then((module) => ({ default: module.TabletopFogGeometryBridge })));
const PlaceablesInspectorBridge = lazy(() => import("@/components/tabletop/tabletop-placeables-inspector-bridge").then((module) => ({ default: module.TabletopPlaceablesInspectorBridge })));
const IntegrationToolsBridge = lazy(() => import("@/components/tabletop/tabletop-integration-tools-bridge").then((module) => ({ default: module.TabletopIntegrationToolsBridge })));
const NexusCaptureBridge = lazy(() => import("@/components/tabletop/tabletop-nexus-capture-bridge").then((module) => ({ default: module.TabletopNexusCaptureBridge })));
const SemanticTransformBridge = lazy(() => import("@/components/tabletop/tabletop-semantic-transform-bridge").then((module) => ({ default: module.TabletopSemanticTransformBridge })));
const RadialActionsBridge = lazy(() => import("@/components/tabletop/tabletop-radial-actions-bridge").then((module) => ({ default: module.TabletopRadialActionsBridge })));
const SmartSetupBridge = lazy(() => import("@/components/tabletop/tabletop-smart-setup-bridge").then((module) => ({ default: module.TabletopSmartSetupBridge })));

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
      {tier >= 1 && <><LocateBridge /><PlayerInteractionBridge /></>}
      {tier >= 2 && <><ReliabilityEditorBridge /><AtmosphereBridge /><SpatialAudioBridge /><NativeModelBridge secureVisibility={!master} /><RoofForegroundBridge /><AdaptivePerformanceBridge /></>}
      {master && tier >= 3 && (
        <>
          <CreativeDockBridge />
          <FogGeometryBridge />
          <PlaceablesInspectorBridge />
          <IntegrationToolsBridge />
          <NexusCaptureBridge />
          <SemanticTransformBridge />
          <RadialActionsBridge />
          <SmartSetupBridge />
        </>
      )}
    </Suspense>
  );
}
