import { useCallback, useEffect, useRef, useState } from "react";
export type ReadingView = "document" | "graph" | "split";
export type ReadingPreferences = { view: ReadingView; horizontal: number; vertical: number };
export const DEFAULT_READING: ReadingPreferences = {
  view: "document",
  horizontal: 50,
  vertical: 50,
};
export function parseReadingPreferences(raw: string | null): ReadingPreferences {
  try {
    const d = JSON.parse(raw || "null");
    if (!d || d.version !== 1) return DEFAULT_READING;
    const percent = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? Math.max(30, Math.min(70, v)) : 50;
    return {
      view: ["document", "graph", "split"].includes(d.view) ? d.view : "document",
      horizontal: percent(d.horizontal),
      vertical: percent(d.vertical),
    };
  } catch {
    return DEFAULT_READING;
  }
}
export function useReadingPreferences(actorId: string, scope: string) {
  const key = actorId && scope ? `tadeon.nexus.reading.v1.${actorId}.${scope}` : "";
  const [state, setState] = useState<{ key: string; value: ReadingPreferences }>({
    key: "",
    value: DEFAULT_READING,
  });
  const currentKey = useRef(key);
  currentKey.current = key;
  useEffect(() => {
    let value = DEFAULT_READING;
    if (key) {
      try {
        value = parseReadingPreferences(localStorage.getItem(key));
      } catch {
        /* Optional preference storage. */
      }
    }
    setState({ key, value });
  }, [key]);
  const update = useCallback(
    (patch: Partial<ReadingPreferences>) => {
      if (!key || currentKey.current !== key) return;
      setState((old) => {
        const value = { ...(old.key === key ? old.value : DEFAULT_READING), ...patch };
        try {
          localStorage.setItem(key, JSON.stringify({ version: 1, ...value }));
        } catch {
          /* Usable without storage. */
        }
        return { key, value };
      });
    },
    [key],
  );
  return { preferences: state.key === key ? state.value : DEFAULT_READING, update };
}
