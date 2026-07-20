import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Beta auth.oauth namespace — tiny local typed wrapper.
type OAuthDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<OAuthDetails>>;
};
const oauthApi = () =>
  (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Autorização inválida ou incompleta.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error("Não foi possível carregar esta autorização.");
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: () => (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md p-6">
        <h1 className="font-cinzel text-xl text-primary mb-2">Erro na autorização</h1>
        <p className="text-sm text-muted-foreground">Não foi possível concluir a autorização. Tente novamente.</p>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError("Não foi possível concluir a autorização."); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("Nenhum redirecionamento retornado."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "aplicativo externo";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-card/80 backdrop-blur border-border">
        <h1 className="font-cinzel text-2xl text-primary mb-2">
          Conectar {clientName} à sua conta
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Isto permite que <strong>{clientName}</strong> use o Tadeon Nexus como você,
          acessando somente o que suas permissões (mestre/jogador/espectador) já permitem.
        </p>
        {details?.client?.redirect_uri && (
          <p className="text-xs text-muted-foreground mb-4 break-all">
            Redirecionamento: <code>{details.client.redirect_uri}</code>
          </p>
        )}
        <p className="text-xs text-muted-foreground mb-6">
          Isto não contorna as políticas de acesso do backend.
        </p>
        {error && <p role="alert" className="text-sm text-destructive mb-3">{error}</p>}
        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => decide(true)} className="flex-1">
            Aprovar
          </Button>
          <Button disabled={busy} onClick={() => decide(false)} variant="outline" className="flex-1">
            Cancelar
          </Button>
        </div>
      </Card>
    </main>
  );
}
