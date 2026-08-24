import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import mobileCss from "../styles/mobile-studio.css?url";
import viewportCss from "../styles/viewport-fit-final.css?url";
import auditCss from "../styles/interface-audit-final.css?url";
import radialPresenceCss from "../styles/radial-presence-final.css?url";
import reconciliationCss from "../styles/interface-reconciliation-final.css?url";
import finalPolishCss from "../styles/interface-final-user-polish.css?url";
import selectionDirectorEntryCss from "../styles/selection-director-entry-polish.css?url";
import urgentReconciliationCss from "../styles/urgent-user-reconciliation.css?url";
import tabletopMapChromeRepairCss from "../styles/tabletop-map-chrome-repair.css?url";
import userRepair152Css from "../styles/user-repair-152.css?url";
import mobileProductRepair153Css from "../styles/mobile-product-repair-153.css?url";
import finalDeviceParity154Css from "../styles/final-device-parity-154.css?url";
import finalDeviceParity154CompatCss from "../styles/final-device-parity-154-compat.css?url";
import userVisibleRepair156Css from "../styles/user-visible-repair-156.css?url";
import finalVisualSystem157Css from "../styles/final-visual-system-157.css?url";
import mobilePopupMasterHead158Css from "../styles/mobile-popup-master-head-158.css?url";
import focusHeaderNavParity159Css from "../styles/focus-header-nav-parity-159.css?url";
import navigationRealSvgParity160Css from "../styles/navigation-real-svg-parity-160.css?url";
import sheetPopupGraphPolish161Css from "../styles/sheet-popup-graph-polish-161.css?url";
import navSheetSearchPolish162Css from "../styles/nav-sheet-search-polish-162.css?url";
import createSheetSearchViewport163Css from "../styles/create-sheet-search-viewport-163.css?url";
import desktopHeroParity202Css from "../styles/desktop-hero-parity-202.css?url";
import heroIconsFinal212Css from "../styles/hero-icons-final-212.css?url";
import experienceOrchestrationCss from "../styles/tadeon-experience-orchestration.css?url";
import experienceStabilizationCss from "../styles/tadeon-experience-stabilization.css?url";
import experienceRuntimeCss from "../styles/tadeon-experience-runtime.css?url";
import experienceMaterialsCss from "../styles/tadeon-materials-final.css?url";
import experienceMobileCss from "../styles/tadeon-mobile-excellence.css?url";
import experienceDetailsCss from "../styles/tadeon-experience-details.css?url";
import commandExperienceCss from "../styles/tadeon-command-experience.css?url";
import nexusMaterialCss from "../styles/tadeon-nexus-material.css?url";
import visibleUpgradeCss from "../styles/tadeon-visible-upgrade.css?url";
import atmosphereCss from "../styles/tadeon-atmosphere.css?url";
import interactionPassCss from "../styles/tadeon-interaction-pass.css?url";
import headMicroanimationsCss from "../styles/tadeon-head-microanimations.css?url";
import motionSystemCss from "../styles/tadeon-motion-system.css?url";
import contextualMotionCss from "../styles/tadeon-contextual-motion.css?url";
import popupMotionCss from "../styles/tadeon-popup-motion.css?url";
import uiDetailMotionCss from "../styles/tadeon-ui-detail-motion.css?url";
import libraryLayoutRestoreCss from "../styles/tadeon-library-layout-restore.css?url";
import continuityMotionCss from "../styles/tadeon-continuity-motion.css?url";
import premiumMotionCss from "../styles/tadeon-premium-motion.css?url";
import relationalMotionCss from "../styles/tadeon-relational-motion.css?url";
import visibleMotionCss from "../styles/tadeon-visible-motion.css?url";
import personalityMotionCss from "../styles/tadeon-personality-motion.css?url";
import sectionPersonalityMotionCss from "../styles/tadeon-section-personality-motion.css?url";
import actualUiMotionCss from "../styles/tadeon-actual-ui-motion.css?url";
import frameRefinementMotionCss from "../styles/tadeon-frame-refinement-motion.css?url";
import completeInteractionMotionCss from "../styles/tadeon-complete-interaction-motion.css?url";
import deepInteractionMotionCss from "../styles/tadeon-deep-interaction-motion.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegistration } from "@/components/pwa-registration";
import { ExperienceFinalPolishBridge } from "@/components/experience-final-polish-bridge";
import { PageHeroParityBridge } from "@/components/page-hero-parity-bridge";
import { RouteFavicon } from "@/components/route-favicon";
import { VisualViewportPopupBridge } from "@/components/visual-viewport-popup-bridge";
import { TabletopFinalInteractionBridge } from "@/components/tabletop/tabletop-final-interaction-bridge";
import { TadeonExperienceDirector } from "@/components/tadeon-experience-director";
import { useEffect } from "react";
import { initializeClientErrorMonitor } from "@/lib/client-error-monitor";
import { PageState } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Compass, Home, RefreshCw } from "lucide-react";

