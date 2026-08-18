import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, Loader2, RefreshCw, ShieldX } from "lucide-react";
import { can } from "@/lib/permissions";
import { PageState } from "@/components/page-state";
import {
  NexusSheetDragBridge,
  SheetExperienceBridge,
  WorkspacePopoutBridge,
} from "@/components/sheet/sheet-experience-bridge";
import { SheetInventoryOrganizer } from "@/components/sheet/sheet-inventory-organizer";
import { TabletopCrossSurfaceBridge } from "@/components/tabletop/tabletop-cross-surface-bridge";
import { TabletopWorkspacePopoutBridge } from "@/components/tabletop/tabletop-workspace-popout-bridge";
import { MobileMoreRadialBridge } from "@/components/mobile-more-radial-bridge";
import { UserRepair152Bridge } from "@/components/user-repair-152-bridge";
import "@/styles/sheet-requested-polish.css";
import "@/styles/sheet-density-final.css";
import "@/styles/sheet-game-mode.css";
import "@/styles/sheet-game-mode-final.css";
import "@/styles/sheet-inventory-organizer.css";
import "@/styles/nexus-interaction-polish.css";
import "@/styles/user-repair-152.css";
import "@/styles/dedicated-workspace-parity-168.css";

interface Props {
  children: ReactNode;
  requireRole?: "mestre";
}

function dedicatedPresentation() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (
    window.location.pathname === "/tabletop" &&
    params.get("view") === "director"
  ) {
    return "director" as const;
  }
  if (params.get("embed") === "1") return "embed" as const;
  if (params.get("popout") === "1" || params.get("standalone") === "1") {
    return "popout" as const;
  }
  return null;
}

function focusedSection() {
  if (typeof window === "undefined") return "Dashboard";
  const path = window.location.pathname;
  if (path.startsWith("/sheet/")) return "Ficha";
  if (path.startsWith("/nexus-tools")) return "Saúde do arquivo";
  if (path.startsWith("/nexus")) return "O Nexus";
  if (path.startsWith("/tabletop")) return "Mesa Nexus";
  if (path.startsWith("/master-panel")) return "Painel do Mestre";
  if (path.startsWith("/manage-users")) return "Usuários";
  if (path.startsWith("/offline")) return "Consulta offline";
  return "Dashboard";
}

function DedicatedShell({ children, presentation }: { children: ReactNode; presentation: NonNullable<ReturnType<typeof dedicatedPresentation>> }) {
  return (
    <div
      className="tadeon-shell tadeon-dedicated-shell relative isolate min-h-screen overflow-x-clip bg-background text-foreground"
      data-section={focusedSection()}
      data-dedicated-presentation={presentation}
    >
      <div aria-hidden className="tadeon-ambient tadeon-ambient--veil" />
      <div aria-hidden className="tadeon-ambient tadeon-ambient--flow" />
      <main
        id="tadeon-main"
        tabIndex={-1}
        className="tadeon-dedicated-shell__main relative z-10 min-h-screen w-full min-w-0 outline-none"
      >
        {children}
      </main>
    </div>
  );
}

export function ProtectedShell({ children, requireRole }: Props) {
  const { loading, session, role, authIssue, refresh } = useAuth();
  const navigate = useNavigate();
  const dedicated = dedicatedPresentation();

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
    const state = (
      <PageState
        icon={AlertTriangle}
        eyebrow="Sessão preservada"
        title="Perfil indisponível"
        description={authIssue}
        action={
          <Button onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" />Tentar novamente
          </Button>
        }
      />
    );
    return dedicated ? <DedicatedShell presentation={dedicated}>{state}</DedicatedShell> : <AppLayout>{state}</AppLayout>;
  }

  if (requireRole && !can("app:manage", { appRole: role })) {
    const state = (
      <PageState
        icon={ShieldX}
        eyebrow="Limite de permissão"
        title="Acesso negado"
        description="Seu papel atual não permite abrir esta área administrativa. Nenhuma informação foi alterada."
        action={
          <Button onClick={() => void navigate({ to: "/" })}>
            <Home className="h-4 w-4" />Voltar ao dashboard
          </Button>
        }
      />
    );
    return dedicated ? <DedicatedShell presentation={dedicated}>{state}</DedicatedShell> : <AppLayout>{state}</AppLayout>;
  }

  const content = (
    <>
      <SheetExperienceBridge />
      <SheetInventoryOrganizer />
      <TabletopCrossSurfaceBridge />
      <UserRepair152Bridge />
      {!dedicated && (
        <>
          <WorkspacePopoutBridge />
          <TabletopWorkspacePopoutBridge />
          <MobileMoreRadialBridge />
        </>
      )}
      <NexusSheetDragBridge />
      {children}
    </>
  );

  if (dedicated) {
    return <DedicatedShell presentation={dedicated}>{content}</DedicatedShell>;
  }

  return <AppLayout>{content}</AppLayout>;
}
