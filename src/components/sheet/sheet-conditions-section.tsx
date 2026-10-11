import { ConditionCounter } from "@/components/sheet/condition-counter";
import { Label } from "@/components/ui/label";
import type { CSSProperties } from "react";

import { type ConditionKey, type ConditionOptionsMap, CONDITION_META } from "@/lib/sheet-types";

import { type SheetData, type SheetUpdate } from "./sheet-model";
import { Section } from "./sheet-ui";

export function SheetConditionsSection({
  sheet,
  canEdit,
  update,
  conditionOptions,
}: {
  sheet: SheetData;
  canEdit: boolean;
  update: SheetUpdate;
  conditionOptions: ConditionOptionsMap;
}) {
  return (
    <Section id="condicoes" title="Condições" className="tadeon-conditions-panel">
      <div className="tadeon-condition-grid grid grid-cols-2 gap-2 xl:grid-cols-4">
        {(Object.keys(CONDITION_META) as ConditionKey[]).map((c) => {
          const meta = CONDITION_META[c];
          const opts = (conditionOptions[c] ?? ["Normal"]).filter((option) => option !== "Normal");
          const current = sheet.conditions[c];
          return (
            <div
              key={c}
              data-tadeon-condition-active={current.length > 0 ? "true" : undefined}
              className="tadeon-condition-card rounded-xl border border-border/60 bg-secondary/15 p-3 transition-[border-color,background,box-shadow,transform] duration-150 ease-[var(--ease-out)]"
              style={
                (current.length > 0
                  ? {
                      "--condition-rgb": meta.rgb
                        .split(",")
                        .map((part) => part.trim())
                        .join(" "),
                      borderColor: meta.color,
                      background: `linear-gradient(145deg, rgba(${meta.rgb}, 0.2), rgba(${meta.rgb}, 0.04))`,
                      boxShadow: `0 0 0 1px ${meta.color}44, inset 0 0 24px rgba(${meta.rgb}, 0.1)`,
                    }
                  : undefined) as CSSProperties | undefined
              }
            >
              <Label className="text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                {meta.label}
              </Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {opts.map((option) => {
                  const selected = current.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={!canEdit}
                      aria-pressed={selected}
                      className="tadeon-condition-option rounded-full border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      style={
                        selected
                          ? {
                              borderColor: meta.color,
                              background: `rgba(${meta.rgb}, 0.18)`,
                              color: "var(--foreground)",
                              boxShadow: `inset 0 0 10px rgba(${meta.rgb}, 0.2), 0 0 8px rgba(${meta.rgb}, 0.16)`,
                            }
                          : undefined
                      }
                      onClick={() =>
                        update("conditions", {
                          ...sheet.conditions,
                          [c]: selected
                            ? current.filter((item) => item !== option)
                            : [...current, option],
                        })
                      }
                    >
                      {option}
                    </button>
                  );
                })}
                {current.length === 0 && (
                  <span className="px-1 py-1 text-[11px] text-muted-foreground">Normal</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <ConditionCounter
          label="Morrendo"
          max={3}
          value={sheet.dying}
          color="bg-red-500"
          disabled={!canEdit}
          onChange={(v) => update("dying", v)}
        />
        <ConditionCounter
          label="Colapsando"
          max={3}
          value={sheet.going_insane}
          color="bg-purple-500"
          disabled={!canEdit}
          onChange={(v) => update("going_insane", v)}
        />
      </div>
    </Section>
  );
}
