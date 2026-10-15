// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a
      href={to}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  ),
}));
import { MobileMoreMenu } from "./mobile-more-menu";
beforeAll(() => {
  class ResizeObserverFixture {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverFixture);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
async function open(path = "/") {
  const screen = render(
    <>
      <main id="tadeon-main" tabIndex={-1}>
        Conteúdo
      </main>
      <MobileMoreMenu path={path} />
    </>,
  );
  const trigger = screen.getByRole("button", { name: "Mais" });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "Enter" });
  await screen.findByRole("menu", { name: "Outras áreas" });
  return { screen, trigger };
}
describe("mobile More menu", () => {
  it("dismisses a router link that prevents default and hands focus to main", async () => {
    const { screen } = await open();
    fireEvent.click(screen.getByRole("menuitem", { name: "Backup e diagnóstico" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("main")));
  });
  it("opens from the keyboard and focuses a destination", async () => {
    const { screen, trigger } = await open();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: "Consulta offline" }),
      ),
    );
  });
  it("supports arrow navigation and typeahead", async () => {
    const { screen } = await open();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: "Consulta offline" }),
      ),
    );
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Usuários" })),
    );
    fireEvent.keyDown(document.activeElement!, { key: "b" });
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("menuitem", { name: "Backup e diagnóstico" }),
      ),
    );
  });
  it("Escape closes and returns focus to the rendered trigger", async () => {
    const { screen, trigger } = await open();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
  it("renders all destinations and the canonical Backup vector", async () => {
    const { screen } = await open();
    expect(
      ["Consulta offline", "Usuários", "Backup e diagnóstico"].map((name) =>
        screen.getByRole("menuitem", { name }).getAttribute("href"),
      ),
    ).toEqual(["/offline", "/manage-users", "/nexus-tools"]);
    expect(
      screen
        .getByRole("menuitem", { name: "Backup e diagnóstico" })
        .querySelector("svg path")
        ?.getAttribute("d"),
    ).toContain("M21 8");
  });
  it("marks the current destination and the More trigger", async () => {
    const { screen, trigger } = await open("/manage-users");
    expect(screen.getByRole("menuitem", { name: "Usuários" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(trigger.getAttribute("data-more-active")).toBe("true");
  });
  it("the close action dismisses and restores focus", async () => {
    const { screen, trigger } = await open();
    fireEvent.click(screen.getByRole("menuitem", { name: "Fechar outras áreas" }));
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
