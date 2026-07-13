import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import type {
  Attributes,
  SkillBranch,
  StatUpgrades,
  RankRow,
  Ability,
  UpgradeCosts,
} from "@/lib/sheet-types";
import { calcTotalPM, upgradeCostAt, SKILL_ABILITY_PREFIX } from "@/lib/sheet-types";

interface Props {
  exposure: number;
  attributes: Attributes;
  pmSpent: number;
  statUpgrades: StatUpgrades;
  purchasedSkills: string[];
  abilities: Ability[];
  branches: SkillBranch[];
  rankTable: RankRow[];
  upgradeCosts: UpgradeCosts;
  canEdit: boolean;
  onUpdate: (changes: {
    stat_upgrades?: StatUpgrades;
    purchased_skills?: string[];
    abilities?: Ability[];
  }) => void;
}

const UPGRADE_KEYS: {
  key: keyof StatUpgrades;
  label: string;
  gain: number;
  color: string;
}[] = [
  { key: "pv", label: "PV", gain: 3, color: "text-red-400" },
  { key: "ps", label: "PS", gain: 2, color: "text-purple-400" },
  { key: "pe", label: "PE", gain: 1, color: "text-emerald-400" },
  { key: "def", label: "Defesa", gain: 1, color: "text-blue-400" },
];

