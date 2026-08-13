import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("does not submit surrounding forms unless explicitly requested", () => {
    expect(renderToStaticMarkup(<Button>Ação</Button>)).toContain('type="button"');
    expect(renderToStaticMarkup(<Button type="submit">Enviar</Button>)).toContain(
      'type="submit"',
    );
  });

  it("exposes stable control metadata for responsive states and motion", () => {
    const html = renderToStaticMarkup(
      <Button variant="outline" size="sm" aria-pressed="true">
        Selecionado
      </Button>,
    );

    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-variant="outline"');
    expect(html).toContain('data-size="sm"');
    expect(html).toContain('aria-pressed="true"');
  });
});
