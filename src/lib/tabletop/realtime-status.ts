import type { TabletopRealtimeConnectionState } from "./realtime-transport";

export type TabletopRealtimeStatusTone = "neutral" | "progress" | "success" | "warning" | "error";

export interface TabletopRealtimeStatusPresentation {
  label: string;
  detail: string;
  tone: TabletopRealtimeStatusTone;
  animated: boolean;
  canRetry: boolean;
}

export function getTabletopRealtimeStatusPresentation({
  enabled,
  state,
  participantCount,
}: {
  enabled: boolean;
  state: TabletopRealtimeConnectionState;
  participantCount: number;
}): TabletopRealtimeStatusPresentation {
  if (!enabled) {
    return {
      label: "Sincronização preparada",
      detail: "A Mesa continua no modo seguro até o Realtime ser habilitado.",
      tone: "neutral",
      animated: false,
      canRetry: false,
    };
  }

  switch (state) {
    case "connecting":
      return {
        label: "Conectando à sala",
        detail: "Validando sua sessão e as permissões da cena.",
        tone: "progress",
        animated: true,
        canRetry: false,
      };
    case "connected":
      return {
        label:
          participantCount === 1
            ? "1 participante ao vivo"
            : `${participantCount} participantes ao vivo`,
        detail: "Atualizações efêmeras protegidas por um canal privado.",
        tone: "success",
        animated: true,
        canRetry: false,
      };
    case "degraded":
      return {
        label: "Conexão instável",
        detail: "A cena permanece disponível; tente restabelecer a sincronização.",
        tone: "warning",
        animated: true,
        canRetry: true,
      };
    case "disconnected":
      return {
        label: "Mesa desconectada",
        detail: "Nenhuma alteração ao vivo será enviada até a reconexão.",
        tone: "error",
        animated: false,
        canRetry: true,
      };
    case "idle":
    default:
      return {
        label: "Aguardando uma cena",
        detail: "Escolha uma sessão e uma cena para iniciar o canal privado.",
        tone: "neutral",
        animated: false,
        canRetry: false,
      };
  }
}
