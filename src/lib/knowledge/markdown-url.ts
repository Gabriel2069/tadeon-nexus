function hasControlCharacters(value: string) {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function sanitizeKnowledgeUrl(value: string, image = false) {
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > 2048 ||
    hasControlCharacters(trimmed)
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
