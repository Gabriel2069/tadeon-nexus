// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./route-popup-frame", () => ({
  useRoutePopupFrame: (ref: import("react").ForwardedRef<HTMLDivElement>) => ({
    contentRef: ref,
    boundary: null,
    style: {},
  }),
  usePopupPortalContainer: () => undefined,
}));
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet";

function Fixture({ customClose }: { customClose?: (event: Event) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <button data-testid="destination">Destino</button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent onCloseAutoFocus={customClose}>
          <SheetTitle>Conta</SheetTitle>
          <SheetDescription>Preferências</SheetDescription>
          <input aria-label="Nome" />
        </SheetContent>
      </Sheet>
    </>
  );
}
afterEach(cleanup);
describe("controlled sheet focus", () => {
  it("returns focus to the opening control after Escape without requiring SheetTrigger", async () => {
    const screen = render(<Fixture />);
    const opener = screen.getByText("Abrir");
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull());
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
  it("respects a caller that deliberately redirects closing focus", async () => {
    const screen = render(
      <Fixture
        customClose={(event) => {
          event.preventDefault();
          screen.queryByTestId("destination")?.focus();
        }}
      />,
    );
    const opener = screen.getByText("Abrir");
    opener.focus();
    fireEvent.click(opener);
    await waitFor(() => expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull());
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId("destination")));
  });
});
