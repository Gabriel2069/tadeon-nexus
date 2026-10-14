// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/knowledge/knowledge-graph-service", () => ({
  knowledgeGraphService: {
    loadMemory: vi.fn().mockResolvedValue({
      focusNodeId: "root",
      candidateLimit: 500,
      truncated: false,
      nodes: [
        {
          id: "root",
          title: "Arquivo",
          summary: "",
          nodeType: "document",
          icon: null,
          status: "draft",
          visibility: "workspace",
          campaignId: null,
          parentNodeId: null,
          updatedAt: "2026-10-01",
          tags: [],
          semanticTerms: [],
          explicitDegree: 0,
          incomingMentions: 0,
          outgoingMentions: 0,
        },
      ],
      signals: [],
    }),
  },
}));
import { KnowledgeGraph } from "./knowledge-graph-second-brain";
let point = { x: 0, y: 0 };
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  let matrix = { x: 0, y: 0, scale: 1 };
  const stack: (typeof matrix)[] = [];
  const context = {
    setTransform: () => {
      matrix = { x: 0, y: 0, scale: 1 };
    },
    clearRect: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    save: () => stack.push({ ...matrix }),
    restore: () => {
      matrix = stack.pop() ?? matrix;
    },
    translate: (x: number, y: number) => {
      matrix.x += x;
      matrix.y += y;
    },
    scale: (x: number) => {
      matrix.scale *= x;
    },
    beginPath: vi.fn(),
    arc: (x: number, y: number) => {
      point = { x: matrix.x + x * matrix.scale, y: matrix.y + y * matrix.scale };
    },
    fill: vi.fn(),
    stroke: vi.fn(),
    strokeText: vi.fn(),
    fillText: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as ReturnType<HTMLCanvasElement["getContext"]>,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 900,
    height: 570,
    right: 900,
    bottom: 570,
    toJSON() {},
  });
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.hasPointerCapture = () => false;
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("opens a node on a single click, but preserves reading on drag or canceled gesture", async () => {
  const open = vi.fn();
  const view = render(
    <KnowledgeGraph
      workspaceId="workspace"
      campaignId={null}
      focusNodeId="root"
      onOpenNode={open}
    />,
  );
  await waitFor(() => expect(view.getByText(/1 nós · 0 conexões/)).toBeTruthy());
  const canvas = view.getByLabelText(/Teia ponderada/);
  await waitFor(() => expect(Math.abs(point.x - 450)).toBeLessThan(1));
  const click = { clientX: point.x, clientY: point.y, pointerId: 1 };
  fireEvent(canvas, new MouseEvent("pointerdown", { ...click, bubbles: true }));
  fireEvent(canvas, new MouseEvent("pointerup", { ...click, bubbles: true }));
  expect(open).toHaveBeenCalledExactlyOnceWith("root");
  fireEvent(canvas, new MouseEvent("pointerdown", { ...click, bubbles: true }));
  fireEvent(canvas, new MouseEvent("pointercancel", { ...click, bubbles: true }));
  fireEvent(canvas, new MouseEvent("pointerup", { ...click, bubbles: true }));
  expect(open).toHaveBeenCalledTimes(1);
  fireEvent(canvas, new MouseEvent("pointerdown", { ...click, bubbles: true }));
  fireEvent(
    canvas,
    new MouseEvent("pointermove", { ...click, clientX: click.clientX + 40, bubbles: true }),
  );
  fireEvent(
    canvas,
    new MouseEvent("pointerup", { ...click, clientX: click.clientX + 40, bubbles: true }),
  );
  expect(open).toHaveBeenCalledTimes(1);
});