export function SkillTreeTab({
  exposure,
  attributes,
  pmSpent,
  statUpgrades,
  purchasedSkills,
  abilities,
  branches,
  rankTable,
  upgradeCosts,
  canEdit,
  onUpdate,
}: Props) {
  const totalPM = useMemo(() => calcTotalPM(exposure, rankTable), [exposure, rankTable]);
  const remaining = totalPM - pmSpent;
  const currentRank = Math.floor((exposure || 0) / 5) * 5;
  const purchased = new Set(purchasedSkills);

  const buyUpgrade = (key: keyof StatUpgrades) => {
    const cost = upgradeCostAt(upgradeCosts[key], statUpgrades[key]);
    if (remaining < cost) {
      toast.error(`PM insuficientes (custa ${cost}).`);
      return;
    }
    onUpdate({
      stat_upgrades: { ...statUpgrades, [key]: statUpgrades[key] + 1 },
    });
    const upgrade = UPGRADE_KEYS.find((item) => item.key === key);
    toast.success(`+${upgrade?.gain ?? 1} ${upgrade?.label ?? key.toUpperCase()} (-${cost} PM)`);
  };
  const sellUpgrade = (key: keyof StatUpgrades) => {
    if (statUpgrades[key] <= 0) return;
    onUpdate({
      stat_upgrades: { ...statUpgrades, [key]: statUpgrades[key] - 1 },
    });
  };

  const canBuyNode = (node: SkillBranch["nodes"][0]) => {
    if (purchased.has(node.id)) return { ok: false, why: "Já adquirida" };
    if (currentRank < node.minRank) return { ok: false, why: `Requer Rank ${node.minRank}` };
    for (const req of node.requires || [])
      if (!purchased.has(req)) return { ok: false, why: "Requisito faltando" };
    for (const ar of node.attrReqs || [])
      if ((attributes[ar.attr] ?? 0) < ar.value)
        return { ok: false, why: `Requer ${ar.attr} ≥ ${ar.value}` };
    if (remaining < node.cost) return { ok: false, why: `Faltam ${node.cost - remaining} PM` };
    return { ok: true, why: "" };
  };

  const buyNode = (node: SkillBranch["nodes"][0]) => {
    const check = canBuyNode(node);
    if (!check.ok) {
      toast.error(check.why);
      return;
    }
    const newAbility: Ability = {
      id: `${SKILL_ABILITY_PREFIX}${node.id}`,
      nome: node.name,
      descricao: node.desc,
      modificador: `${node.cost} PM`,
    };
    onUpdate({
      purchased_skills: [...purchasedSkills, node.id],
      abilities: [...abilities.filter((a) => a.id !== newAbility.id), newAbility],
    });
    toast.success(`${node.name} adquirida!`);
  };

  const refundNode = (node: SkillBranch["nodes"][0]) => {
    if (!purchased.has(node.id)) return;
    const blockedBy = branches
      .flatMap((b) => b.nodes)
      .find((n) => purchased.has(n.id) && (n.requires || []).includes(node.id));
    if (blockedBy) {
      toast.error(`Reembolso bloqueado: ${blockedBy.name} depende disto.`);
      return;
    }
    onUpdate({
      purchased_skills: purchasedSkills.filter((id) => id !== node.id),
      abilities: abilities.filter((a) => a.id !== `${SKILL_ABILITY_PREFIX}${node.id}`),
    });
    toast.success(`${node.name} reembolsada.`);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-primary/10 to-card border-primary/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-muted-foreground uppercase">PM Totais</div>
            <div className="font-cinzel text-3xl font-bold text-primary">{totalPM}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Gastos</div>
            <div className="font-cinzel text-3xl font-bold text-muted-foreground">{pmSpent}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase">Disponíveis</div>
            <div
              className={`font-cinzel text-3xl font-bold ${remaining > 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {remaining}
            </div>
          </div>
        </div>
        <div className="mt-3 w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${Math.min(100, (pmSpent / Math.max(1, totalPM)) * 100)}%` }}
          />
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-3">Aprimorar Atributos Vitais</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {UPGRADE_KEYS.map(({ key, label, gain, color }) => {
            const level = statUpgrades[key];
            const cost = upgradeCostAt(upgradeCosts[key], level);
            return (
              <div key={key} className="bg-secondary/40 rounded-lg p-3 text-center">
                <div className={`text-xs font-bold uppercase ${color}`}>{label}</div>
                <div className="text-2xl font-bold my-1">+{level * gain}</div>
                <div className="text-[10px] text-muted-foreground">{level} aprimoramento(s)</div>
                <div className="text-[10px] text-muted-foreground mb-2">próximo: {cost} PM</div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 flex-1 px-0"
                    disabled={!canEdit || level <= 0}
                    onClick={() => sellUpgrade(key)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 flex-1 px-0"
                    disabled={!canEdit || remaining < cost}
                    onClick={() => buyUpgrade(key)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {branches.map((branch) => (
        <Card key={branch.id} className="p-4">
          <h3 className="font-cinzel font-bold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: branch.color }} />
            {branch.label}
          </h3>
          {branch.nodes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sem habilidades neste ramo.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 pb-2 snap-x snap-mandatory [scrollbar-width:thin]">
              <div className="flex gap-3 px-1" style={{ width: "max-content" }}>
                {Array.from({ length: Math.ceil(branch.nodes.length / 2) }).map((_, colIdx) => {
                  const colNodes = branch.nodes.slice(colIdx * 2, colIdx * 2 + 2);
                  return (
                    <div key={colIdx} className="flex flex-col gap-3 w-[260px] shrink-0 snap-start">
                      {colNodes.map((node) => {
                        const isPurchased = purchased.has(node.id);
                        const check = canBuyNode(node);
                        const locked = !isPurchased && !check.ok;
                        const reqMissing = locked && check.why.startsWith("Requisito");
                        const rankMissing = locked && check.why.startsWith("Requer Rank");
                        const attrMissing = locked && /Requer [A-Z]{3}/.test(check.why);
                        const hideDesc = reqMissing || rankMissing || attrMissing;
                        return (
                          <div
                            key={node.id}
                            className={`rounded-lg p-3 border transition-all ${
                              isPurchased
                                ? "bg-primary/10 border-primary/50"
                                : locked
                                  ? "bg-secondary/30 border-border opacity-70"
                                  : "bg-secondary/60 border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-cinzel font-bold text-sm">
                                {hideDesc ? "???" : node.name}
                              </h4>
                              {isPurchased ? (
                                <Check className="w-4 h-4 text-primary shrink-0" />
                              ) : locked ? (
                                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              ) : null}
                            </div>
                            {!hideDesc && (
                              <p className="text-xs text-muted-foreground mt-1">{node.desc}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-background/40">
                                Custo: {node.cost} PM
                              </span>
                              {node.minRank > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-background/40">
                                  Rank {node.minRank}+
                                </span>
                              )}
                              {(node.attrReqs || []).map((a, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-background/40">
                                  {a.attr} ≥ {a.value}
                                </span>
                              ))}
                            </div>
                            {canEdit && (
                              <div className="mt-3">
                                {isPurchased ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full h-7 text-xs"
                                    onClick={() => refundNode(node)}
                                  >
                                    Reembolsar
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    disabled={!check.ok}
                                    onClick={() => buyNode(node)}
                                  >
                                    {check.ok ? "Adquirir" : check.why}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