function NotFoundComponent() { return <PageState icon={Compass} eyebrow="Fio não localizado · 404" title="Esta página não faz parte do arquivo" description="O endereço pode ter mudado ou o fio que trouxe você até aqui já não existe. Retorne ao arquivo principal para continuar." className="min-h-screen" action={<Button asChild><Link to="/"><Home className="h-4 w-4" />Voltar ao início</Link></Button>} />; }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); return <PageState icon={RefreshCw} eyebrow="Interrupção no arquivo" title="O Tadeon perdeu este fio" description="Ocorreu um erro inesperado ao montar esta página. Tente reconstruir a visualização; se o problema continuar, volte ao arquivo principal para continuar." className="min-h-screen" action={<><Button onClick={reset}><RefreshCw className="h-4 w-4" />Tentar novamente</Button><Button asChild variant="outline"><Link to="/"><Home className="h-4 w-4" />Voltar ao início</Link></Button></>} />; }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#74242d" }, { name: "application-name", content: "Tadeon Nexus" },
      { name: "apple-mobile-web-app-capable", content: "yes" }, { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Nexus" }, { name: "mobile-web-app-capable", content: "yes" },
      { name: "tadeon-build-sha", content: import.meta.env.VITE_APP_COMMIT_SHA ?? "development" }, { title: "Tadeon Nexus - RPG Online" },
      { name: "description", content: "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e a árvore de habilidades do seu RPG online com painel para mestres e jogadores." },
      { property: "og:title", content: "Tadeon Nexus - RPG Online" }, { name: "twitter:title", content: "Tadeon Nexus - RPG Online" },
      { property: "og:description", content: "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e o progresso do seu RPG online." }, { name: "twitter:description", content: "Tadeon Nexus: gerencie fichas de personagem, atributos, perícias e o progresso do seu RPG online." },
      { property: "og:site_name", content: "Tadeon Nexus" }, { property: "og:image", content: "https://tadeon-nexus.gtadeusz.workers.dev/social-card.png" },
      { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: mobileCss }, { rel: "stylesheet", href: viewportCss },
      { rel: "stylesheet", href: auditCss }, { rel: "stylesheet", href: radialPresenceCss }, { rel: "stylesheet", href: reconciliationCss },
      { rel: "stylesheet", href: finalPolishCss }, { rel: "stylesheet", href: selectionDirectorEntryCss }, { rel: "stylesheet", href: urgentReconciliationCss },
      { rel: "stylesheet", href: tabletopMapChromeRepairCss }, { rel: "stylesheet", href: userRepair152Css }, { rel: "stylesheet", href: mobileProductRepair153Css },
      { rel: "stylesheet", href: finalDeviceParity154Css }, { rel: "stylesheet", href: finalDeviceParity154CompatCss }, { rel: "stylesheet", href: userVisibleRepair156Css },
      { rel: "stylesheet", href: finalVisualSystem157Css }, { rel: "stylesheet", href: mobilePopupMasterHead158Css }, { rel: "stylesheet", href: focusHeaderNavParity159Css },
      { rel: "stylesheet", href: navigationRealSvgParity160Css }, { rel: "stylesheet", href: sheetPopupGraphPolish161Css }, { rel: "stylesheet", href: navSheetSearchPolish162Css },
      { rel: "stylesheet", href: createSheetSearchViewport163Css }, { rel: "stylesheet", href: desktopHeroParity202Css }, { rel: "stylesheet", href: heroIconsFinal212Css },
      { rel: "stylesheet", href: experienceOrchestrationCss }, { rel: "stylesheet", href: experienceStabilizationCss }, { rel: "stylesheet", href: experienceRuntimeCss },
      { rel: "stylesheet", href: experienceMaterialsCss }, { rel: "stylesheet", href: experienceMobileCss }, { rel: "stylesheet", href: experienceDetailsCss },
      { rel: "stylesheet", href: commandExperienceCss }, { rel: "stylesheet", href: nexusMaterialCss }, { rel: "stylesheet", href: visibleUpgradeCss },
      { rel: "stylesheet", href: atmosphereCss }, { rel: "stylesheet", href: interactionPassCss }, { rel: "stylesheet", href: headMicroanimationsCss },
      { rel: "stylesheet", href: motionSystemCss }, { rel: "stylesheet", href: contextualMotionCss }, { rel: "stylesheet", href: popupMotionCss }, { rel: "stylesheet", href: uiDetailMotionCss },
      { rel: "stylesheet", href: libraryLayoutRestoreCss }, { rel: "stylesheet", href: continuityMotionCss }, { rel: "stylesheet", href: premiumMotionCss }, { rel: "stylesheet", href: relationalMotionCss }, { rel: "stylesheet", href: visibleMotionCss },
      { rel: "stylesheet", href: personalityMotionCss }, { rel: "stylesheet", href: sectionPersonalityMotionCss }, { rel: "stylesheet", href: actualUiMotionCss }, { rel: "stylesheet", href: frameRefinementMotionCss }, { rel: "stylesheet", href: completeInteractionMotionCss }, { rel: "stylesheet", href: deepInteractionMotionCss },
      { rel: "manifest", href: "/manifest.webmanifest" }, { rel: "icon", href: "/favicon.svg?v=5", type: "image/svg+xml", sizes: "any" }, { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&family=PT+Mono&display=swap" },
    ],
  }),
  shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => initializeClientErrorMonitor(), []);
  return <QueryClientProvider client={queryClient}><AuthProvider><main><Outlet /></main><RouteFavicon /><VisualViewportPopupBridge /><ExperienceFinalPolishBridge /><PageHeroParityBridge /><TabletopFinalInteractionBridge /><TadeonExperienceDirector /><Toaster position="top-right" /><PwaRegistration /></AuthProvider></QueryClientProvider>;
}