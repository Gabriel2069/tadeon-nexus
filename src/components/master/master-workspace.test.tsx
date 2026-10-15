// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DashboardHub } from "./master-overview";
import { MasterPanelIdentity, MasterPanelNavigation } from "./master-panel-navigation";
import { Tabs } from "@/components/ui/tabs";
beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const navigate = vi.fn();
const props = {
  campaignTitle: "Arquivo",
  campaignPhase: "Preparar",
  scenes: [],
  npcs: [],
  clues: [],
  threats: [],
  interludes: [],
  folds: [],
  onCampaignTitle: vi.fn(),
  onCampaignPhase: vi.fn(),
  onNavigate: navigate,
  onOpenSheet: vi.fn(),
};
const sheets = Array.from({ length: 14 }, (_, i) => ({
  id: String(i),
  name: i === 13 ? "Âncora distante" : `Personagem ${i}`,
  exposure: i,
  equilibrium: 0,
  stats: { pv_current: 10, ps_current: 3, pe_current: 2 },
}));
it("finds characters beyond the initial page, ignores accents and exposes all results", () => {
  render(<DashboardHub {...props} sheets={sheets} />);
  expect(screen.getAllByRole("button", { name: /^Abrir ficha/ })).toHaveLength(6);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ancora" } });
  expect(screen.getByRole("button", { name: "Abrir ficha de Âncora distante" })).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: /Mostrar mais personagens/ }));
  fireEvent.click(screen.getByRole("button", { name: /Mostrar mais personagens/ }));
  expect(screen.getAllByRole("button", { name: /^Abrir ficha/ })).toHaveLength(14);
});
it("keeps empty and filtered-empty messages distinct and metrics actionable", () => {
  const view = render(<DashboardHub {...props} sheets={[]} />);
  expect(screen.getByText("O elenco ainda está vazio")).toBeTruthy();
  view.rerender(<DashboardHub {...props} sheets={sheets} />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
  expect(screen.getByText("Nenhum personagem encontrado")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
  expect(screen.getAllByRole("button", { name: /^Abrir ficha/ })).toHaveLength(6);
  fireEvent.click(screen.getByRole("button", { name: /^Pistas ocultas:/ }));
  expect(navigate).toHaveBeenLastCalledWith("investigation");
});
it("offers every enabled destination in the compact chooser and preserves selection", () => {
  const view = render(
    <Tabs value="notes">
      <MasterPanelNavigation activeTab="notes" onNavigate={navigate} />
      <MasterPanelIdentity activeTab="notes" />
    </Tabs>,
  );
  const chooser = screen.getByRole("combobox", { name: "Ir para uma ferramenta do mestre" });
  expect((chooser as HTMLSelectElement).value).toBe("notes");
  expect(screen.queryByRole("option", { name: "Arquivos" })).toBeNull();
  fireEvent.change(chooser, { target: { value: "data" } });
  expect(navigate).toHaveBeenLastCalledWith("data");
  view.rerender(
    <Tabs value="assets">
      <MasterPanelNavigation activeTab="assets" onNavigate={navigate} showAssets />
    </Tabs>,
  );
  expect(screen.getByRole("option", { name: "Arquivos" })).toBeTruthy();
});
