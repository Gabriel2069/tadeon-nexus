import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, DoorOpen, Eye, Lightbulb, Plus, Radio, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import {
  normalizeTabletopRegionAutomation,
  tabletopRegionsForEntity,
  type TabletopRegionAutomationAction,
  type TabletopRegionAutomationRule,
  type TabletopRegionTrigger,
} from "@/lib/tabletop/tabletop-regions";
import { tabletopVisibilityService } from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-region-automation.css";

type Membership = Map<string, Set<string>>;

type RuntimeEventDetail = {
  entityId: string;
  regionId: string;
  ruleId: string;
  trigger: TabletopRegionTrigger;
};

function properties(entity: TabletopEntity) {
  return entity.properties && typeof entity.properties === "object" && !Array.isArray(entity.properties)
    ? (entity.properties as Record<string, unknown>)
    : {};
}

function regionObject(entity: TabletopEntity) {
  const source = properties(entity).region;
  return source && typeof source === "object" && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : {};
}

function automationFor(entity: TabletopEntity) {
  return normalizeTabletopRegionAutomation(regionObject(entity).automation);
}

function membershipFor(snapshot: TabletopSnapshot): Membership {
  const regions = snapshot.scene.entities.filter((entity) => entity.type === "area" && automationFor(entity).enabled);
  const result: Membership = new Map();
  for (const entity of snapshot.scene.entities) {
    if (entity.type === "area" || entity.hidden) continue;
    const inside = tabletopRegionsForEntity(snapshot.scene, entity)
      .map((entry) => entry.entity.id)
      .filter((id) => regions.some((region) => region.id === id));
    if (inside.length) result.set(entity.id, new Set(inside));
  }
  return result;
}

function ruleKey(regionId: string, entityId: string, ruleId: string) {
  return `${regionId}:${entityId}:${ruleId}`;
}

async function runActions(
  sceneId: string,
  entity: TabletopEntity,
  actions: TabletopRegionAutomationAction[],
) {
  const runtime = currentTabletopRuntime();
  if (!runtime) return;
  const visibilityActions = actions.filter(
    (action) => action.type === "fog" || action.type === "illumination" || action.type === "door",
  );
  if (visibilityActions.length) {
    const current = await tabletopVisibilityService.load(sceneId);
    let next = current;
    for (const action of visibilityActions) {
      if (action.type === "fog") next = { ...next, fogEnabled: action.enabled };
      if (action.type === "illumination") next = { ...next, globalIllumination: action.value };
      if (action.type === "door") {
        next = {
          ...next,
          walls: next.walls.map((wall) =>
            wall.id === action.wallId
              ? {
                  ...wall,
                  wallType: action.wallType,
                  blocksVision: action.wallType !== "door_open",
                  blocksMovement: action.wallType !== "door_open",
                }
              : wall,
          ),
        };
      }
    }
    const saved = await tabletopVisibilityService.save(sceneId, next);
    runtime.engine.setVisibility(saved.visibility, true);
  }

  for (const action of actions) {
    if (action.type === "director_cue") {
      window.dispatchEvent(
        new CustomEvent("tadeon-tabletop-director-run-cue", { detail: { cueId: action.cueId } }),
      );
    } else if (action.type === "audio") {
      window.dispatchEvent(new CustomEvent("tadeon-tabletop-region-audio", { detail: action }));
    } else if (action.type === "handout") {
      window.dispatchEvent(
        new CustomEvent("tadeon-tabletop-region-handout", {
          detail: { nodeId: action.nodeId, entityId: entity.id },
        }),
      );
    } else if (action.type === "condition") {
      window.dispatchEvent(
        new CustomEvent("tadeon-tabletop-region-condition", {
          detail: {
            entityId: entity.id,
            linkedSheetId: entity.linkedSheetId ?? null,
            conditionId: action.conditionId,
            operation: action.operation,
          },
        }),
      );
    } else if (action.type === "level") {
      runtime.engine.applyRemoteEntityPatch(entity.id, { levelId: action.levelId });
      window.dispatchEvent(
        new CustomEvent("tadeon-tabletop-region-level", {
          detail: { entityId: entity.id, levelId: action.levelId },
        }),
      );
    }
  }
}

