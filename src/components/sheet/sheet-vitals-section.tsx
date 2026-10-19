import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type RankRow, calculateSheetMaximums, genId } from "@/lib/sheet-types";
import { ArrowUp, Plus, Shield } from "lucide-react";

import {
  type DefenseItem,
  type SheetData,
  type SheetUpdate,
  clampCurrent,
  clampMod,
} from "./sheet-model";
import { RowTable, Section, StatBlock } from "./sheet-ui";

export function SheetVitalsSection({
  sheet,
  canEdit,
  update,
  maximums,
  base,
  armorTotal,
  armorRaw,
  armorRd,
}: {
  sheet: SheetData;
  canEdit: boolean;
  update: SheetUpdate;
  maximums: ReturnType<typeof calculateSheetMaximums>;
  base: RankRow;
  armorTotal: number;
  armorRaw: number;
  armorRd: number;
}) {
  const attrs = sheet.attributes,
    upg = sheet.stat_upgrades;
  const { pv: pvMax, ps: psMax, pe: peMax, pa: paMax, def: defTotal } = maximums;
  const [defEquipOpen, setDefEquipOpen] = useState(false);
  return (
    <Section
      id="sec-pontos"
      title="Pontos Vitais"
      className="tadeon-core-panel tadeon-vitals-panel"
    >
      <div className="tadeon-vitals-grid grid grid-cols-2 gap-2.5">
        <StatBlock
          label="PV"
          full="Vitalidade"
          color="text-red-400"
          glowRgb="239,68,68"
          current={sheet.stats.pv_current}
          mod={sheet.stats.pv_mod}
          max={pvMax}
          disabled={!canEdit}
          onCurrent={(v) =>
            update("stats", {
              ...sheet.stats,
              pv_current: clampCurrent(v, pvMax),
            })
          }
          onMod={(v) => update("stats", { ...sheet.stats, pv_mod: clampMod(v) })}
        />
        <StatBlock
          label="PE"
          full="Energia"
          color="text-emerald-400"
          glowRgb="16,185,129"
          current={sheet.stats.pe_current}
          mod={sheet.stats.pe_mod}
          max={peMax}
          disabled={!canEdit}
          onCurrent={(v) =>
            update("stats", {
              ...sheet.stats,
              pe_current: clampCurrent(v, peMax),
            })
          }
          onMod={(v) => update("stats", { ...sheet.stats, pe_mod: clampMod(v) })}
        />
        <StatBlock
          label="PS"
          full="Sanidade"
          color="text-purple-400"
          glowRgb="168,85,247"
          current={sheet.stats.ps_current}
          mod={sheet.stats.ps_mod}
          max={psMax}
          disabled={!canEdit}
          onCurrent={(v) =>
            update("stats", {
              ...sheet.stats,
              ps_current: clampCurrent(v, psMax),
            })
          }
          onMod={(v) => update("stats", { ...sheet.stats, ps_mod: clampMod(v) })}
        />
        <StatBlock
          label="PA"
          full="Ancoragem"
          color="text-amber-300"
          glowRgb="245,158,11"
          current={sheet.stats.pa_current}
          mod={sheet.stats.pa_mod}
          max={paMax}
          disabled={!canEdit}
          onCurrent={(v) =>
            update("stats", {
              ...sheet.stats,
              pa_current: clampCurrent(v, paMax),
            })
          }
          onMod={(v) => update("stats", { ...sheet.stats, pa_mod: clampMod(v) })}
        />

        <Card className="tadeon-defense-card col-span-2 border-blue-500/30 bg-card/60 p-3 shadow-[0_0_22px_-12px_rgba(59,130,246,0.65)]">
          <div className="tadeon-defense-card__summary">
            <div className="tadeon-defense-card__score">
              <Shield aria-hidden="true" strokeWidth={1.5} />
              <span>{defTotal}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-cinzel text-sm font-bold text-blue-300">Defesa</div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                base {base.def} + INS {attrs.INS} + equip {armorTotal}
                {armorRaw > 3 ? " (máx. 3)" : ""} + mod {sheet.stats.def_mod}
                {upg.def ? ` + apr ${upg.def}` : ""}
              </p>
            </div>
          </div>
          <div className="tadeon-defense-card__inputs grid grid-cols-2 gap-2 text-xs">
            <div>
              <Label className="text-[10px]">Equip</Label>
              <Input
                type="number"
                readOnly
                tabIndex={-1}
                value={armorTotal}
                className="h-7 bg-muted/40 cursor-not-allowed"
                title="Maior bônus entre as proteções registradas (máx. 3)"
              />
            </div>
            <div>
              <Label className="text-[10px]">Mod</Label>
              <Input
                type="number"
                disabled={!canEdit}
                value={sheet.stats.def_mod}
                aria-label="Modificador de Defesa"
                className="h-7"
                onChange={(e) =>
                  update("stats", {
                    ...sheet.stats,
                    def_mod: clampMod(Number(e.target.value)),
                  })
                }
              />
            </div>
          </div>

          {/* Equipamentos de defesa (retrátil, máx 3) */}
          <Collapsible
            open={defEquipOpen}
            onOpenChange={setDefEquipOpen}
            className="mt-3 border-t border-border/60 pt-2"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group mb-1.5 flex min-h-10 w-full items-center justify-between gap-2"
                aria-controls="defense-equipment-panel"
              >
                <Label className="cursor-pointer text-[10px] uppercase tracking-wider text-muted-foreground">
                  Equipamentos ({sheet.defense_items.length}/3)
                </Label>
                <ArrowUp className="h-3 w-3 text-muted-foreground transition-transform duration-200 ease-[var(--ease-out)] group-data-[state=closed]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent id="defense-equipment-panel">
              <div className="flex justify-end mb-1.5">
                {canEdit && sheet.defense_items.length < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      update("defense_items", [
                        ...sheet.defense_items,
                        {
                          id: genId(),
                          nome: "",
                          bonus: 0,
                          rd: 0,
                          peso: 0,
                        },
                      ])
                    }
                    className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                )}
              </div>
              {sheet.defense_items.length === 0 ? (
                <p className="text-[10px] italic text-muted-foreground text-center py-1">
                  Sem equipamentos.
                </p>
              ) : (
                <RowTable
                  rows={sheet.defense_items}
                  canEdit={canEdit}
                  columns={[
                    { key: "nome", label: "Nome", flex: 1.5 },
                    {
                      key: "bonus",
                      label: "DEF",
                      type: "number",
                      width: 58,
                    },
                    {
                      key: "rd",
                      label: "RD",
                      type: "number",
                      width: 58,
                    },
                    {
                      key: "peso",
                      label: "Espaço",
                      type: "number",
                      width: 68,
                    },
                  ]}
                  onChange={(v) => update("defense_items", v as DefenseItem[])}
                />
              )}
            </CollapsibleContent>
          </Collapsible>
          <div className="mt-2 rounded-md border border-border/50 bg-background/30 px-2 py-1.5 text-center text-[10px] text-muted-foreground">
            RD equipada: <strong className="text-foreground">{armorRd}</strong> · armaduras não
            acumulam entre si; vale a proteção mais alta.
          </div>
        </Card>
      </div>
    </Section>
  );
}
