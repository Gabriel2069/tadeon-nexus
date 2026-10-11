import { describe, expect, it } from "vitest";
import { createLatestRequestGate } from "./latest-request";

describe("async read ordering", () => {
  it("lets a newer result win even when an older request completes last", async () => {
    const gate = createLatestRequestGate();
    const committed: string[] = [];
    let finishOld = () => {};
    const oldRequest = (async () => {
      const ticket = gate.begin();
      await new Promise<void>((resolve) => {
        finishOld = resolve;
      });
      if (gate.isCurrent(ticket)) committed.push("old");
    })();
    const ticket = gate.begin();
    if (gate.isCurrent(ticket)) committed.push("new");
    finishOld();
    await oldRequest;
    expect(committed).toEqual(["new"]);
  });
  it("invalidates results, errors and loading completion on scope change or unmount", () => {
    const gate = createLatestRequestGate();
    const ticket = gate.begin();
    gate.invalidate();
    expect(gate.isCurrent(ticket)).toBe(false);
    expect(gate.isCurrent(gate.begin())).toBe(true);
  });
});
