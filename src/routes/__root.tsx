import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import mobileCss from "@/styles/responsive-shell.css?url";
import viewportCss from "@/styles/viewport.css?url";
import auditCss from "@/styles/interface-layout.css?url";

import tabletopMapChromeRepairCss from "@/styles/tabletop-chrome.css?url";
import userRepair152Css from "@/styles/layout-compatibility.css?url";
import mobileProductRepair153Css from "@/styles/route-layout.css?url";

import heroIconsFinal212Css from "@/styles/experience-surfaces.css?url";

import nexusMaterialCss from "@/styles/nexus-material.css?url";
import visibleUpgradeCss from "@/styles/motion-foundation.css?url";

import visibleMotionCss from "@/styles/motion-interactions.css?url";

import detailMotionRefinementCss from "@/styles/motion-composition.css?url";

import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegistration } from "@/components/pwa-registration";
import { ExperienceFinalPolishBridge } from "@/components/experience-final-polish-bridge";
import "@/styles/page-hero-parity.css";
import { RouteFavicon } from "@/components/route-favicon";
import { VisualViewportPopupBridge } from "@/components/visual-viewport-popup-bridge";
import { TabletopFinalInteractionBridge } from "@/components/tabletop/tabletop-final-interaction-bridge";
import { TadeonExperienceDirector } from "@/components/tadeon-experience-director";
import { useEffect } from "react";
import { initializeClientErrorMonitor } from "@/lib/client-error-monitor";
import { PageState } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Compass, Home, RefreshCw } from "lucide-react";

function NotFoundComponent() {
  return (
    <PageState
      icon={Compass}
      eyebrow="Fio não localizado · 404"
      title="Esta página não faz parte do arquivo"
      description="O endereço pode ter mudado ou o fio que trouxe você até aqui já não existe. Retorne ao arquivo principal para continuar."
      className="min-h-screen"
      action={
        <Button asChild>
          <Link to="/">
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </Button>
      }
    />
  );
}
function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  return (
    <PageState
      icon={RefreshCw}
      eyebrow="Interrupção no arquivo"
      title="O Tadeon perdeu este fio"
      description="Ocorreu um erro inesperado ao montar esta página. Tente reconstruir a visualização; se o problema continuar, volte ao arquivo principal para continuar."
      className="min-h-screen"
      action={
        <>
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
        </>
      }
    />
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#74242d" },
      { name: "application-name", content: "Tadeon Nexus" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Nexus" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "tadeon-build-sha", content: import.meta.env.VITE_APP_COMMIT_SHA ?? "development" },
      { title: "Tadeon Nexus - RPG Online" },
      {
        name: "description",
        content:
          "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e a árvore de habilidades do seu RPG online com painel para mestres e jogadores.",
      },
      { property: "og:title", content: "Tadeon Nexus - RPG Online" },
      { name: "twitter:title", content: "Tadeon Nexus - RPG Online" },
      {
        property: "og:description",
        content:
          "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e o progresso do seu RPG online.",
      },
      {
        name: "twitter:description",
        content:
          "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e o progresso do seu RPG online.",
      },
      { property: "og:site_name", content: "Tadeon Nexus" },
      {
        property: "og:image",
        content: "https://tadeon-nexus.gtadeusz.workers.dev/social-card.png",
      },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: mobileCss },
      { rel: "stylesheet", href: viewportCss },
      { rel: "stylesheet", href: auditCss },
      { rel: "stylesheet", href: tabletopMapChromeRepairCss },
      { rel: "stylesheet", href: userRepair152Css },
      { rel: "stylesheet", href: mobileProductRepair153Css },
      { rel: "stylesheet", href: heroIconsFinal212Css },
      { rel: "stylesheet", href: nexusMaterialCss },
      { rel: "stylesheet", href: visibleUpgradeCss },
      { rel: "stylesheet", href: visibleMotionCss },
      { rel: "stylesheet", href: detailMotionRefinementCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.svg?v=5", type: "image/svg+xml", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=PT+Mono&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => initializeClientErrorMonitor(), []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <RouteFavicon />
        <VisualViewportPopupBridge />
        <ExperienceFinalPolishBridge />
        <TabletopFinalInteractionBridge />
        <TadeonExperienceDirector />
        <Toaster position="top-right" />
        <PwaRegistration />
      </AuthProvider>
    </QueryClientProvider>
  );
}
