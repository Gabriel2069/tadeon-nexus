/** Collects all records arriving before a frame; never discards an earlier batch. */
export function createFrameBatch<T>(
  process: (records: T[]) => void,
  schedule: (callback: () => void) => number,
  cancel: (handle: number) => void,
) {
  let handle: number | null = null;
  let pending: T[] = [];
  return {
    add(records: T[]) {
      pending.push(...records);
      if (handle !== null) return;
      handle = schedule(() => {
        handle = null;
        const records = pending;
        pending = [];
        process(records);
      });
    },
    dispose() {
      if (handle !== null) cancel(handle);
      handle = null;
      pending = [];
    },
  };
}
