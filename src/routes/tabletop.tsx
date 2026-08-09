import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { TabletopWorkspace } from "@/components/tabletop/tabletop-workspace";
import { TabletopParticipantWorkspace } from "@/components/tabletop/tabletop-participant-workspace";
import { TabletopDirectorWorkspace } from "@/components/tabletop/tabletop-director-workspace";
import { useAuth } from "@/lib/auth";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import type { FeatureFlags } from "@/lib/feature-flags";

export const Route = createFileRoute("/tabletop")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "director" ? ("director" as const) : undefined,
    session:
      typeof search.session === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        search.session,
      )
        ? search.session
        : undefined,
  }),
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
  const search = Route.useSearch();
  const { role } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    let active = true;
    void loadFeatureFlags().then((nextFlags) => {
      if (active) setFlags(nextFlags);
    });
    return () => {
      active = false;
    };
  }, []);

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

  if (role === "mestre" && search.view === "director") {
    return (
      <TabletopDirectorWorkspace
        sessionId={search.session}
        realtimeEnabled={flags.nexus_realtime_enabled}
      />
    );
  }

  return role === "mestre" ? (
    <TabletopWorkspace
      realtimeEnabled={flags.nexus_realtime_enabled}
      lightingEnabled={flags.nexus_lighting_enabled}
    />
  ) : (
    <TabletopParticipantWorkspace
      realtimeEnabled={flags.nexus_realtime_enabled}
    />
  );
}
