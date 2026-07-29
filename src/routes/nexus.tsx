import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { NexusWorkspace } from "@/components/knowledge/nexus-workspace";
import { ProtectedShell } from "@/components/protected-shell";
import {
  loadFeatureFlags,
} from "@/lib/feature-flag-repository";
import type { FeatureFlags } from "@/lib/feature-flags";

export const Route = createFileRoute("/nexus")({
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
    <NexusWorkspace assetsEnabled={flags.nexus_assets_v2_enabled} />
  );
}
