// @vitest-environment jsdom
import { cleanup, fireEvent, render, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { createPopupRoot } from "./popup-presence";

type Props = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
};
const [Root, usePresence] = createPopupRoot(
  ({ open, onOpenChange, children }: Props) => (
    <>
      <button onClick={() => onOpenChange?.(!open)}>Toggle</button>
      {children}
    </>
  ),
  "FixtureRoot",
);
function Content({ forceMount = false }: { forceMount?: boolean }) {
  return usePresence(forceMount) ? <div data-testid="content" /> : null;
}
function mediaPreference(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return {
    change(value: boolean) {
      act(() => {
        matches = value;
        listeners.forEach((fn) => fn());
      });
    },
    listeners,
  };
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("releases a closed surface if reduced motion changes during its exit and opens again normally", () => {
  const media = mediaPreference(false),
    change = vi.fn();
  const view = render(
    <Root defaultOpen onOpenChange={change}>
      <Content />
    </Root>,
  );
  fireEvent.click(view.getByText("Toggle"));
  expect(change).toHaveBeenLastCalledWith(false);
  expect(view.queryByTestId("content")).not.toBeNull();
  media.change(true);
  expect(view.queryByTestId("content")).toBeNull();
  fireEvent.click(view.getByText("Toggle"));
  expect(change).toHaveBeenLastCalledWith(true);
  expect(view.queryByTestId("content")).not.toBeNull();
  view.unmount();
  expect(media.listeners.size).toBe(0);
});
it("leaves controlled state with the consumer and respects explicit forceMount", () => {
  mediaPreference(true);
  const change = vi.fn();
  const view = render(
    <Root open onOpenChange={change}>
      <Content />
    </Root>,
  );
  fireEvent.click(view.getByText("Toggle"));
  expect(change).toHaveBeenCalledExactlyOnceWith(false);
  expect(view.queryByTestId("content")).not.toBeNull();
  view.rerender(
    <Root open={false}>
      <Content />
    </Root>,
  );
  expect(view.queryByTestId("content")).toBeNull();
  view.rerender(
    <Root open={false}>
      <Content forceMount />
    </Root>,
  );
  expect(view.queryByTestId("content")).not.toBeNull();
});
