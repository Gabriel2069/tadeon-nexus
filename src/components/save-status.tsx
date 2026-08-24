import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Loader2,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveState = "saved" | "pending" | "saving" | "error" | "offline";

export function SaveStatus({
  state,
  savedAt,
  onRetry,
  compact = false,
}: {
  state: SaveState;
  savedAt?: Date | null;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const content = {
    saved: {
      icon: CheckCircle2,
      label: savedAt
        ? `Salvo às ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
        : "Tudo salvo",
      style: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    },
    pending: {
      icon: CloudUpload,
      label: "Alterações pendentes",
      style: "text-amber-200 border-amber-500/30 bg-amber-500/10",
    },
    saving: {
      icon: Loader2,
      label: "Salvando…",
      style: "text-sky-200 border-sky-500/30 bg-sky-500/10",
    },
    error: {
      icon: AlertCircle,
      label: "Falha ao salvar",
      style: "text-destructive border-destructive/40 bg-destructive/10",
    },
    offline: {
      icon: WifiOff,
      label: "Offline · salvo localmente",
      style: "text-amber-200 border-amber-500/30 bg-amber-500/10",
    },
  }[state];

  const Icon = content.icon;
  const body = (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        content.style,
      )}
      aria-live="polite"
      aria-busy={state === "saving"}
      aria-label={content.label}
      title={compact ? content.label : undefined}
      data-tadeon-state={state}
      data-tadeon-directed="true"
    >
      <Icon
        aria-hidden="true"
        className={cn("h-3.5 w-3.5", state === "saving" && "animate-spin")}
      />
      {!compact && content.label}
    </span>
  );

  return state === "error" && onRetry ? (
    <button type="button" onClick={onRetry} title="Tentar salvar novamente">
      {body}
    </button>
  ) : (
    body
  );
}
