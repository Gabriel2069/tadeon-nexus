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
});
