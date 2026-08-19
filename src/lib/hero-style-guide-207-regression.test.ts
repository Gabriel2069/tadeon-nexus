import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const guide = readFileSync("docs/TADEON_MOTION_AND_VISUAL_LANGUAGE.md", "utf8");

describe("Tadeon motion and visual language guide", () => {
  it("documents motion, hover, heroes, dialogs and responsive parity", () => {
    for (const section of [
      "## 3. Heroes / cabeçalhos",
      "## 4. Motion",
      "## 5. Hover",
      "## 7. Popups, dialogs e overlays",
      "## 8. Responsividade",
    ]) expect(guide).toContain(section);
  });

  it("preserves the seven-section identity vocabulary", () => {
    for (const name of [
      "Dashboard",
      "O Nexus",
      "Mesa Nexus",
      "Painel do Mestre",
      "Gerenciar Usuários",
      "Backup & Diagnóstico",
      "Consulta Offline",
    ]) expect(guide).toContain(name);
  });
});
