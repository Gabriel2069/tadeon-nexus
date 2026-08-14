import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, Loader2, RefreshCw, ShieldX } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageState } from "@/components/page-state";
import {
  SheetExperienceBridge,
  WorkspacePopoutBridge,
} from "@/components/sheet/sheet-experience-bridge";
import "@/styles/sheet-requested-polish.css";
import "@/styles/sheet-density-final.css";
import "@/styles/sheet-game-mode.css";
import "@/styles/nexus-interaction-polish.css";

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
        typeof window === "undefined"
          ? ""
          : `${window.location.pathname}${window.location.search}`;
      void navigate({
        to: "/login",
        search: { next: next === "/" ? "" : next },
      });
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
        <PageState icon={AlertTriangle} eyebrow="Sessão preservada" title="Perfil indisponível" description={authIssue} action={<Button onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />Tentar novamente</Button>} />
      </AppLayout>
    );
  }

  if (requireRole && !can("app:manage", { appRole: role })) {
    return (
      <AppLayout>
        <PageState icon={ShieldX} eyebrow="Limite de permissão" title="Acesso negado" description="Seu papel atual não permite abrir esta área administrativa. Nenhuma informação foi alterada." action={<Button onClick={() => void navigate({ to: "/" })}><Home className="h-4 w-4" />Voltar ao dashboard</Button>} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SheetExperienceBridge />
      <WorkspacePopoutBridge />
      {children}
    </AppLayout>
  );
}
