import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { tierFromBonus } from "./sheet-model";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type RankRow, SKILL_GROUPS } from "@/lib/sheet-types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import type { AppRole } from "@/lib/nexus-contracts";
import { type Dispatch, type SetStateAction } from "react";
import { type SheetData, type SheetUpdate } from "./sheet-model";
import { Section } from "./sheet-ui";

const TRAINING_TIERS = [
  { tier: 1, name: "Iniciado", bonus: 3 },
  { tier: 2, name: "Apurado", bonus: 6 },
  { tier: 3, name: "Versado", bonus: 9 },
] as const;

export function SheetSkillsSection({
  sheet,
  canEdit,
  update,
  skillGroups,
  initialTrainingUsed,
  trainingUsed,
  initialTrainingRemaining,
  trainingCosts,
  pmAvailable,
  base,
  role,
  setSheet,
}: {
  sheet: SheetData;
  canEdit: boolean;
  update: SheetUpdate;
  skillGroups: typeof SKILL_GROUPS;
  initialTrainingUsed: number;
  trainingUsed: number;
  initialTrainingRemaining: number;
  trainingCosts: [number, number, number];
  pmAvailable: number;
  base: RankRow;
  role: AppRole | null;
  setSheet: Dispatch<SetStateAction<SheetData | null>>;
}) {
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  return (
    <Section
      id="sec-pericias"
      title="Perícias"
      extra={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            Graus iniciais: {initialTrainingUsed}/7
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            Graus totais: {trainingUsed}
          </span>
          <Input
            aria-label="Bônus temporário de perícias"
            placeholder="Bônus temporário"
            disabled={!canEdit}
            value={sheet.skill_bonus}
            onChange={(e) => update("skill_bonus", e.target.value)}
            className="h-7 w-44 text-xs"
          />
        </div>
      }
    >
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Os grupos organizam a leitura da ficha; o Atributo usado no teste continua sendo definido
        pela abordagem descrita na cena.
      </p>
      <div className="tadeon-skill-groups-grid">
        {skillGroups.map((g) => (
          <div key={g.attr} className="tadeon-skill-group">
            <div className="tadeon-skill-group__heading">
              <span aria-hidden="true">{g.attr}</span>
              <div>
                <small>Família de perícias</small>
                <h4>{g.label}</h4>
              </div>
            </div>
            <div className="tadeon-skill-group__list">
              {g.skills.map((s) => {
                const v = sheet.skills[s] ?? 0;
                const tier: number = tierFromBonus(v);
                const color =
                  tier === 3
                    ? "text-yellow-400 font-bold"
                    : tier === 2
                      ? "text-blue-400 font-semibold"
                      : tier === 1
                        ? "text-green-400"
                        : "text-muted-foreground";
                const tierName = tier === 0 ? "Sem treino" : TRAINING_TIERS[tier - 1].name;
                const initialForSkill = Math.max(
                  0,
                  Math.min(2, sheet.initial_skill_degrees[s] || 0),
                );
                const isInitialDegree =
                  initialTrainingRemaining > 0 && tier < 2 && initialForSkill === tier;
                const nextCost: number | null =
                  tier < 3 ? (isInitialDegree ? 0 : (trainingCosts[tier] ?? 0)) : null;
                const refund: number = tier > initialForSkill ? (trainingCosts[tier - 1] ?? 0) : 0;
                const minimumRank = [5, 25, 50][tier] ?? 100;
                const lacksRank = !isInitialDegree && base.rank < minimumRank;
                const lacksPM = nextCost != null && pmAvailable < nextCost;
                const upgrade = () => {
                  if (tier >= 3 || nextCost == null) return;
                  if (lacksRank) {
                    toast.error(`Este grau exige Rank ${minimumRank}.`);
                    return;
                  }
                  if (lacksPM) {
                    toast.error(`PM insuficientes (custa ${nextCost}).`);
                    return;
                  }
                  const nextTier = TRAINING_TIERS[tier]!;
                  setSheet((p) =>
                    p
                      ? {
                          ...p,
                          skills: { ...p.skills, [s]: nextTier.bonus },
                          initial_skill_degrees: isInitialDegree
                            ? {
                                ...p.initial_skill_degrees,
                                [s]: Math.min(2, initialForSkill + 1),
                              }
                            : p.initial_skill_degrees,
                        }
                      : p,
                  );
                  setOpenSkill(null);
                  toast.success(
                    `${s}: ${nextTier.name} (+${nextTier.bonus}) ~ ${
                      isInitialDegree ? "grau inicial" : `${nextCost} PM`
                    }`,
                  );
                };
                const downgrade = () => {
                  if (tier <= 0) return;
                  if (role !== "mestre") {
                    toast.error("Apenas o mestre pode reverter.");
                    return;
                  }
                  const prevBonus = tier === 1 ? 0 : TRAINING_TIERS[tier - 2].bonus;
                  const prevName = tier === 1 ? "Sem treino" : TRAINING_TIERS[tier - 2].name;
                  const previousTier = tier - 1;
                  setSheet((p) =>
                    p
                      ? {
                          ...p,
                          skills: { ...p.skills, [s]: prevBonus },
                          initial_skill_degrees: {
                            ...p.initial_skill_degrees,
                            [s]: Math.min(initialForSkill, previousTier),
                          },
                        }
                      : p,
                  );
                  setOpenSkill(null);
                  toast.success(
                    refund > 0
                      ? `${s}: ${prevName} (+${refund} PM)`
                      : `${s}: ${prevName} (grau inicial removido)`,
                  );
                };

                return (
                  <Popover
                    key={s}
                    open={openSkill === s}
                    onOpenChange={(o) => setOpenSkill(o ? s : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={!canEdit}
                        className="tadeon-skill-row"
                        data-tier={tier}
                      >
                        <span className="tadeon-skill-row__name">{s}</span>
                        <span className={`tadeon-skill-row__value ${color}`}>+{v}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="end">
                      <div className="font-cinzel font-bold text-sm mb-1">{s}</div>
                      <div className="text-[11px] text-muted-foreground mb-3">
                        Treino atual:{" "}
                        <span className={color}>
                          {tierName} {tier > 0 ? `(+${TRAINING_TIERS[tier - 1].bonus})` : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={tier === 0 || role !== "mestre"}
                          aria-label={`Reverter treino de ${s}`}
                          title={role === "mestre" ? `Reverter (+${refund} PM)` : "Apenas mestre"}
                          onClick={downgrade}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-center text-xs">
                          {tier < 3 && nextCost != null ? (
                            <span className="text-muted-foreground">
                              {lacksRank ? (
                                <>Requer Rank {minimumRank}</>
                              ) : (
                                <>
                                  Avançar:{" "}
                                  <b className="text-foreground">
                                    {isInitialDegree ? "grau inicial" : `${nextCost} PM`}
                                  </b>
                                </>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Treino máximo</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={!canEdit || tier >= 3 || lacksRank || lacksPM}
                          title={
                            lacksRank
                              ? `Requer Rank ${minimumRank}`
                              : lacksPM
                                ? "PM insuficientes"
                                : "Avançar treino"
                          }
                          aria-label={`Avançar treino de ${s}`}
                          onClick={upgrade}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
