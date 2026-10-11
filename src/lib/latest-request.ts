/** Invalidates earlier async reads, including failures and loading completion. */
export function createLatestRequestGate() {
  let generation = 0;
  return {
    begin: () => ++generation,
    isCurrent: (ticket: number) => ticket === generation,
    invalidate: () => {
      generation += 1;
    },
  };
}
