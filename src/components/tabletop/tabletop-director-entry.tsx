import "@/lib/tabletop/tabletop-player-runtime";
import { TabletopDirectorWorkspace } from "@/components/tabletop/tabletop-director-workspace";
import { TabletopProgressiveInterfaceBridge } from "@/components/tabletop/tabletop-progressive-interface-bridge";

export default function TabletopDirectorEntry({
  sessionId,
  realtimeEnabled,
}: {
  sessionId?: string;
  realtimeEnabled: boolean;
}) {
  return (
    <>
      <TabletopDirectorWorkspace sessionId={sessionId} realtimeEnabled={realtimeEnabled} />
      <TabletopProgressiveInterfaceBridge role="mestre" />
    </>
  );
}
