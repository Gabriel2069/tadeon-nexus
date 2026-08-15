import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { TabletopWorkspace } from "@/components/tabletop/tabletop-workspace";
import { TabletopParticipantWorkspace } from "@/components/tabletop/tabletop-participant-workspace";
import { TabletopDirectorWorkspace } from "@/components/tabletop/tabletop-director-workspace";
import { TabletopPlayerInteractionBridge } from "@/components/tabletop/tabletop-player-interaction-bridge";
import { TabletopReliabilityEditorBridge } from "@/components/tabletop/tabletop-reliability-editor-bridge";
import { TabletopAtmosphereBridge } from "@/components/tabletop/tabletop-atmosphere-bridge";
import { TabletopCreativeDockBridge } from "@/components/tabletop/tabletop-creative-dock-bridge";
import { TabletopDirectorEnhancementBridge } from "@/components/tabletop/tabletop-director-enhancement-bridge";
import { TabletopPlaceablesInspectorBridge } from "@/components/tabletop/tabletop-placeables-inspector-bridge";
import { TabletopIntegrationToolsBridge } from "@/components/tabletop/tabletop-integration-tools-bridge";
import { TabletopLocateBridge } from "@/components/tabletop/tabletop-locate-bridge";
import { TabletopSemanticTransformBridge } from "@/components/tabletop/tabletop-semantic-transform-bridge";
import { useAuth } from "@/lib/auth";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import type { FeatureFlags } from "@/lib/feature-flags";
import "@/lib/tabletop/tabletop-advanced-grid-runtime";
import "@/lib/tabletop/tabletop-player-runtime";

export const Route = createFileRoute("/tabletop")({
  head: () => ({
    meta: [
      { title: "Mesa Nexus · Tadeon Nexus" },
      {
        name: "description",
        content:
          "Mesa virtual ao vivo com visão protegida por papel e campanha.",
      },
    ],
  }),
  component: () => (
    <ProtectedShell>
      <TabletopRoute />
    </ProtectedShell>
  ),
});

function TabletopRoute() {
  const navigate = useNavigate();
  const search = Route.useSearch() as {
    view?: string;
    session?: string;
    scene?: string;
  };
  const { role, user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void loadFeatureFlags(user.id).then((nextFlags) => {
      if (active) setFlags(nextFlags);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (flags && !flags.nexus_tabletop_enabled)
      void navigate({ to: "/", replace: true });
  }, [flags, navigate]);

  if (!flags?.nexus_tabletop_enabled) {
    return (
      <div
        className="flex min-h-[70vh] items-center justify-center"
        role="status"
        aria-label="Carregando Mesa Nexus"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const directorSession =
    typeof search.session === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      search.session,
    )
      ? search.session
      : undefined;
  const requestedScene =
    typeof search.scene === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      search.scene,
    )
      ? search.scene
      : undefined;

  if (role === "mestre" && search.view === "director") {
    return (
      <TabletopDirectorWorkspace
        sessionId={directorSession}
        realtimeEnabled={flags.nexus_realtime_enabled}
      />
    );
  }

  return (
    <>
      <TabletopLocateBridge />
      <TabletopPlayerInteractionBridge />
      <TabletopReliabilityEditorBridge />
      <TabletopAtmosphereBridge />
      {role === "mestre" ? (
        <>
          <TabletopCreativeDockBridge />
          <TabletopDirectorEnhancementBridge />
          <TabletopPlaceablesInspectorBridge />
          <TabletopIntegrationToolsBridge />
          <TabletopSemanticTransformBridge />
          <TabletopWorkspace
            initialSceneId={requestedScene}
            realtimeEnabled={flags.nexus_realtime_enabled}
            lightingEnabled={flags.nexus_lighting_enabled}
          />
        </>
      ) : (
        <TabletopParticipantWorkspace
          realtimeEnabled={flags.nexus_realtime_enabled}
        />
      )}
    </>
  );
}
