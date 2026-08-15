import "@/lib/tabletop/tabletop-player-runtime";
import { TabletopParticipantWorkspace } from "@/components/tabletop/tabletop-participant-workspace";
import { TabletopDeferredEnhancements } from "@/components/tabletop/tabletop-deferred-enhancements";
import { TabletopProgressiveInterfaceBridge } from "@/components/tabletop/tabletop-progressive-interface-bridge";

export default function TabletopParticipantEntry({
  realtimeEnabled,
}: {
  realtimeEnabled: boolean;
}) {
  return (
    <>
      <TabletopParticipantWorkspace realtimeEnabled={realtimeEnabled} />
      <TabletopProgressiveInterfaceBridge role="jogador" />
      <TabletopDeferredEnhancements master={false} />
    </>
  );
}
