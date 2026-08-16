import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, WandSparkles } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Ability } from "@/lib/sheet-types";

type SkillModifiers = Record<string, number>;
type PowerFormData = Record<string, unknown> & { skill_modifiers?: SkillModifiers };
const db = supabase as unknown as SupabaseClient;

const GRAPH_PRESETS: Record<string, number> = {
  "Força mínima visível": 0.16,
  "Afinidade mínima": 0.28,
  "Força dos vínculos": 0.62,
  "Distância-base": 260,
  Repulsão: 2.4,
  Centro: 0.08,
  "Agrupamento por domínio": 0.12,
  "Aparecimento dos rótulos": 0.98,
};

function setRangeValue(input: HTMLInputElement, value: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function tuneKnowledgeGraph() {
  const root = document.querySelector<HTMLElement>(".tadeon-knowledge-graph, .tadeon-brain-shell");
  if (!root || root.dataset.tadeonObsidianPreset === "true") return;

  const settingsToggle = root.querySelector<HTMLButtonElement>(".tadeon-brain-settings-toggle");
  const sliders = Array.from(root.querySelectorAll<HTMLElement>(".tadeon-brain-slider"));
  const hasPhysics = sliders.some((row) => (row.querySelector("span")?.textContent ?? "").includes("Distância-base"));

  // Force controls are mounted lazily. Open the panel once so the preset is
  // applied to the actual React state instead of only changing appearance.
  if (!hasPhysics && settingsToggle?.getAttribute("aria-expanded") !== "true") {
    root.dataset.tadeonObsidianTuning = "true";
    settingsToggle.click();
    return;
  }

  let applied = 0;
  for (const row of sliders) {
    const text = row.querySelector("span")?.textContent ?? "";
    const entry = Object.entries(GRAPH_PRESETS).find(([label]) => text.includes(label));
    const input = row.querySelector<HTMLInputElement>('input[type="range"]');
    if (!entry || !input) continue;
    const [, value] = entry;
    setRangeValue(input, Math.max(Number(input.min), Math.min(Number(input.max), value)));
    applied += 1;
  }

  if (applied >= 7) {
    root.dataset.tadeonObsidianPreset = "true";
    delete root.dataset.tadeonObsidianTuning;
    window.setTimeout(() => {
      const fit = root.querySelector<HTMLButtonElement>('button[aria-label="Reenquadrar grafo"]');
      fit?.click();
      if (settingsToggle?.getAttribute("aria-expanded") === "true") settingsToggle.click();
    }, 150);
  }
}

function normalizedCondition(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function conditionProgress(text: string) {
  const fraction = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (fraction) {
    const current = Number(fraction[1]);
    const maximum = Number(fraction[2]);
    if (maximum > 0) return Math.max(0, Math.min(1, current / maximum));
  }
  const stage = text.match(/(?:nivel|estagio|grau|fase)?\s*(\d+)/i);
  if (stage) return Math.max(0.25, Math.min(1, Number(stage[1]) / 4));
  return 0.42;
}

function tuneConditionVisuals() {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".tadeon-sheet-condition-chip, [data-condition], [class*='condition-chip']",
    ),
  );
  for (const chip of candidates) {
    const text = normalizedCondition(chip.textContent ?? "");
    const progress = conditionProgress(text);
    chip.style.setProperty("--condition-progress", progress.toFixed(2));
    if (/morrendo|dying/.test(text)) {
      chip.dataset.conditionSeverity = "critical";
      chip.style.setProperty("--condition-progress", Math.max(progress, 0.86).toFixed(2));
    } else if (/colapsando|colapso|collaps/.test(text)) {
      chip.dataset.conditionSeverity = "critical";
      chip.style.setProperty("--condition-progress", "1");
    } else if (/critico|grave|agoniz|incapacit|inconsciente/.test(text)) {
      chip.dataset.conditionSeverity = "danger";
      chip.style.setProperty("--condition-progress", Math.max(progress, 0.68).toFixed(2));
    } else {
      delete chip.dataset.conditionSeverity;
    }
  }
}

