import "@/lib/tabletop/tabletop-player-runtime";
import { TabletopParticipantWorkspace } from "@/components/tabletop/tabletop-participant-workspace";
import { TabletopDeferredEnhancements } from "@/components/tabletop/tabletop-deferred-enhancements";

export default function TabletopParticipantEntry({
  realtimeEnabled,
}: {
  realtimeEnabled: boolean;
}) {
  return (
    <>
      <TabletopParticipantWorkspace realtimeEnabled={realtimeEnabled} />
      <TabletopDeferredEnhancements master={false} />
    </>
  );
}
