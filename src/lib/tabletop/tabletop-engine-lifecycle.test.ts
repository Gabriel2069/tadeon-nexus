// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { Application } from "pixi.js";
import { TabletopEngine } from "./tabletop-engine";

afterEach(() => vi.restoreAllMocks());
it("accepts a tool choice while the renderer is still initializing", async () => {
  let rejectInit!: (error: Error) => void;
  vi.spyOn(Application.prototype, "init").mockImplementation(
    () =>
      new Promise<void>((_, reject) => {
        rejectInit = reject;
      }),
  );
  const onToolModeChange = vi.fn();
  const engine = new TabletopEngine({ onToolModeChange });
  const initialization = engine.init(document.createElement("div"));
  expect(() => engine.setToolMode("pan")).not.toThrow();
  expect(onToolModeChange).toHaveBeenLastCalledWith("pan");
  rejectInit(new Error("Renderer unavailable"));
  await expect(initialization).rejects.toThrow("Renderer unavailable");
  await engine.destroy();
});
