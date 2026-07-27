export const CANONICAL_AUTH_ORIGIN = "https://tadeon-nexus.lovable.app";

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveAuthRedirectOrigin(currentOrigin: string, configuredOrigin?: string) {
  const configured = normalizeOrigin(configuredOrigin);
  if (configured) return configured;

  const current = normalizeOrigin(currentOrigin);
  if (!current) return CANONICAL_AUTH_ORIGIN;

  const hostname = new URL(current).hostname;
  const isTemporaryOrigin =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".lovableproject.com");

  return isTemporaryOrigin ? CANONICAL_AUTH_ORIGIN : current;
}

export function getAuthRedirectOrigin() {
  return resolveAuthRedirectOrigin(window.location.origin, import.meta.env.VITE_PUBLIC_SITE_URL);
}
