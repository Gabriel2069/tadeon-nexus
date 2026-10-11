import { describe, expect, it, vi } from "vitest";
import { createFrameBatch } from "./frame-batch";

describe("frame batching", () => {
  it("processes every record from several observer callbacks in one frame", () => {
    let callback = () => {};
    const schedule = vi.fn((next: () => void) => {
      callback = next;
      return 0;
    });
    const process = vi.fn();
    const batch = createFrameBatch<number>(process, schedule, vi.fn());
    batch.add([1, 2]);
    batch.add([3]);
    batch.add([4]);
    expect(schedule).toHaveBeenCalledTimes(1);
    callback();
    expect(process).toHaveBeenCalledWith([1, 2, 3, 4]);
    batch.add([5]);
    callback();
    expect(process).toHaveBeenLastCalledWith([5]);
  });
  it("cancels the pending frame and discards records when disposed", () => {
    const cancel = vi.fn();
    const process = vi.fn();
    const batch = createFrameBatch<number>(process, () => 0, cancel);
    batch.add([1]);
    batch.dispose();
    expect(cancel).toHaveBeenCalledWith(0);
    expect(process).not.toHaveBeenCalled();
  });
});
