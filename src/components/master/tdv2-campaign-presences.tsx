import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TdvField, TdvSelect } from "@/components/sheet/tdv2-fields";
import { OPPOSITION_FIELDS } from "@/lib/tdv2-master";
import type { MasterNpc, MasterThreat } from "@/lib/master-data";
export interface CampaignRules {
  kind: "Figurante" | "Adversário" | "Ameaça";
  magnitude?: number;
  fields: Record<string, string>;
}
type Presence = MasterNpc | MasterThreat;
const draft = (item: Presence, threat: boolean): CampaignRules =>
  item.tdv2 ?? {
    kind: threat ? "Ameaça" : "Adversário",
    fields: {
      Intenção: String(
        (item as MasterNpc).conviction ?? (item as MasterThreat).manifestation ?? "",
      ),
      "Consequência típica": String((item as MasterThreat).stitchConsequence ?? ""),
      "Notas privadas": (item as MasterThreat).notes ?? (item as MasterNpc).description ?? "",
    },
  };
export function Tdv2CampaignPresences<T extends Presence>({
  items,
  onChange,
  create,
  threat = false,
  reference,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  threat?: boolean;
  reference: ReactNode;
}) {
  const [id, setId] = useState<string | null>(null),
    active = items.find((i) => i.id === id),
    rules = active ? draft(active, threat) : null;
  const patch = (change: Partial<T>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...change } : i)));
  return (
    <div className="space-y-4">
      <div className="tdv-actions">
        <h2 className="font-cinzel text-xl">
          {threat ? "Ameaças da campanha" : "Elenco da campanha"}
        </h2>
        <Button
          onClick={() => {
            const item = create();
            onChange([...items, item]);
            setId(item.id);
          }}
        >
          {threat ? "Nova Ameaça" : "Novo NPC"}
        </Button>
      </div>
      <p className="tdv-note">
        Presenças, vínculos com cenas e registros existentes permanecem. Defina capacidades e
        consequências pela intervenção; Magnitude não compra orçamento, dano ou bônus.
      </p>
      <div className="tdv-folios">
        {items.map((item) => {
          const r = draft(item, threat);
          return (
            <Card key={item.id} className="p-4">
              <h3 className="font-cinzel text-lg">{item.name}</h3>
              <p>
                {r.kind}
                {r.magnitude !== undefined
                  ? ` · Magnitude ${r.magnitude}`
                  : " · capacidades em revisão"}
              </p>
              <p className="tdv-note">{r.fields.Intenção}</p>
              <Button variant="outline" onClick={() => setId(item.id)}>
                Editar {item.name}
              </Button>
            </Card>
          );
        })}
      </div>
      {active && rules && (
        <Dialog open onOpenChange={(open) => !open && setId(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-3xl">
            <DialogHeader>
              <DialogTitle>{active.name}</DialogTitle>
              <DialogDescription>
                Parâmetros TdV II e continuidade desta presença na campanha.
              </DialogDescription>
            </DialogHeader>
            <TdvField
              label="Nome da presença"
              value={active.name}
              short
              onChange={(name) => patch({ name } as Partial<T>)}
            />
            <div className="tdv-grid">
              <TdvSelect
                label="Tipo de presença"
                value={rules.kind}
                options={["Figurante", "Adversário", "Ameaça"]}
                onChange={(kind) =>
                  patch({ tdv2: { ...rules, kind: kind as CampaignRules["kind"] } } as Partial<T>)
                }
              />
              {rules.kind === "Ameaça" && (
                <TdvSelect
                  label="Magnitude TdV II"
                  value={rules.magnitude === undefined ? "Definir escala" : String(rules.magnitude)}
                  options={["Definir escala", "0", "1", "2", "3", "4"]}
                  onChange={(v) =>
                    patch({
                      tdv2: { ...rules, magnitude: v === "Definir escala" ? undefined : Number(v) },
                    } as Partial<T>)
                  }
                />
              )}
            </div>
            <div className="tdv-grid">
              {OPPOSITION_FIELDS.map((field) => (
                <TdvField
                  key={field}
                  label={field}
                  value={rules.fields[field] ?? ""}
                  onChange={(value) =>
                    patch({
                      tdv2: { ...rules, fields: { ...rules.fields, [field]: value } },
                    } as Partial<T>)
                  }
                />
              ))}
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                onChange(items.filter((i) => i.id !== active.id));
                setId(null);
              }}
            >
              Excluir presença
            </Button>
          </DialogContent>
        </Dialog>
      )}
      <details className="tdv-disclosure">
        <summary>Referência e ferramentas da edição anterior</summary>
        {reference}
      </details>
    </div>
  );
}
export function Tdv2EncounterPlan({
  notes,
  onChange,
  players,
  npcs,
  threats,
  reference,
}: {
  notes: string;
  onChange: (v: string) => void;
  players: { id: string; name: string }[];
  npcs: MasterNpc[];
  threats: MasterThreat[];
  reference: ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div className="space-y-4">
      <h2 className="font-cinzel text-xl">Balanço da situação</h2>
      <div className="tdv-folios">
        {[
          "Oposição: intenção e capacidade para impedir a mudança",
          "Pressão de continuidade: o que se deteriora e qual Ruptura foi anunciada",
          "Complexidade de resolução: acesso, intervenções e estabilização",
        ].map((text) => (
          <Card className="p-4" key={text}>
            {text}
          </Card>
        ))}
      </div>
      <div className="tdv-actions">
        {[...players, ...npcs, ...threats].map((item) => (
          <Button
            key={item.id}
            variant="outline"
            aria-pressed={selected.includes(item.id)}
            onClick={() =>
              setSelected(
                selected.includes(item.id)
                  ? selected.filter((id) => id !== item.id)
                  : [...selected, item.id],
              )
            }
          >
            {item.name}
          </Button>
        ))}
      </div>
      <p className="tdv-note">
        {selected.length} participantes ou presenças em foco. Escalas não são somadas em um Rank de
        grupo ou orçamento universal.
      </p>
      <TdvField
        label="Plano do encontro: oposição, Pressão e complexidade"
        value={notes}
        onChange={onChange}
      />
      <details className="tdv-disclosure">
        <summary>Referência de cálculos anteriores</summary>
        {reference}
      </details>
    </div>
  );
}
