import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";

describe("Fio-Mestre control metadata", () => {
  it("keeps selection and transition hooks on compound controls", () => {
    const html = renderToStaticMarkup(
      <div>
        <Tabs defaultValue="arquivo">
          <TabsList>
            <TabsTrigger value="arquivo">Arquivo</TabsTrigger>
            <TabsTrigger value="mesa">Mesa</TabsTrigger>
          </TabsList>
          <TabsContent value="arquivo">Conteúdo</TabsContent>
        </Tabs>
        <Toggle pressed>Fixado</Toggle>
        <Checkbox checked aria-label="Selecionado" />
        <Switch checked aria-label="Ativo" />
        <Accordion type="single" defaultValue="guia">
          <AccordionItem value="guia">
            <AccordionTrigger>Guia</AccordionTrigger>
            <AccordionContent>Detalhes</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>,
    );

    for (const slot of [
      "tabs",
      "tabs-list",
      "tabs-trigger",
      "tabs-content",
      "toggle",
      "checkbox",
      "switch",
      "accordion-item",
      "accordion-trigger",
      "accordion-content",
    ]) {
      expect(html).toContain(`data-slot="${slot}"`);
    }

    expect(html).toContain('data-state="active"');
    expect(html).toContain('data-state="on"');
    expect(html).toContain('data-state="checked"');
  });
});
