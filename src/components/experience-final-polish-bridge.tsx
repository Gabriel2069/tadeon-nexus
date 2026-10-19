import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, WandSparkles } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Ability } from "@/lib/sheet-types";

type SkillModifiers = Record<string, number>;
type PowerFormData = Record<string, unknown> & { skill_modifiers?: SkillModifiers };
const db = supabase as unknown as SupabaseClient;

function tuneSheetChrome() {
  const commandbar = document.querySelector<HTMLElement>(
    ".tadeon-sheet-page .tadeon-sheet-commandbar",
  );
  if (!commandbar) return;
  const actions = Array.from(commandbar.querySelectorAll<HTMLElement>("a,button"));
  const tabletop = actions.find((action) =>
    /(^|\s)(mesa|mesa nexus)(\s|$)/i.test(action.textContent?.trim() ?? ""),
  );
  if (tabletop) {
    tabletop.dataset.tadeonSheetTabletopAction = "true";
    tabletop.setAttribute(
      "aria-label",
      tabletop.getAttribute("aria-label") || "Abrir na Mesa Nexus",
    );
    tabletop.setAttribute("title", tabletop.getAttribute("title") || "Abrir na Mesa Nexus");
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
      if (window.location.pathname.startsWith("/sheet/")) {
        tuneSheetChrome();
        const popovers = Array.from(
          document.querySelectorAll<HTMLElement>('[data-slot="popover-content"], [role="dialog"]'),
        );
        const skill = popovers.find((popover) => {
          const title =
            popover.querySelector<HTMLElement>(".font-cinzel")?.textContent?.trim() ?? "";
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
        setSkillHost(null);
        setSkillPopover(null);
      }
      timer = window.setTimeout(scan, 180);
    };
    scan();
    return () => window.clearTimeout(timer);
  }, [modifierTab]);

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
        const row = data as unknown as {
          power_form_data?: PowerFormData | null;
          abilities?: Ability[] | null;
        };
        setManualModifiers(row.power_form_data?.skill_modifiers ?? {});
        setAbilities(row.abilities ?? []);
      });
    return () => {
      active = false;
    };
  }, [skillHost]);

  const passive = useMemo(() => passiveModifier(skillName, abilities), [abilities, skillName]);
  const manual = manualModifiers[skillName] ?? 0;

  const persistManual = useCallback(
    async (nextValue: number) => {
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
        const nextModifiers = nextPowerForm.skill_modifiers ?? {
          ...manualModifiers,
          [skillName]: nextValue,
        };
        setManualModifiers(nextModifiers);
        window.dispatchEvent(
          new CustomEvent("tadeon-sheet-skill-modifier", {
            detail: { skill: skillName, manual: nextValue, passive },
          }),
        );
      } finally {
        setSavingModifier(false);
      }
    },
    [manualModifiers, passive, role, savingModifier, sheetId, skillName],
  );

  return (
    <>
      {skillHost &&
        skillPopover &&
        createPortal(
          <div className="tadeon-skill-modifier-bridge">
            <div
              className="tadeon-skill-modifier-tabs"
              role="tablist"
              aria-label={`Treino e modificadores de ${skillName}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={modifierTab === "training"}
                onClick={() => setModifierTab("training")}
              >
                Treino
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={modifierTab === "modifiers"}
                onClick={() => setModifierTab("modifiers")}
              >
                <SlidersHorizontal /> Modificadores
              </button>
            </div>
            {modifierTab === "modifiers" && (
              <section className="tadeon-skill-modifier-panel">
                <header>
                  <WandSparkles />
                  <div>
                    <strong>{skillName}</strong>
                    <small>Modificadores não consomem PE.</small>
                  </div>
                </header>
                <label>
                  <span>Modificador do mestre</span>
                  <Input
                    type="number"
                    min={-50}
                    max={50}
                    value={manual}
                    disabled={role !== "mestre" || savingModifier}
                    onChange={(event) =>
                      setManualModifiers((current) => ({
                        ...current,
                        [skillName]: Number(event.target.value) || 0,
                      }))
                    }
                    onBlur={(event) =>
                      void persistManual(
                        Math.max(-50, Math.min(50, Number(event.target.value) || 0)),
                      )
                    }
                  />
                  <small>
                    {role === "mestre"
                      ? "Ajuste manual da condução."
                      : "Somente o mestre pode editar."}
                  </small>
                </label>
                <div className="tadeon-skill-modifier-passive">
                  <span>Habilidades passivas</span>
                  <strong>
                    {passive >= 0 ? "+" : ""}
                    {passive}
                  </strong>
                  <small>
                    Calculado automaticamente por habilidades que citam esta perícia e um
                    bônus/penalidade.
                  </small>
                </div>
                <footer>
                  Total adicional:{" "}
                  <strong>
                    {manual + passive >= 0 ? "+" : ""}
                    {manual + passive}
                  </strong>
                </footer>
              </section>
            )}
          </div>,
          skillHost,
        )}
    </>
  );
}
