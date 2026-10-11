import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { NexusWorkspace } from "@/components/knowledge/nexus-workspace";
import { NexusFolderBarBridge } from "@/components/knowledge/nexus-folder-bar-bridge";
import { NexusTabletopLocator } from "@/components/knowledge/nexus-tabletop-locator";
import { ProtectedShell } from "@/components/protected-shell";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import type { FeatureFlags } from "@/lib/feature-flags";

export const Route = createFileRoute("/nexus")({
  validateSearch: (search: Record<string, unknown>) => ({
    node:
      typeof search.node === "string" && search.node.length <= 100
        ? search.node
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "O Nexus · Tadeon Nexus" },
      {
        name: "description",
        content:
          "Arquivo vivo de conhecimento, continuidade e relações do Tadeon Nexus.",
      },
    ],
  }),
  component: () => (
    <ProtectedShell>
      <NexusRoute />
    </ProtectedShell>
  ),
});

function NexusRoute() {
  const navigate = useNavigate();
  const { node } = Route.useSearch();
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
    if (flags && !flags.nexus_knowledge_enabled) {
      void navigate({ to: "/", replace: true });
    }
  }, [flags, navigate]);

  if (!flags?.nexus_knowledge_enabled) {
    return (
      <div
        className="flex min-h-[70vh] items-center justify-center"
        role="status"
        aria-label="Carregando O Nexus"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <NexusWorkspace
        assetsEnabled={flags.nexus_assets_v2_enabled}
        graphEnabled={flags.nexus_graph_enabled}
        initialNodeId={node}
      />
      <NexusFolderBarBridge />
      {flags.nexus_tabletop_enabled && <NexusTabletopLocator nodeId={node} />}
    </>
  );
}