function passiveModifier(skill: string, abilities: Ability[]) {
  const normalizedSkill = skill.toLocaleLowerCase("pt-BR");
  return abilities.reduce((total, ability) => {
    const source = `${ability.nome} ${ability.modificador}`;
    const normalized = source.toLocaleLowerCase("pt-BR");
    if (!normalized.includes(normalizedSkill)) return total;
    if (!/(per[ií]cia|teste|skill|passiv|treino|b[oô]nus|modificador)/i.test(source)) return total;
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nearSkill = source.match(new RegExp(`${escaped}[^+\\-\\d]{0,36}([+-]\\s*\\d+)`, "i"));
    const generic = source.match(/([+-]\s*\d+)/);
    const value = Number((nearSkill?.[1] ?? generic?.[1] ?? "0").replace(/\s/g, ""));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function sheetIdFromLocation() {
  const match = window.location.pathname.match(/^\/sheet\/([^/]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function ExperienceFinalPolishBridge() {
  const { role } = useAuth();
  const [linkHost, setLinkHost] = useState<HTMLElement | null>(null);
  const [linksCollapsed, setLinksCollapsed] = useState(false);
  const [skillHost, setSkillHost] = useState<HTMLElement | null>(null);
  const [skillPopover, setSkillPopover] = useState<HTMLElement | null>(null);
  const [skillName, setSkillName] = useState("");
  const [modifierTab, setModifierTab] = useState<"training" | "modifiers">("training");
  const [manualModifiers, setManualModifiers] = useState<SkillModifiers>({});
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [savingModifier, setSavingModifier] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const scan = () => {
      if (window.location.pathname === "/nexus") tuneKnowledgeGraph();
      if (window.location.pathname.startsWith("/sheet/")) {
        tuneConditionVisuals();
        const panel = document.querySelector<HTMLElement>(".tadeon-link-panel");
        const heading = panel?.querySelector<HTMLElement>(".tadeon-link-panel__heading");
        if (panel && heading) {
          let host = heading.querySelector<HTMLElement>("[data-tadeon-link-toggle-host]");
          if (!host) {
            host = document.createElement("div");
            host.dataset.tadeonLinkToggleHost = "true";
            heading.append(host);
          }
          setLinkHost((current) => (current === host ? current : host));
          panel.dataset.collapsed = linksCollapsed ? "true" : "false";
        }

        const popovers = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="popover-content"], [role="dialog"]'));
        const skill = popovers.find((popover) => {
          const title = popover.querySelector<HTMLElement>(".font-cinzel")?.textContent?.trim() ?? "";
          return Boolean(title && /Treino atual/i.test(popover.textContent ?? ""));
        });
        if (skill) {
          const title = skill.querySelector<HTMLElement>(".font-cinzel")?.textContent?.trim() ?? "";
          let host = skill.querySelector<HTMLElement>("[data-tadeon-skill-modifier-host]");
          if (!host) {
            host = document.createElement("div");
            host.dataset.tadeonSkillModifierHost = "true";
            skill.prepend(host);
          }
          setSkillName(title);
          setSkillPopover(skill);
          setSkillHost(host);
          skill.dataset.modifierTab = modifierTab;
        } else {
          setSkillHost(null);
          setSkillPopover(null);
          setSkillName("");
          setModifierTab("training");
        }
      } else {
        setLinkHost(null);
        setSkillHost(null);
        setSkillPopover(null);
      }
      timer = window.setTimeout(scan, 180);
    };
    scan();
    return () => window.clearTimeout(timer);
  }, [linksCollapsed, modifierTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextId = sheetIdFromLocation();
    setSheetId(nextId);
    if (!nextId) return;
    let active = true;
    void supabase
      .from("character_sheets")
      .select("power_form_data,abilities")
      .eq("id", nextId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        const row = data as unknown as { power_form_data?: PowerFormData | null; abilities?: Ability[] | null };
        setManualModifiers(row.power_form_data?.skill_modifiers ?? {});
        setAbilities(row.abilities ?? []);
      });
    return () => { active = false; };
  }, [skillHost]);

  const passive = useMemo(() => passiveModifier(skillName, abilities), [abilities, skillName]);
  const manual = manualModifiers[skillName] ?? 0;

  const persistManual = useCallback(async (nextValue: number) => {
    if (!sheetId || role !== "mestre" || savingModifier) return;
    setSavingModifier(true);
    try {
      const { data, error } = await db.rpc("set_sheet_skill_modifier", {
        p_sheet_id: sheetId,
        p_skill: skillName,
        p_value: nextValue,
      });
      if (error) throw error;
      const nextPowerForm = (data ?? {}) as PowerFormData;
      const nextModifiers = nextPowerForm.skill_modifiers ?? { ...manualModifiers, [skillName]: nextValue };
      setManualModifiers(nextModifiers);
      window.dispatchEvent(new CustomEvent("tadeon-sheet-skill-modifier", { detail: { skill: skillName, manual: nextValue, passive } }));
    } finally {
      setSavingModifier(false);
    }
  }, [manualModifiers, passive, role, savingModifier, sheetId, skillName]);

  return (
    <>
      {linkHost && createPortal(
        <Button type="button" size="sm" variant="ghost" className="tadeon-link-collapse" aria-expanded={!linksCollapsed} onClick={() => setLinksCollapsed((value) => !value)}>
          {linksCollapsed ? <ChevronDown /> : <ChevronUp />}{linksCollapsed ? "Mostrar" : "Recolher"}
        </Button>,
        linkHost,
      )}
      {skillHost && skillPopover && createPortal(
        <div className="tadeon-skill-modifier-bridge">
          <div className="tadeon-skill-modifier-tabs" role="tablist" aria-label={`Treino e modificadores de ${skillName}`}>
            <button type="button" role="tab" aria-selected={modifierTab === "training"} onClick={() => setModifierTab("training")}>Treino</button>
            <button type="button" role="tab" aria-selected={modifierTab === "modifiers"} onClick={() => setModifierTab("modifiers")}><SlidersHorizontal /> Modificadores</button>
          </div>
          {modifierTab === "modifiers" && (
            <section className="tadeon-skill-modifier-panel">
              <header><WandSparkles /><div><strong>{skillName}</strong><small>Modificadores não consomem PE.</small></div></header>
              <label>
                <span>Modificador do mestre</span>
                <Input type="number" min={-50} max={50} value={manual} disabled={role !== "mestre" || savingModifier} onChange={(event) => setManualModifiers((current) => ({ ...current, [skillName]: Number(event.target.value) || 0 }))} onBlur={(event) => void persistManual(Math.max(-50, Math.min(50, Number(event.target.value) || 0)))} />
                <small>{role === "mestre" ? "Ajuste manual da condução." : "Somente o mestre pode editar."}</small>
              </label>
              <div className="tadeon-skill-modifier-passive"><span>Habilidades passivas</span><strong>{passive >= 0 ? "+" : ""}{passive}</strong><small>Calculado automaticamente por habilidades que citam esta perícia e um bônus/penalidade.</small></div>
              <footer>Total adicional: <strong>{manual + passive >= 0 ? "+" : ""}{manual + passive}</strong></footer>
            </section>
          )}
        </div>,
        skillHost,
      )}
    </>
  );
}