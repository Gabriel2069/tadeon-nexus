const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function sanitizeKnowledgeUrl(value: string, image = false) {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > 2048 ||
    CONTROL_CHARACTERS.test(trimmed)
  ) {
    return null;
  }

  const isLocalPath =
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\");
  if (isLocalPath) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return null;
    if (url.protocol === "https:" || (!image && url.protocol === "http:")) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}
