import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronDown,
  Gauge,
  Lock,
  Minus,
  Plus,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
      <Card className="tadeon-skill-summary tadeon-skill-ledger">
        <div className="tadeon-skill-ledger__heading">
          <div className="tadeon-skill-ledger__icon" aria-hidden="true">
            <WandSparkles />
          </div>
          <div className="min-w-0 flex-1">
            <p className="tadeon-eyebrow">Trilha de aprimoramento</p>
            <h2>Potencial em movimento</h2>
            <p>Distribua PM entre recursos vitais e habilidades liberadas pelo Rank atual.</p>
          </div>
          <div className="tadeon-skill-ledger__rank">
            <Gauge aria-hidden="true" />
            <span>Rank</span>
            <strong>{currentRank}</strong>
          </div>
        </div>
        <div className="tadeon-skill-ledger__metrics">
          <div>
            <span>PM totais</span>
            <strong>{totalPM}</strong>
          </div>
          <div>
            <span>Investidos</span>
            <strong>{pmSpent}</strong>
          </div>
          <div data-state={remaining >= 0 ? "available" : "overdrawn"}>
            <span>Disponíveis</span>
            <strong>{remaining}</strong>
          </div>
        </div>
        <div className="tadeon-skill-ledger__progress" aria-label={`${pmSpent} de ${totalPM} PM investidos`}>
          <div
            className="tadeon-skill-ledger__progress-value"
            style={{ width: `${Math.min(100, (pmSpent / Math.max(1, totalPM)) * 100)}%` }}
          />
        </div>
      </Card>

      <Card className="tadeon-skill-summary tadeon-vital-upgrades">
        <div className="tadeon-vital-upgrades__heading">
          <div>
            <p className="tadeon-eyebrow">Aprimoramentos permanentes</p>
            <h3>Atributos vitais</h3>
          </div>
          <p>Os limites acompanham automaticamente o Rank da ficha.</p>
        </div>
        <div className="tadeon-vital-upgrades__grid">
          {UPGRADE_KEYS.map(({ key, label, gain, color }) => {
            const level = statUpgrades[key];
            const cost = upgradeCostAt(upgradeCosts[key], level);
            const maxLevel = maxUpgradeLevel(key);
            const atLimit = level >= maxLevel;
            return (
              <div key={key} className="tadeon-vital-upgrade" data-upgrade={key}>
                <div className="tadeon-vital-upgrade__topline">
                  <span className={`tadeon-vital-upgrade__label ${color}`}>{label}</span>
                  <span>{level}/{maxLevel}</span>
                </div>
                <div className="tadeon-vital-upgrade__value">+{level * gain}</div>
                <div className="tadeon-vital-upgrade__detail">{level} aprimoramento(s)</div>
                <div className="tadeon-vital-upgrade__cost">
                  {atLimit ? `limite no Rank ${currentRank}` : `próximo: ${cost} PM`}
                </div>
                <div className="tadeon-vital-upgrade__actions">
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
          style={{ "--branch-color": branch.color } as React.CSSProperties}
        >
          <div className="tadeon-skill-branch__heading">
            <span className="tadeon-skill-branch__mark" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="tadeon-eyebrow">Ramo de habilidade</p>
              <h3>{branch.label}</h3>
              <p>
              Seis escolhas por Tier. Requisitos mecânicos são validados; requisitos narrativos
              permanecem registrados para a mesa.
              </p>
            </div>
            <div className="tadeon-skill-branch__progress">
              <strong>{branch.nodes.filter((node) => purchased.has(node.id)).length}</strong>
              <span>de {branch.nodes.length}</span>
            </div>
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
                    <Collapsible
                      key={tierRank}
                      open={!collapsed}
                      onOpenChange={() => toggleTier(tierKey)}
                      className="tadeon-skill-tier"
                    >
                      <CollapsibleTrigger className="tadeon-skill-tier__trigger">
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
                      </CollapsibleTrigger>
                      <CollapsibleContent className="tadeon-skill-tier__content">
                        <div className="tadeon-skill-tier__content-inner grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {tierNodes.map((node, nodeIndex) => {
                            const isPurchased = purchased.has(node.id);
                            const check = canBuyNode(node);
                            const locked = !isPurchased && !check.ok;
                            return (
                              <div
                                key={node.id}
                                className={`tadeon-skill-node flex min-h-56 flex-col rounded-xl border p-4 ${
                                  isPurchased
                                    ? "bg-primary/10 border-primary/50 shadow-[0_12px_40px_-28px_var(--primary)]"
                                    : locked
                                      ? "bg-secondary/20 border-border/70"
                                      : "bg-secondary/35 border-border hover:border-primary/50"
                                }`}
                                style={{ "--skill-index": nodeIndex } as React.CSSProperties}
                                data-state={isPurchased ? "purchased" : locked ? "locked" : "available"}
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
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
