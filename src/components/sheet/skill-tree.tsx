import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Lock, Minus, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type {
  Attributes,
  SkillBranch,
  StatUpgrades,
  RankRow,
  Ability,
  UpgradeCosts,
  WeaponProficiency,
} from "@/lib/sheet-types";
import {
  calcTotalPM,
  maxDefenseUpgradeLevels,
  maxResourceUpgradeLevels,
  skillNodeRequirementFailure,
  upgradeCostAt,
  SKILL_ABILITY_PREFIX,
} from "@/lib/sheet-types";

interface Props {
  exposure: number;
  equilibrium: number;
  attributes: Attributes;
  skills: Record<string, number>;
  weaponProficiency: WeaponProficiency;
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
  equilibrium,
  attributes,
  skills,
  weaponProficiency,
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
  const [collapsedTiers, setCollapsedTiers] = useState<Set<string>>(() => new Set());
  const purchased = new Set(purchasedSkills);
  const nodesById = useMemo(
    () => new Map(branches.flatMap((branch) => branch.nodes).map((node) => [node.id, node])),
    [branches],
  );
  const freeTierOneRemaining = Math.max(
    0,
    2 -
      purchasedSkills.filter((id) => {
        const node = nodesById.get(id);
        return node?.minRank === 0;
      }).length,
  );

  const toggleTier = (tierKey: string) => {
    setCollapsedTiers((current) => {
      const next = new Set(current);
      if (next.has(tierKey)) next.delete(tierKey);
      else next.add(tierKey);
      return next;
    });
  };

  const maxUpgradeLevel = (key: keyof StatUpgrades) =>
    key === "def" ? maxDefenseUpgradeLevels(currentRank) : maxResourceUpgradeLevels(currentRank);

  const buyUpgrade = (key: keyof StatUpgrades) => {
    if (statUpgrades[key] >= maxUpgradeLevel(key)) {
      toast.error(`Limite deste Rank atingido para ${key.toUpperCase()}.`);
      return;
    }
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
    const requirementFailure = skillNodeRequirementFailure(node, {
      attributes,
      skills,
      equilibrium,
      weaponProficiency,
      purchasedSkills,
      branches,
    });
    if (requirementFailure) return { ok: false, why: requirementFailure };
    const effectiveCost = node.minRank === 0 && freeTierOneRemaining > 0 ? 0 : node.cost;
    if (remaining < effectiveCost)
      return { ok: false, why: `Faltam ${effectiveCost - remaining} PM`, effectiveCost };
    return { ok: true, why: "", effectiveCost };
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
      modificador: check.effectiveCost === 0 ? "Habilidade inicial" : `${node.cost} PM`,
    };
    onUpdate({
      purchased_skills: [...purchasedSkills, node.id],
      abilities: [...abilities.filter((a) => a.id !== newAbility.id), newAbility],
    });
    toast.success(
      check.effectiveCost === 0
        ? `${node.name} adquirida como Habilidade inicial.`
        : `${node.name} adquirida!`,
    );
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
    <div className="tadeon-sheet-skill-tree space-y-4">
      <Card className="tadeon-skill-summary overflow-hidden border-primary/30 bg-[linear-gradient(135deg,rgba(113,107,123,.18),transparent_58%)] p-4">
        <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-4">
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
              className={`font-cinzel text-3xl font-bold ${remaining >= 0 ? "text-emerald-400" : "text-red-400"}`}
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

