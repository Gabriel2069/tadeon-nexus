import { useCallback, useEffect, useRef, useState } from "react";

/** Manual persistence: a completed request never acknowledges newer edits. */
export function useMasterDraft<T>(persist: (snapshot: T, signal: AbortSignal) => Promise<void>) {
  const [value, setValue] = useState<T | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const current = useRef<T | null>(null);
  const revision = useRef(0);
  const active = useRef(true);
  const request = useRef<Promise<boolean> | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  const load = useCallback((next: T) => {
    revision.current++;
    current.current = next;
    setValue(next);
    setDirty(false);
    setError(null);
  }, []);
  const update = <K extends keyof T>(key: K, next: T[K]) => {
    if (!current.current || Object.is(current.current[key], next)) return;
    revision.current++;
    current.current = { ...current.current, [key]: next };
    setValue(current.current);
    setDirty(true);
  };
  const save = (): Promise<boolean> => {
    if (request.current) return request.current;
    const snapshot = current.current;
    if (!snapshot || !active.current) return Promise.resolve(false);
    const version = revision.current;
    const abort = new AbortController();
    controller.current = abort;
    setSaving(true);
    setError(null);
    const pending = (async () => {
      try {
        await persist(snapshot, abort.signal);
        if (!active.current || abort.signal.aborted) return false;
        const clean = revision.current === version;
        setDirty(!clean);
        setSavedAt(new Date());
        return clean;
      } catch {
        if (active.current && !abort.signal.aborted) {
          setError(
            "Não foi possível salvar. Suas alterações permanecem no painel; tente novamente.",
          );
          setDirty(true);
        }
        return false;
      } finally {
        request.current = null;
        if (active.current) setSaving(false);
      }
    })();
    request.current = pending;
    return pending;
  };
  return { value, dirty, saving, error, savedAt, load, update, save };
}
