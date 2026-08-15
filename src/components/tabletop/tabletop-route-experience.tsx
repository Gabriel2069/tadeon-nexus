import { Component, Suspense, lazy, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Layers3, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error-monitor";
import type { FeatureFlags } from "@/lib/feature-flags";
import "@/styles/tabletop-progressive-ui.css";

const MasterEntry = lazy(() => import("@/components/tabletop/tabletop-master-entry"));
const ParticipantEntry = lazy(() => import("@/components/tabletop/tabletop-participant-entry"));
const DirectorEntry = lazy(() => import("@/components/tabletop/tabletop-director-entry"));

interface TabletopRouteExperienceProps {
  role?: string | null;
  flags: FeatureFlags;
  initialSceneId?: string;
  directorSession?: string;
  directorMode?: boolean;
}

function TabletopBootScreen({ resolvingRole = false }: { resolvingRole?: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 350),
      window.setTimeout(() => setStage(2), 1100),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const messages = resolvingRole
    ? [
        "Confirmando seu papel na sessão",
        "Preparando apenas as ferramentas que você pode usar",
        "Quase pronto para abrir a cena",
      ]
    : [
        "Abrindo o canvas essencial",
        "Carregando a cena sem bloquear a interface",
        "Preparando ferramentas avançadas em segundo plano",
      ];

  return (
    <section className="tadeon-tabletop-boot" role="status" aria-live="polite">
      <div className="tadeon-tabletop-boot__halo" aria-hidden="true" />
      <div className="tadeon-tabletop-boot__card">
        <div className="tadeon-tabletop-boot__mark">
          <Layers3 className="h-5 w-5" />
        </div>
        <p className="tadeon-eyebrow">Mesa Nexus</p>
        <h1>Entrando na cena</h1>
        <p className="tadeon-tabletop-boot__copy">{messages[stage]}</p>
        <div className="tadeon-tabletop-boot__progress" aria-hidden="true">
          <span data-stage={stage} />
        </div>
        <div className="tadeon-tabletop-boot__meta">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Inicialização progressiva</span>
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>
    </section>
  );
}

type BoundaryProps = {
  children: ReactNode;
  resetKey: number;
  onRetry: () => void;
};

class TabletopChunkBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError(
      new Error(`${error.message} | tabletop chunk | ${info.componentStack?.slice(0, 180) ?? ""}`),
    );
  }

  componentDidUpdate(previous: Readonly<BoundaryProps>) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="tadeon-tabletop-boot tadeon-tabletop-boot--error" role="alert">
        <div className="tadeon-tabletop-boot__card">
          <div className="tadeon-tabletop-boot__mark">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="tadeon-eyebrow">Recuperação da Mesa</p>
          <h1>O módulo visual não concluiu a abertura</h1>
          <p className="tadeon-tabletop-boot__copy">
            A interface principal continua disponível. Tente carregar novamente apenas o módulo da Mesa, sem recarregar o restante do Nexus.
          </p>
          <Button onClick={this.props.onRetry}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </section>
    );
  }
}

export function TabletopRouteExperience({
  role,
  flags,
  initialSceneId,
  directorSession,
  directorMode = false,
}: TabletopRouteExperienceProps) {
  const [resetKey, setResetKey] = useState(0);

  // Não adivinha um papel enquanto o perfil ainda está hidratando. Antes, isso
  // podia baixar o workspace de participante e logo depois descartá-lo para
  // montar o workspace do mestre no mesmo acesso. Espectador usa a entrada
  // participante, preservando o comportamento de leitura já existente.
  if (!role) return <TabletopBootScreen resolvingRole />;

  const entry = directorMode && role === "mestre" ? (
    <DirectorEntry
      sessionId={directorSession}
      realtimeEnabled={flags.nexus_realtime_enabled}
    />
  ) : role === "mestre" ? (
    <MasterEntry
      initialSceneId={initialSceneId}
      realtimeEnabled={flags.nexus_realtime_enabled}
      lightingEnabled={flags.nexus_lighting_enabled}
    />
  ) : (
    <ParticipantEntry realtimeEnabled={flags.nexus_realtime_enabled} />
  );

  return (
    <TabletopChunkBoundary
      resetKey={resetKey}
      onRetry={() => setResetKey((current) => current + 1)}
    >
      <Suspense key={resetKey} fallback={<TabletopBootScreen />}>
        {entry}
      </Suspense>
    </TabletopChunkBoundary>
  );
}
