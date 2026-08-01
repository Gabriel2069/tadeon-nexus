import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { TabletopWorkspace } from "@/components/tabletop/tabletop-workspace";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import type { FeatureFlags } from "@/lib/feature-flags";

export const Route = createFileRoute("/tabletop")({
  head: () => ({
    meta: [
      { title: "Mesa Nexus · Tadeon Nexus" },
      {
        name: "description",
        content: "Editor persistente e protegido de cenas da Mesa Nexus.",
      },
    ],
  }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <TabletopRoute />
    </ProtectedShell>
  ),
});

function TabletopRoute() {
  const navigate = useNavigate();
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

  return <TabletopWorkspace />;
}
