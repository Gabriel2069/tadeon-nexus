import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("seleção, projeção e superfícies de entrada", () => {
  it("trata a saída do Diretor como apresentação dedicada sem AppLayout", () => {
    const shell = source("src/components/protected-shell.tsx");
    expect(shell).toContain('window.location.pathname === "/tabletop"');
    expect(shell).toContain('params.get("view") === "director"');
    expect(shell).toContain('return "director" as const');
  });

  it("reserva um cabeçalho físico para a projeção e deixa o canvas preencher o restante", () => {
    const css = source("src/styles/tabletop-director.css");
    expect(css).toContain("--tadeon-director-header-height");
    expect(css).toContain("inset: var(--tadeon-director-header-height) 0 0");
    expect(css).toContain('content: "Tadeon Nexus · Projeção do Diretor"');
    expect(css).toContain("width: 100% !important");
    expect(css).toContain("height: 100% !important");
  });

  it("fecha a superfície móvel transitória ao entrar explicitamente em Selecionar", () => {
    const bridge = source("src/components/tabletop/tabletop-final-interaction-bridge.tsx");
    expect(bridge).toContain("closeTransientTabletopPanel");
    expect(bridge).toContain('.tadeon-tabletop-panel-backdrop[data-open="true"]');
    expect(bridge).toContain("isSelectControl");
    expect(bridge).toContain('event.key.toLocaleLowerCase("pt-BR") === "v"');
  });

  it("mantém o frame da seleção transparente mesmo durante transições antigas", () => {
    const css = source("src/styles/selection-director-entry-polish.css");
    expect(css).toContain(".tadeon-tabletop-panel-frame");
    expect(css).toContain("background: transparent !important");
    expect(css).toContain("display: none !important");
  });

  it("amplia a prévia da câmera e organiza os toggles do Diretor", () => {
    const css = source("src/styles/selection-director-entry-polish.css");
    expect(css).toContain(".tadeon-director-remote__preview-frame");
    expect(css).toContain("aspect-ratio: 16 / 9");
    expect(css).toContain("min-height: clamp(13rem, 36dvh, 28rem) !important");
    expect(css).toContain("grid-template-columns: 1.9rem minmax(0, 1fr) auto");
    expect(css).toContain(':has([data-state="checked"])');
  });

  it("refina só o portal de login e o quadro inicial do Dashboard", () => {
    const css = source("src/styles/selection-director-entry-polish.css");
    expect(css).toContain(".tadeon-auth-shell");
    expect(css).toContain(".tadeon-auth-card input:focus-visible");
    expect(css).toContain(".tadeon-dashboard-hero");
    expect(css).toContain(".tadeon-dashboard-signal");
    expect(css).not.toContain(".tadeon-sheet-card {");
  });
});
