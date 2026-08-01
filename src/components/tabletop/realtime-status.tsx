import { Radio, RefreshCw, WifiOff } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import type { TabletopPresence } from "@/lib/tabletop/realtime-protocol";
import type { TabletopRealtimeConnectionState } from "@/lib/tabletop/realtime-transport";
import { getTabletopRealtimeStatusPresentation } from "@/lib/tabletop/realtime-status";
import "@/styles/tabletop-realtime.css";

export function TabletopRealtimeStatus({
  enabled,
  state,
  participants,
  errorMessage,
  onReconnect,
  compact = false,
}: {
  enabled: boolean;
  state: TabletopRealtimeConnectionState;
  participants: TabletopPresence[];
  errorMessage?: string | null;
  onReconnect?: () => void;
  compact?: boolean;
}) {
  const status = getTabletopRealtimeStatusPresentation({
    enabled,
    state,
    participantCount: participants.length,
  });

  return (
    <div
      className={`tadeon-tabletop-realtime tadeon-tabletop-realtime--${status.tone} ${compact ? "tadeon-tabletop-realtime--compact" : ""}`}
      aria-live="polite"
    >
      <div className="tadeon-tabletop-realtime__status" title={errorMessage || status.detail}>
        <span
          className={`tadeon-tabletop-realtime__signal ${status.animated ? "is-active" : ""}`}
          aria-hidden="true"
        >
          {status.tone === "error" ? <WifiOff /> : <Radio />}
        </span>
        <span className="min-w-0">
          <strong>{status.label}</strong>
          {!compact && <small>{errorMessage || status.detail}</small>}
        </span>
      </div>

      {participants.length > 0 && (
        <div className="tadeon-tabletop-realtime__participants" aria-label="Participantes online">
          {participants.slice(0, 4).map((participant) => (
            <span
              key={participant.userId}
              className="tadeon-tabletop-realtime__avatar"
              style={{ "--participant-color": participant.color } as CSSProperties}
              title={`${participant.displayName} · ${participant.role}`}
            >
              {participant.displayName.slice(0, 1).toLocaleUpperCase("pt-BR")}
            </span>
          ))}
          {participants.length > 4 && (
            <span className="tadeon-tabletop-realtime__more">+{participants.length - 4}</span>
          )}
        </div>
      )}

      {status.canRetry && onReconnect && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="tadeon-tabletop-realtime__retry"
          onClick={onReconnect}
        >
          <RefreshCw aria-hidden="true" />
          <span className={compact ? "sr-only" : ""}>Reconectar</span>
        </Button>
      )}
    </div>
  );
}
