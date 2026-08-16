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
  "Força dos vínculos": 0.72,
  "Distância-base": 230,
  Repulsão: 2.2,
  Centro: 0.34,
  "Agrupamento por domínio": 0.24,
  "Aparecimento dos rótulos": 0.84,
};

function setRangeValue(input: HTMLInputElement, value: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function tuneKnowledgeGraph() {
  const settings = Array.from(document.querySelectorAll<HTMLElement>(".tadeon-brain-slider"));
  if (!settings.length) return;
  const root = settings[0]?.closest<HTMLElement>(".tadeon-knowledge-graph, .tadeon-brain-shell, [role='dialog']");
  if (!root || root.dataset.tadeonObsidianPreset === "true") return;
  let applied = 0;
  for (const row of settings) {
    const text = row.querySelector("span")?.textContent ?? "";
    const entry = Object.entries(GRAPH_PRESETS).find(([label]) => text.includes(label));
    const input = row.querySelector<HTMLInputElement>('input[type="range"]');
    if (!entry || !input) continue;
    const [, value] = entry;
    setRangeValue(input, Math.max(Number(input.min), Math.min(Number(input.max), value)));
    applied += 1;
  }
  if (applied >= 4) {
    root.dataset.tadeonObsidianPreset = "true";
    window.setTimeout(() => {
      const fit = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
        /enquadr|ajustar|fit/i.test(`${button.title ?? ""} ${button.getAttribute("aria-label") ?? ""}`),
      );
      fit?.click();
    }, 120);
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
    let frame = 0;
    const scan = () => {
      if (window.location.pathname === "/nexus") tuneKnowledgeGraph();
      if (window.location.pathname.startsWith("/sheet/")) {
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
      frame = window.requestAnimationFrame(scan);
    };
    frame = window.requestAnimationFrame(scan);
    return () => window.cancelAnimationFrame(frame);
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
