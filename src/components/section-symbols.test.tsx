import { PageHeader } from "./page-header";
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FocusBrandMark, SectionSymbol } from "./section-symbols";

afterEach(cleanup);
describe("header-owned decorative marks", () => {
  it("renders the focus brand once, without waiting for a document observer", () => {
    const { container, rerender } = render(<FocusBrandMark />);
    expect(container.querySelectorAll(".tadeon-focus-section-mark-host")).toHaveLength(1);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    expect(
      container.querySelector("svg")?.classList.contains("tadeon-focus-section-mark-icon"),
    ).toBe(true);
    rerender(<FocusBrandMark />);
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });
  it.each(["dashboard", "nexus", "tabletop", "master", "users", "tools", "offline"] as const)(
    "renders the %s symbol in its decorative host",
    (section) => {
      const expected = render(<SectionSymbol section={section} />);
      const shape = expected.container.innerHTML;
      expected.unmount();
      const { container, getByRole } = render(
        <PageHeader section={section} eyebrow="Continuidade" title={section} />,
      );
      const mark = container.querySelector(".tadeon-page-header__mark");
      expect(mark?.getAttribute("aria-hidden")).toBe("true");
      expect(mark?.innerHTML).toBe(shape);
      expect(getByRole("heading", { name: section, level: 1 })).toBeTruthy();
    },
  );
});
