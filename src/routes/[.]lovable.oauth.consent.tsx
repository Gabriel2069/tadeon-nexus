import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/brand-mark";

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
const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Autorizar integração · Tadeon Nexus" },
      {
        name: "description",
        content: "Revise e autorize uma integração segura com o Tadeon Nexus.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id:
      typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id)
      throw new Error("Autorização inválida ou incompleta.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/login", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const { data, error } =
      await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error("Não foi possível carregar esta autorização.");
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: () => (
    <main className="tadeon-consent-page">
      <Card className="tadeon-consent-card max-w-md">
        <BrandMark className="mb-5 h-11 w-11 text-primary" />
        <p className="tadeon-eyebrow">Conexão interrompida</p>
        <h1 className="mb-2 font-cinzel text-2xl text-primary">
          Erro na autorização
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Não foi possível concluir a autorização. Volte ao aplicativo de origem
          e tente novamente.
        </p>
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
    if (error) {
      setBusy(false);
      setError("Não foi possível concluir a autorização.");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Nenhum redirecionamento retornado.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "aplicativo externo";

  return (
    <main className="tadeon-consent-page">
      <div aria-hidden className="tadeon-consent-thread" />
      <Card className="tadeon-consent-card w-full max-w-lg">
        <header className="tadeon-consent-card__header">
          <span className="tadeon-consent-card__mark">
            <BrandMark className="h-8 w-8" />
          </span>
          <div>
            <p className="tadeon-eyebrow">Permissão externa</p>
            <p className="tadeon-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Tadeon Nexus · Conexão segura
            </p>
          </div>
        </header>
        <h1 className="mt-7 font-cinzel text-3xl leading-tight text-primary">
          Conectar {clientName}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{clientName}</strong> passará a
          agir dentro do Tadeon apenas com as permissões já atribuídas à sua
          conta.
        </p>
        <div className="tadeon-consent-scope">
          <ShieldCheck
            aria-hidden
            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          />
          <div>
            <strong className="text-sm text-foreground">
              Limites preservados
            </strong>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Papéis de mestre, jogador ou espectador e as políticas do backend
              continuam sendo aplicados em todas as operações.
            </p>
          </div>
        </div>
        {details?.scope && (
          <div className="tadeon-consent-detail">
            <span>Escopo solicitado</span>
            <code>{details.scope}</code>
          </div>
        )}
        {details?.client?.redirect_uri && (
          <div className="tadeon-consent-detail">
            <span>Retorno autorizado</span>
            <code>{details.client.redirect_uri}</code>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            disabled={busy}
            onClick={() => void decide(true)}
            className="sm:order-2"
          >
            <LockKeyhole aria-hidden className="h-4 w-4" />
            {busy ? "Processando…" : "Autorizar conexão"}
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void decide(false)}
            variant="outline"
            className="sm:order-1"
          >
            Negar e voltar
          </Button>
        </div>
      </Card>
    </main>
  );
}
