import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { TabletopRouteExperience } from "@/components/tabletop/tabletop-route-experience";
import { useAuth } from "@/lib/auth";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from "@/lib/feature-flags";

export const Route = createFileRoute("/tabletop")({
  head: () => ({
    meta: [
      { title: "Mesa Nexus · Tadeon Nexus" },
      {
        name: "description",
        content: "Mesa virtual ao vivo com visão protegida por papel e campanha.",
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
  const search = Route.useSearch() as {
    view?: string;
    session?: string;
    scene?: string;
  };
  const { role, user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlags>(() => ({
    ...DEFAULT_FEATURE_FLAGS,
    // A Mesa é uma superfície principal e precisa conseguir abrir mesmo quando
    // a leitura remota de flags estiver lenta ou indisponível. Os módulos
    // opcionais continuam obedecendo às flags carregadas depois.
    nexus_tabletop_enabled: true,
  }));

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    void loadFeatureFlags(user.id)
      .then((nextFlags) => {
        if (!active) return;
        setFlags({ ...nextFlags, nexus_tabletop_enabled: true });
      })
      .catch(() => {
        // Abertura degradável: mantém o canvas essencial e os módulos opcionais
        // desligados com os defaults em vez de transformar uma falha de flags
        // numa tela que nunca termina de abrir.
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

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

  return (
    <TabletopRouteExperience
      role={role}
      flags={flags}
      initialSceneId={requestedScene}
      directorSession={directorSession}
      directorMode={role === "mestre" && search.view === "director"}
    />
  );
}
