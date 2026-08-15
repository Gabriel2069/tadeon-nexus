import "@/lib/tabletop/tabletop-player-runtime";
import "@/lib/tabletop/tabletop-advanced-grid-runtime";
import { TabletopWorkspace } from "@/components/tabletop/tabletop-workspace";
import { TabletopDeferredEnhancements } from "@/components/tabletop/tabletop-deferred-enhancements";
import { TabletopProgressiveInterfaceBridge } from "@/components/tabletop/tabletop-progressive-interface-bridge";

export default function TabletopMasterEntry({
  initialSceneId,
  realtimeEnabled,
  lightingEnabled,
}: {
  initialSceneId?: string;
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
      <TabletopProgressiveInterfaceBridge role="mestre" />
      <TabletopDeferredEnhancements master />
    </>
  );
}
