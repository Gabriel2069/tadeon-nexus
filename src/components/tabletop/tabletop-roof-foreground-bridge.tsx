import { useEffect, useRef } from "react";
import { entityIsBelowRoof } from "@/lib/tabletop/tabletop-structure-editor";
import { isRoofStructure, structureChannels } from "@/lib/tabletop/tabletop-spatial";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";

const TOKEN_TYPES = new Set<TabletopEntity["type"]>(["token", "character", "npc", "creature"]);

type VisibilityInternals = { visibilityState?: TabletopVisibilityState };

function relevantTokens(snapshot: TabletopSnapshot) {
  return snapshot.scene.entities.filter((entity) => TOKEN_TYPES.has(entity.type) && !entity.hidden);
}

function canonicalType(value: string | undefined) {
  return value === "roof_hidden" || value === "roof_cutaway" ? value : "roof_visible";
}

/**
 * Roof is persistent architecture; cutaway is a derived rendering state.
 * This bridge never saves cutaway transitions, so moving a token cannot dirty
 * the scene or rewrite the author's roof state.
 */
export function TabletopRoofForegroundBridge() {
  const canonical = useRef(new Map<string, "roof_visible" | "roof_cutaway" | "roof_hidden">());
  const lastFingerprint = useRef("");
  const applying = useRef(false);

  useEffect(() => {
    const sync = (snapshot?: TabletopSnapshot | null) => {
      if (applying.current) return;
      const runtime = currentTabletopRuntime();
      const current = snapshot ?? runtime?.snapshot() ?? null;
      if (!runtime || !current) return;
      const state = (runtime.engine as unknown as VisibilityInternals).visibilityState;
      if (!state) return;
      const tokens = relevantTokens(current);
      const roofs = state.walls.filter((wall) => isRoofStructure(wall.wallType));
      if (!roofs.length) return;

      for (const roof of roofs) {
        if (!canonical.current.has(roof.id)) canonical.current.set(roof.id, canonicalType(roof.wallType));
      }
      const desired = new Map<string, string>();
      for (const roof of roofs) {
        const original = canonical.current.get(roof.id) ?? "roof_visible";
        const channels = structureChannels(original, roof.properties);
        const occupied = Boolean(channels.roofAutoCutaway) && tokens.some((token) => {
          if (token.levelId && roof.levelId && token.levelId !== roof.levelId) return false;
          return entityIsBelowRoof(token, roof);
        });
        desired.set(roof.id, original === "roof_visible" && occupied ? "roof_cutaway" : original);
      }
      const fingerprint = [...desired].map(([id, type]) => `${id}:${type}`).sort().join("|");
      if (fingerprint === lastFingerprint.current) return;
      lastFingerprint.current = fingerprint;
      const next: TabletopVisibilityState = {
        ...state,
        walls: state.walls.map((wall) => {
          const type = desired.get(wall.id);
          return type ? { ...wall, wallType: type as typeof wall.wallType } : wall;
        }),
      };
      applying.current = true;
      runtime.engine.setVisibility(next, false);
      applying.current = false;
    };

    const onRender = (event: Event) => sync((event as CustomEvent<TabletopSnapshot>).detail);
    const onDestroyed = () => {
      canonical.current.clear();
      lastFingerprint.current = "";
      applying.current = false;
    };
    sync();
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  return null;
}