function defaultRule(trigger: TabletopRegionTrigger): TabletopRegionAutomationRule {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    trigger,
    once: false,
    cooldownMs: trigger === "stay" ? 3000 : 0,
    actions: [{ type: "fog", enabled: true }],
  };
}

function actionLabel(action: TabletopRegionAutomationAction) {
  if (action.type === "fog") return action.enabled ? "Ativar fog" : "Desativar fog";
  if (action.type === "illumination") return `Luz ${Math.round(action.value * 100)}%`;
  if (action.type === "door") return `Porta · ${action.wallType.replace("door_", "")}`;
  if (action.type === "director_cue") return "Cue do Diretor";
  if (action.type === "audio") return action.command === "play" ? "Tocar áudio" : "Parar áudio";
  if (action.type === "handout") return "Revelar handout";
  if (action.type === "condition") return `${action.operation === "apply" ? "Aplicar" : "Remover"} condição`;
  return "Mudar andar";
}

export function TabletopRegionAutomationBridge() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const previousMembership = useRef<Membership>(new Map());
  const executedOnce = useRef(new Set<string>());
  const lastRun = useRef(new Map<string, number>());
  const running = useRef(false);

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const findPanel = () => {
      if (stopped) return;
      setPanel(document.querySelector<HTMLElement>(".tadeon-tabletop-panel"));
      timer = window.setTimeout(findPanel, 800);
    };
    findPanel();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const update = (event?: Event) => {
      const next =
        (event as CustomEvent<TabletopSnapshot> | undefined)?.detail ??
        currentTabletopRuntime()?.snapshot() ??
        null;
      setSnapshot(next);
    };
    update();
    window.addEventListener("tadeon-tabletop-render", update);
    return () => window.removeEventListener("tadeon-tabletop-render", update);
  }, []);

  useEffect(() => {
    if (!snapshot || running.current) return;
    const nextMembership = membershipFor(snapshot);
    const previous = previousMembership.current;
    previousMembership.current = nextMembership;
    const entities = new Map(snapshot.scene.entities.map((entity) => [entity.id, entity]));
    const regions = new Map(
      snapshot.scene.entities
        .filter((entity) => entity.type === "area")
        .map((entity) => [entity.id, entity]),
    );
    const jobs: Array<{
      entity: TabletopEntity;
      region: TabletopEntity;
      rule: TabletopRegionAutomationRule;
      trigger: TabletopRegionTrigger;
    }> = [];

    for (const entityId of new Set([...previous.keys(), ...nextMembership.keys()])) {
      const entity = entities.get(entityId);
      if (!entity) continue;
      const before = previous.get(entityId) ?? new Set<string>();
      const after = nextMembership.get(entityId) ?? new Set<string>();
      const entered = [...after].filter((id) => !before.has(id));
      const exited = [...before].filter((id) => !after.has(id));
      const stayed = [...after].filter((id) => before.has(id));
      for (const [trigger, regionIds] of [
        ["enter", entered],
        ["exit", exited],
        ["stay", stayed],
      ] as const) {
        for (const regionId of regionIds) {
          const region = regions.get(regionId);
          if (!region) continue;
          const automation = automationFor(region);
          for (const rule of automation.rules) {
            if (!rule.enabled || rule.trigger !== trigger) continue;
            const key = ruleKey(regionId, entityId, rule.id);
            if (rule.once && executedOnce.current.has(key)) continue;
            const last = lastRun.current.get(key) ?? 0;
            if (performance.now() - last < rule.cooldownMs) continue;
            jobs.push({ entity, region, rule, trigger });
          }
        }
      }
    }
    if (!jobs.length) return;

    running.current = true;
    void (async () => {
      for (const job of jobs.slice(0, 32)) {
        const key = ruleKey(job.region.id, job.entity.id, job.rule.id);
        try {
          await runActions(snapshot.scene.id, job.entity, job.rule.actions);
          lastRun.current.set(key, performance.now());
          if (job.rule.once) executedOnce.current.add(key);
          window.dispatchEvent(
            new CustomEvent<RuntimeEventDetail>("tadeon-tabletop-region-trigger", {
              detail: {
                entityId: job.entity.id,
                regionId: job.region.id,
                ruleId: job.rule.id,
                trigger: job.trigger,
              },
            }),
          );
        } catch {
          toast.error(`Automação da região “${job.region.label}” não pôde ser concluída.`);
        }
      }
    })().finally(() => {
      running.current = false;
    });
  }, [snapshot]);

  const selectedRegion = useMemo(() => {
    if (!snapshot || snapshot.selectedIds.length !== 1) return null;
    const entity = snapshot.scene.entities.find((item) => item.id === snapshot.selectedIds[0]);
    return entity?.type === "area" ? entity : null;
  }, [snapshot]);

  if (!panel || !selectedRegion) return null;
  const automation = automationFor(selectedRegion);
  const updateAutomation = (next: ReturnType<typeof automationFor>) => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const region = regionObject(selectedRegion);
    runtime.engine.updateSelectedProperties(
      {
        region: {
          ...region,
          automation: next,
        },
      },
      "Editar automação da região",
    );
  };
  const addRule = (trigger: TabletopRegionTrigger) =>
    updateAutomation({ ...automation, enabled: true, rules: [...automation.rules, defaultRule(trigger)] });
  const removeRule = (id: string) =>
    updateAutomation({ ...automation, rules: automation.rules.filter((rule) => rule.id !== id) });
  const updateRule = (id: string, patch: Partial<TabletopRegionAutomationRule>) =>
    updateAutomation({
      ...automation,
      rules: automation.rules.map((rule) => (rule.id === id ? { ...rule, ...patch, id } : rule)),
    });

  return createPortal(
    <section className="tadeon-region-automation" aria-label="Automações da região selecionada">
      <header>
        <span><Zap aria-hidden="true" /></span>
        <div><small>Região viva</small><strong>Automações</strong></div>
        <Switch
          checked={automation.enabled}
          onCheckedChange={(enabled) => updateAutomation({ ...automation, enabled })}
          aria-label="Ativar automações desta região"
        />
      </header>
      <p>Entrada, saída e permanência podem reagir a fog, luz, portas, cues, áudio, fichas e andares. Só o mestre executa os efeitos.</p>
      <div className="tadeon-region-automation__quick">
        <Button size="sm" variant="outline" onClick={() => addRule("enter")}><DoorOpen /> Ao entrar</Button>
        <Button size="sm" variant="outline" onClick={() => addRule("exit")}><Eye /> Ao sair</Button>
        <Button size="sm" variant="outline" onClick={() => addRule("stay")}><Activity /> Enquanto estiver</Button>
      </div>
      <div className="tadeon-region-automation__rules">
        {automation.rules.map((rule, index) => (
          <article key={rule.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <select
                value={rule.trigger}
                onChange={(event) => updateRule(rule.id, { trigger: event.target.value as TabletopRegionTrigger })}
                aria-label={`Gatilho da regra ${index + 1}`}
              >
                <option value="enter">Ao entrar</option>
                <option value="exit">Ao sair</option>
                <option value="stay">Enquanto estiver</option>
              </select>
              <small>{rule.actions.map(actionLabel).join(" · ")}</small>
              <div>
                <label><Switch checked={rule.once} onCheckedChange={(once) => updateRule(rule.id, { once })} /> uma vez</label>
                <Input
                  type="number"
                  min={0}
                  max={3600}
                  step={0.5}
                  value={rule.cooldownMs / 1000}
                  onChange={(event) => updateRule(rule.id, { cooldownMs: Math.round(Math.max(0, Math.min(3600, Number(event.target.value))) * 1000) })}
                  aria-label={`Cooldown da regra ${index + 1}`}
                />
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => removeRule(rule.id)} aria-label={`Excluir regra ${index + 1}`}><Trash2 /></Button>
          </article>
        ))}
      </div>
      {automation.rules.length > 0 && (
        <div className="tadeon-region-automation__presets">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const rule = automation.rules[0];
              if (rule) updateRule(rule.id, { actions: [{ type: "fog", enabled: false }] });
            }}
          ><Eye /> Revelar área</Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const rule = automation.rules[0];
              if (rule) updateRule(rule.id, { actions: [{ type: "illumination", value: 0.32 }] });
            }}
          ><Lightbulb /> Escurecer</Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const rule = automation.rules[0];
              if (rule) updateRule(rule.id, { actions: [{ type: "audio", command: "play" }] });
            }}
          ><Radio /> Ambiente</Button>
        </div>
      )}
    </section>,
    panel,
  );
}
