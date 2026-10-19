import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
describe("ui coherence 192/193/194/195", () => {
  // NEX-026: explicit WorkspaceActions behavior replaces DOM-injection assertions.


  // NEX-024: real width and clipping replace the former full-width !important prescription.



  it("targets the inspected setup and collapse controls directly", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain(".tadeon-tabletop-toprail-setup");
    expect(css).toContain(".tadeon-tabletop-toprail-toggle");
    expect(css).toContain("order: 1 !important");
    expect(css).toContain("order: 2 !important");
  });

  it("makes the 2D/3D toggle use the exact outline Button variant of its peers", () => {
    const button = source("src/components/ui/button.tsx");
    expect(button).toContain('ariaLabel === "Ativar projeção espacial 3D"');
    expect(button).toContain('ariaLabel === "Voltar à planta 2D"');
    expect(button).toContain('const effectiveVariant = isProjectionToggle ? "outline" : variant');
    expect(button).toContain("data-variant={effectiveVariant ?? \"default\"}");
    expect(button).toContain("buttonVariants({ variant: effectiveVariant, size, className })");
  });

  // NEX-026: explicit WorkspaceActions behavior replaces DOM-injection assertions.

});
