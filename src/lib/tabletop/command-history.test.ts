import { describe, expect, it, vi } from "vitest";
import { CommandHistory } from "./command-history";

describe("CommandHistory", () => {
  it("records an already-applied direct manipulation without replaying it", () => {
    const history = new CommandHistory();
    const execute = vi.fn();
    const undo = vi.fn();

    history.record({ label: "Mover parede", execute, undo });
    expect(execute).not.toHaveBeenCalled();
    expect(history.canUndo).toBe(true);

    expect(history.undo()).toBe(true);
    expect(undo).toHaveBeenCalledOnce();
    expect(history.redo()).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
  });
});
