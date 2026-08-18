import "@/lib/tabletop/tabletop-player-runtime";
import "@/lib/tabletop/tabletop-advanced-grid-runtime";
import { TabletopWorkspace } from "@/components/tabletop/tabletop-workspace";
import { TabletopDeferredEnhancements } from "@/components/tabletop/tabletop-deferred-enhancements";
import { TabletopDeepLinkLocatorBridge } from "@/components/tabletop/tabletop-deep-link-locator-bridge";
import { TabletopProgressiveInterfaceBridge } from "@/components/tabletop/tabletop-progressive-interface-bridge";
import { TabletopUrgentReconciliationBridge } from "@/components/tabletop/tabletop-urgent-reconciliation-bridge";

export default function TabletopMasterEntry({
  initialSceneId,
  locateEntityId,
  realtimeEnabled,
  lightingEnabled,
}: {
  initialSceneId?: string;
  locateEntityId?: string;
  realtimeEnabled: boolean;
  lightingEnabled: boolean;
}) {
  return (
    <>
      <TabletopWorkspace
        initialSceneId={initialSceneId}
        realtimeEnabled={realtimeEnabled}
        lightingEnabled={lightingEnabled}
      />
      <TabletopDeepLinkLocatorBridge entityId={locateEntityId} />
      <TabletopProgressiveInterfaceBridge role="mestre" />
      <TabletopUrgentReconciliationBridge />
      <TabletopDeferredEnhancements master />
    </>
  );
}