      <Card className="tadeon-skill-summary p-4">
        <h3 className="font-cinzel font-bold mb-3">Aprimorar Atributos Vitais</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {UPGRADE_KEYS.map(({ key, label, gain, color }) => {
            const level = statUpgrades[key];
            const cost = upgradeCostAt(upgradeCosts[key], level);
            const maxLevel = maxUpgradeLevel(key);
            const atLimit = level >= maxLevel;
            return (
              <div key={key} className="bg-secondary/40 rounded-lg p-3 text-center">
                <div className={`text-xs font-bold uppercase ${color}`}>{label}</div>
                <div className="text-2xl font-bold my-1">+{level * gain}</div>
                <div className="text-[10px] text-muted-foreground">{level} aprimoramento(s)</div>
                <div className="text-[10px] text-muted-foreground mb-2">
                  {atLimit ? `limite no Rank ${currentRank}` : `próximo: ${cost} PM`}
                </div>
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
                    disabled={!canEdit || remaining < cost || atLimit}
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

      {freeTierOneRemaining > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>
            Você ainda possui <strong>{freeTierOneRemaining}</strong>{" "}
            {freeTierOneRemaining === 1
              ? "Habilidade inicial gratuita"
              : "Habilidades iniciais gratuitas"}
            .
          </span>
        </div>
      )}

      {branches.map((branch) => (
        <Card
          key={branch.id}
          className="tadeon-skill-branch overflow-hidden border-border/70"
          style={{ boxShadow: `inset 3px 0 0 ${branch.color}` }}
        >
          <div className="border-b border-border/60 bg-secondary/20 px-5 py-4">
            <h3 className="font-cinzel font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: branch.color }} />
              Ramo {branch.label}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Seis escolhas por Tier. Requisitos mecânicos são validados; requisitos narrativos
              permanecem registrados para a mesa.
            </p>
          </div>
          {branch.nodes.length === 0 ? (
            <p className="p-5 text-xs text-muted-foreground italic">Sem habilidades neste ramo.</p>
          ) : (
            <div className="space-y-6 p-4 md:p-5">
              {[0, 25, 50, 75]
                .filter((tierRank) => tierRank <= currentRank)
                .map((tierRank, tierIndex) => {
                  const tierNodes = branch.nodes.filter((node) => node.minRank === tierRank);
                  const tierKey = `${branch.id}:${tierRank}`;
                  const collapsed = collapsedTiers.has(tierKey);
                  return (
                    <section key={tierRank}>
                      <button
                        type="button"
                        className="mb-3 flex w-full items-center gap-3 text-left"
                        aria-expanded={!collapsed}
                        onClick={() => toggleTier(tierKey)}
                      >
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                          Tier {["I", "II", "III", "IV"][tierIndex]}
                        </span>
                        <span className="h-px flex-1 bg-border/70" />
                        <span className="text-[10px] text-muted-foreground">
                          {tierRank === 0 ? "Criação" : `Rank ${tierRank}+`} · {tierIndex + 1} PM
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-180"}`}
                          aria-hidden="true"
                        />
                      </button>
                      {!collapsed && (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {tierNodes.map((node) => {
                            const isPurchased = purchased.has(node.id);
                            const check = canBuyNode(node);
                            const locked = !isPurchased && !check.ok;
                            return (
                              <div
                                key={node.id}
                                className={`tadeon-skill-node flex min-h-56 flex-col rounded-xl border p-4 transition-all ${
                                  isPurchased
                                    ? "bg-primary/10 border-primary/50 shadow-[0_12px_40px_-28px_var(--primary)]"
                                    : locked
                                      ? "bg-secondary/20 border-border/70"
                                      : "bg-secondary/35 border-border hover:-translate-y-0.5 hover:border-primary/50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-cinzel font-bold text-sm">{node.name}</h4>
                                  {isPurchased ? (
                                    <Check className="w-4 h-4 text-primary shrink-0" />
                                  ) : locked ? (
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  ) : null}
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                  {node.desc}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-background/40">
                                    {node.minRank === 0 && freeTierOneRemaining > 0
                                      ? "Inicial: 0 PM"
                                      : `Custo: ${node.cost} PM`}
                                  </span>
                                  {node.minRank > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-background/40">
                                      Rank {node.minRank}+
                                    </span>
                                  )}
                                  {node.requirementsText && (
                                    <span className="px-1.5 py-0.5 rounded bg-background/40">
                                      {node.requirementsText}
                                    </span>
                                  )}
                                </div>
                                {canEdit && (
                                  <div className="mt-auto pt-4">
                                    {isPurchased ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="min-h-10 w-full text-xs"
                                        onClick={() => refundNode(node)}
                                      >
                                        Reembolsar
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="min-h-10 w-full text-xs"
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
                      )}
                    </section>
                  );
                })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
