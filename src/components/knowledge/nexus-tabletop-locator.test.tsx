// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
import { NexusTabletopLocator } from "./nexus-tabletop-locator";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  db.from.mockReset();
});
const node = "00000000-0000-4000-8000-000000000001";
function query(result: Promise<unknown> | unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve(result),
    in: () => Promise.resolve(result),
  };
  return chain;
}
it("lets the reader choose every returned scene and opens the chosen entity", async () => {
  db.from.mockImplementation((table) =>
    query({
      data:
        table === "tabletop_entities"
          ? [
              { id: "a", scene_id: "one", name: "Fio" },
              { id: "b", scene_id: "two", name: "Pedra" },
            ]
          : [
              { id: "one", name: "Salão" },
              { id: "two", name: "Jardim" },
            ],
      error: null,
    }),
  );
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  render(<NexusTabletopLocator nodeId={node} />);
  const chooser = await screen.findByRole("combobox", {
    name: "Localizações desta página na Mesa",
  });
  fireEvent.change(chooser, { target: { value: "b" } });
  fireEvent.click(screen.getByRole("button", { name: "Localizar" }));
  expect(open).toHaveBeenCalledWith(
    "/tabletop?scene=two&locate=b",
    "_blank",
    "noopener,noreferrer",
  );
  fireEvent.click(screen.getByRole("button", { name: "Ocultar localização" }));
  expect(screen.queryByRole("complementary")).toBeNull();
});
it("ignores a late location from the previously read page", async () => {
  let resolveOld!: (value: unknown) => void;
  const old = new Promise((r) => {
    resolveOld = r;
  });
  let reads = 0;
  db.from.mockImplementation((table) =>
    query(
      table === "tabletop_entities"
        ? ++reads === 1
          ? old
          : { data: [], error: null }
        : { data: [], error: null },
    ),
  );
  const view = render(<NexusTabletopLocator nodeId={node} />);
  await waitFor(() => expect(reads).toBe(1));
  view.rerender(<NexusTabletopLocator nodeId="00000000-0000-4000-8000-000000000002" />);
  await waitFor(() => expect(reads).toBe(2));
  await act(async () =>
    resolveOld({ data: [{ id: "a", scene_id: "one", name: "Antigo" }], error: null }),
  );
  expect(screen.queryByText("Antigo")).toBeNull();
  expect(db.from).toHaveBeenCalledTimes(2);
});
