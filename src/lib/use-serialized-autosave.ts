import { useCallback, useEffect, useRef, useState } from "react";

interface SerializedAutosaveOptions<T> {
  value: T | null;
  enabled: boolean;
  delay: number;
  save: (value: T) => Promise<void>;
}

export function useSerializedAutosave<T>({
  value,
  enabled,
  delay,
  save,
}: SerializedAutosaveOptions<T>) {
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const valueRef = useRef(value);
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  const observedInitialValue = useRef(false);
  const versionRef = useRef(0);
  const pendingRef = useRef(false);
  const runRef = useRef<Promise<boolean> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executeRef = useRef<() => Promise<boolean>>(async () => true);

  valueRef.current = value;
  enabledRef.current = enabled;
  saveRef.current = save;

  const execute = useCallback(async (): Promise<boolean> => {
    if (!enabledRef.current || !valueRef.current) return true;
    pendingRef.current = true;

    if (runRef.current) return runRef.current;

    const run = (async () => {
      let succeeded = true;
      setSaving(true);

      while (pendingRef.current && enabledRef.current && valueRef.current) {
        pendingRef.current = false;
        const snapshot = valueRef.current;
        const snapshotVersion = versionRef.current;

        try {
          await saveRef.current(snapshot);
          setSaveError(null);
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
          }
        } catch {
          succeeded = false;
          setDirty(true);
          setSaveError("Não foi possível salvar. Verifique sua conexão e tente novamente.");
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => void executeRef.current(), 3000);
          break;
        }

        if (versionRef.current > snapshotVersion) {
          pendingRef.current = true;
        } else {
          setDirty(false);
        }
      }

      setSaving(false);
      return succeeded;
    })();

    runRef.current = run;
    const result = await run;
    runRef.current = null;
    return result;
  }, []);
  executeRef.current = execute;

  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    return executeRef.current();
  }, []);

  useEffect(() => {
    if (!enabled || !value) return;
    if (!observedInitialValue.current) {
      observedInitialValue.current = true;
      return;
    }

    versionRef.current += 1;
    pendingRef.current = true;
    setDirty(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void executeRef.current();
    }, delay);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [delay, enabled, value]);

  useEffect(
    () => () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    },
    [],
  );

  return { dirty, saveError, saveNow, saving };
}
