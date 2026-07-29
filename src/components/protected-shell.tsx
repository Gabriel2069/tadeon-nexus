import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { can } from "@/lib/permissions";

interface Props {
  children: ReactNode;
  requireRole?: "mestre";
}

export function ProtectedShell({ children, requireRole }: Props) {
  const { loading, session, role, authIssue, refresh } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      const next =
        typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`;
      void navigate({ to: "/login", search: { next: next === "/" ? "" : next } });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="tadeon-shell flex min-h-screen items-center justify-center">
        <div className="tadeon-loading-mark" role="status" aria-label="Carregando o Tadeon Nexus">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (authIssue) {
    return (
      <AppLayout>
        <div className="tadeon-page flex min-h-[65vh] items-center justify-center">
          <div className="tadeon-surface max-w-lg rounded-2xl p-7 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-[var(--tadeon-flow)]" />
            <h1 className="mt-4 font-cinzel text-2xl font-semibold">Perfil indisponível</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{authIssue}</p>
            <Button className="mt-6 gap-2" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (requireRole && !can("app:manage", { appRole: role })) {
    return (
      <AppLayout>
        <div className="p-8">
          <h1 className="font-cinzel text-2xl font-bold">Acesso Negado</h1>
          <p className="mt-2 text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
