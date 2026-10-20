// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TadeonExperienceDirector } from "./tadeon-experience-director";

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let reduced = false;
const tick = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn(0));
  });
};
const pointer = (node: HTMLElement, x: number) => {
  const event = new Event("pointermove", { bubbles: true });
  Object.assign(event, { pointerType: "mouse", clientX: x, clientY: 80 });
  node.dispatchEvent(event);
};
beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  reduced = false;
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, fn);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduced-motion") ? reduced : true,
  }));
  document.body.innerHTML = '<main class="tadeon-route-stage"></main>';
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("directs newly mounted content while leaving explicit materials untouched", async () => {
  render(<TadeonExperienceDirector />);
  await tick();
  const stage = document.querySelector("main")!;
  const section = document.createElement("section");
  section.innerHTML =
    '<div><button>Rascunho</button></div><button data-material-surface="button">Salvar</button>';
  stage.append(section);
  section.querySelector("div")!.append(document.createElement("button"));
  await tick();
  expect(section.querySelector("button")!.dataset.tadeonDirected).toBe("true");
  expect(
    section.querySelector("[data-material-surface]")!.hasAttribute("data-tadeon-directed"),
  ).toBe(false);
});

it("coalesces scene pointer geometry and cancels it when the director unmounts", async () => {
  const stage = document.querySelector<HTMLElement>("main")!;
  stage.innerHTML = '<div class="tadeon-atmosphere-layer"></div>';
  const bounds = vi
    .spyOn(stage, "getBoundingClientRect")
    .mockReturnValue({ left: 0, top: 0, width: 500, height: 500 } as DOMRect);
  const view = render(<TadeonExperienceDirector />);
  await tick();
  for (let i = 0; i < 120; i++) pointer(stage, i + 200);
  expect(bounds).not.toHaveBeenCalled();
  await tick();
  expect(bounds).toHaveBeenCalledTimes(1);
  expect(parseFloat(stage.style.getPropertyValue("--tadeon-parallax-x"))).toBeCloseTo(1.1, 1);
  reduced = true;
  pointer(stage, 400);
  await tick();
  expect(bounds).toHaveBeenCalledTimes(1);
  reduced = false;
  pointer(stage, 400);
  view.unmount();
  await tick();
  expect(bounds).toHaveBeenCalledTimes(1);
  expect(stage.style.getPropertyValue("--tadeon-parallax-x")).toBe("");
});

it("releases decorative listeners and pending work when a legacy surface leaves", async () => {
  const stage = document.querySelector<HTMLElement>("main")!;
  stage.innerHTML = '<section class="tadeon-surface"></section>';
  const surface = stage.firstElementChild as HTMLElement;
  const bounds = vi.spyOn(surface, "getBoundingClientRect");
  render(<TadeonExperienceDirector />);
  await tick();
  expect(surface.querySelector(".tadeon-pointer-sheen")).not.toBeNull();
  surface.remove();
  await tick();
  pointer(surface, 100);
  await tick();
  expect(bounds).not.toHaveBeenCalled();
  expect(surface.querySelector(".tadeon-pointer-sheen")).toBeNull();
});
