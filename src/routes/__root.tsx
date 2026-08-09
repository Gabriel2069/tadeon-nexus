import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegistration } from "@/components/pwa-registration";
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <PageState
      icon={RefreshCw}
      eyebrow="Interrupção no arquivo"
      title="O Nexus perdeu este fio"
      description="Ocorreu um erro inesperado ao montar esta página. Tente reconstruir a visualização; se o problema continuar, volte ao arquivo principal."
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
      {
        name: "tadeon-build-sha",
        content: import.meta.env.VITE_APP_COMMIT_SHA ?? "development",
      },
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
          "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e a árvore de habilidades do seu RPG online com painel para mestres e jogadores.",
      },
      {
        name: "twitter:description",
        content:
          "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e a árvore de habilidades do seu RPG online com painel para mestres e jogadores.",
      },
      { property: "og:site_name", content: "Tadeon Nexus" },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/PVW5PtKIfsZfzEClat2iS5nSbg62/social-images/social-1779415456700-IMG_0562.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/PVW5PtKIfsZfzEClat2iS5nSbg62/social-images/social-1779415456700-IMG_0562.webp",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
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
        <main>
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
        <PwaRegistration />
      </AuthProvider>
    </QueryClientProvider>
  );
}
