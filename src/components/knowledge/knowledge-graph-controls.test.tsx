// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/knowledge/knowledge-graph-service", () => ({
  knowledgeGraphService: {
    loadMemory: vi.fn().mockRejectedValue(new Error("Fixture indisponível")),
  },
}));
import { KnowledgeGraph } from "./knowledge-graph-second-brain";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("starts with the established open preset and preserves manual settings across render and panel changes", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  const props = {
    workspaceId: "fixture",
    campaignId: null,
    focusNodeId: "node",
    onOpenNode: vi.fn(),
  };
  const view = render(<KnowledgeGraph {...props} />);
  await waitFor(() =>
    expect(
      view.getByText("Não foi possível carregar a memória conectada de O Nexus."),
    ).toBeTruthy(),
  );
  const toggle = view.container.querySelector(".tadeon-brain-settings-toggle")!;
  fireEvent.click(toggle);
  const distance = view.getByRole("slider", { name: /Distância-base/ }) as HTMLInputElement;
  expect(distance.value).toBe("260");
  expect((view.getByRole("slider", { name: /Repulsão/ }) as HTMLInputElement).value).toBe("2.4");
  fireEvent.change(distance, { target: { value: "320" } });
  view.rerender(<KnowledgeGraph {...props} />);
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  expect((view.getByRole("slider", { name: /Distância-base/ }) as HTMLInputElement).value).toBe(
    "320",
  );
});
