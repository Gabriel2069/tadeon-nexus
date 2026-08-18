import { supabase } from "@/integrations/supabase/client";

const DEDUPE_WINDOW_MS = 60_000;
const recent = new Map<string, number>();
let initialized = false;

function sanitizeDiagnosticText(value: string, maxLength: number): string {
  return value
    .replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/gi, "[chave removida]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [removido]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removido]")
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[conexão removida]")
    .slice(0, maxLength);
}

export function sanitizeClientErrorMessage(value: unknown): string {
  const source =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : "Falha inesperada no cliente";
  return sanitizeDiagnosticText(source, 500);
}

function sanitizeClientErrorStack(value: unknown): string | undefined {
  if (!(value instanceof Error) || !value.stack) return undefined;
  return sanitizeDiagnosticText(value.stack, 4_000);
}

function fingerprint(message: string, route: string, source: string): string {
  let hash = 2166136261;
  const input = `${source}:${route}:${message}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `client-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export async function reportClientError(
  error: unknown,
  source: "client" | "network" | "save" = "client",
): Promise<void> {
  try {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const message = sanitizeClientErrorMessage(error);
    const stack = sanitizeClientErrorStack(error);
    const route = window.location.pathname.slice(0, 240) || "/";
    const key = fingerprint(message, route, source);
    const previous = recent.get(key) ?? 0;
    if (Date.now() - previous < DEDUPE_WINDOW_MS) return;
    recent.set(key, Date.now());
    if (recent.size > 50) {
      for (const [entry, timestamp] of recent) {
        if (Date.now() - timestamp > DEDUPE_WINDOW_MS) recent.delete(entry);
      }
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("app_error_logs").insert({
      user_id: data.user.id,
      fingerprint: key,
      message,
      route,
      source,
      severity: "error",
      context: {
        online: navigator.onLine,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        dpr: window.devicePixelRatio || 1,
        release: import.meta.env.VITE_APP_COMMIT_SHA ?? "development",
        userAgent: navigator.userAgent.slice(0, 320),
        ...(stack ? { stack } : {}),
      },
    });
  } catch {
    // The monitor must never create a second user-facing failure.
  }
}

export function initializeClientErrorMonitor(): () => void {
  if (typeof window === "undefined" || initialized) return () => undefined;
  initialized = true;
  const onError = (event: ErrorEvent) => {
    void reportClientError(event.error ?? event.message);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    void reportClientError(event.reason);
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    initialized = false;
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
