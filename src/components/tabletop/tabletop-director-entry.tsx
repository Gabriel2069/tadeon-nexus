import "@/lib/tabletop/tabletop-player-runtime";
import { TabletopDirectorWorkspace } from "@/components/tabletop/tabletop-director-workspace";
import { TabletopNativeModelBridge } from "@/components/tabletop/tabletop-native-model-bridge";

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
      <TabletopNativeModelBridge />
    </>
  );
}
