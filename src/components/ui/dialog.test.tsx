// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./route-popup-frame", () => ({
  useRoutePopupFrame: () => ({ boundary: null, style: {} }),
}));
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

function Fixture({ customClose }: { customClose?: (event: Event) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <button data-testid="destination">Destino</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onCloseAutoFocus={customClose}>
          <DialogTitle>Conta</DialogTitle>
          <DialogDescription>Preferências</DialogDescription>
          <input aria-label="Nome" />
        </DialogContent>
      </Dialog>
    </>
  );
}
afterEach(cleanup);
describe("controlled dialog focus", () => {
  it("returns focus to the opening control after Escape without requiring DialogTrigger", async () => {
    const screen = render(<Fixture />);
    const opener = screen.getByText("Abrir");
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Nome")));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
  it("respects a caller that deliberately redirects closing focus", async () => {
    const screen = render(
      <Fixture
        customClose={(event) => {
          event.preventDefault();
          screen.getByTestId("destination").focus();
        }}
      />,
    );
    const opener = screen.getByText("Abrir");
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Nome")));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("destination")));
  });
});
