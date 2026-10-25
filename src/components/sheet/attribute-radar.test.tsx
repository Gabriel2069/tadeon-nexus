// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import AttributeRadar from "./attribute-radar";

afterEach(cleanup);
const data = ["COR", "MEN", "INS", "PRE", "ERU"].map((attr) => ({ attr, value: 1 }));
const props = { data, color: "#a855f7", tickColor: "#c084fc" };

it("describes the actual values and default scale without requiring layout measurements", () => {
  render(<AttributeRadar {...props} />);
  const chart = screen.getByRole("img", { name: "Distribuição dos atributos" });
  const description = document.getElementById(chart.getAttribute("aria-describedby")!);
  expect(description?.textContent).toBe("COR: 1; MEN: 1; INS: 1; PRE: 1; ERU: 1. Escala de 0 a 5.");
});
it("updates the plotted value when an attribute changes", () => {
  const { container, rerender } = render(<AttributeRadar {...props} />);
  const area = () => container.querySelectorAll("polygon")[5].getAttribute("points");
  const before = area();
  rerender(
    <AttributeRadar {...props} data={data.map((d, i) => (i === 0 ? { ...d, value: 3 } : d))} />,
  );
  expect(area()).not.toBe(before);
  expect(container.querySelector("desc")?.textContent).toContain("COR: 3");
});
it("keeps exceptional values visible and explains the expanded scale", () => {
  const { container } = render(
    <AttributeRadar {...props} data={data.map((d, i) => (i === 0 ? { ...d, value: 10 } : d))} />,
  );
  expect(container.querySelector("desc")?.textContent).toContain("Escala de 0 a 10");
  const [left, top, width, height] = container
    .querySelector("svg")!
    .getAttribute("viewBox")!
    .split(" ")
    .map(Number);
  for (const point of container.querySelectorAll("circle")) {
    const x = Number(point.getAttribute("cx")),
      y = Number(point.getAttribute("cy"));
    expect(x).toBeGreaterThanOrEqual(left);
    expect(x).toBeLessThanOrEqual(left + width);
    expect(y).toBeGreaterThanOrEqual(top);
    expect(y).toBeLessThanOrEqual(top + height);
  }
});
it("gives each instance its own accessible references and handles an empty chart", () => {
  const { container } = render(
    <>
      <AttributeRadar {...props} />
      <AttributeRadar {...props} data={[]} />
    </>,
  );
  const charts = screen.getAllByRole("img");
  expect(charts[0].getAttribute("aria-describedby")).not.toBe(
    charts[1].getAttribute("aria-describedby"),
  );
  expect(container.querySelectorAll("desc")[1].textContent).toBe("Sem atributos disponíveis.");
  for (const chart of charts)
    expect(document.getElementById(chart.getAttribute("aria-labelledby")!)?.textContent).toBe(
      "Distribuição dos atributos",
    );
});
