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

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-cinzel text-7xl font-bold text-primary">404</h1>
        <h2 className="font-cinzel mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">Parece que você se perdeu no nexus.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error; reset: () => void }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-cinzel text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Recarregue a página ou volte ao início.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Voltar ao início
        </a>
      </div>
    </div>
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
