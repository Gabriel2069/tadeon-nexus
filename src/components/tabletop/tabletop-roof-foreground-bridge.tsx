import { useEffect, useRef } from "react";
import { entityIsBelowRoof } from "@/lib/tabletop/tabletop-structure-editor";
import { isRoofStructure, structureChannels } from "@/lib/tabletop/tabletop-spatial";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopStructureType } from "@/lib/tabletop/tabletop-spatial";
import type { TabletopVisibilityState, TabletopWall } from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";

const TOKEN_TYPES = new Set<TabletopEntity["type"]>(["token", "character", "npc", "creature"]);
type RoofType = Extract<TabletopStructureType, "roof_visible" | "roof_cutaway" | "roof_hidden">;
type VisibilityInternals = { visibilityState?: TabletopVisibilityState };

type RoofCanonical = {
  type: RoofType;
  opacity: number;
  autoCutaway: boolean;
};

type RoofTarget = RoofCanonical & { occupied: boolean };

function relevantTokens(snapshot: TabletopSnapshot) {
  return snapshot.scene.entities.filter((entity) => TOKEN_TYPES.has(entity.type) && !entity.hidden);
}

function roofType(value: TabletopStructureType): RoofType {
  return value === "roof_hidden" || value === "roof_cutaway" ? value : "roof_visible";
}

function authorState(wall: TabletopWall): RoofCanonical {
  const type = roofType(wall.wallType);
  const channels = structureChannels(type, wall.properties);
  return {
    type,
    opacity: Math.max(0, Math.min(1, channels.roofOpacity ?? (type === "roof_cutaway" ? 0.28 : type === "roof_hidden" ? 0 : 1))),
    autoCutaway: Boolean(channels.roofAutoCutaway),
  };
}

function appliedSignature(wall: TabletopWall) {
  const channels = structureChannels(wall.wallType, wall.properties);
  return `${wall.wallType}:${Number(channels.roofOpacity ?? 1).toFixed(3)}`;
}

/**
 * Roof is persistent architecture; cutaway is a derived rendering state.
 * Moving tokens only changes the local visibility projection. The authored roof
 * type/properties remain canonical and are never written by this bridge.
 */
export function TabletopRoofForegroundBridge() {
  const canonical = useRef(new Map<string, RoofCanonical>());
  const derivedSignature = useRef(new Map<string, string>());
  const currentOpacity = useRef(new Map<string, number>());
  const targets = useRef(new Map<string, RoofTarget>());
  const applying = useRef(false);
  const frame = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    const paintFrame = (time: number) => {
      frame.current = 0;
      const runtime = currentTabletopRuntime();
      const state = (runtime?.engine as unknown as VisibilityInternals | undefined)?.visibilityState;
      if (!runtime || !state || !targets.current.size) return;
      const dt = Math.min(48, Math.max(8, time - lastTime.current));
      lastTime.current = time;
      let unsettled = false;
      const nextWalls = state.walls.map((wall) => {
        const target = targets.current.get(wall.id);
        if (!target) return wall;
        const previous = currentOpacity.current.get(wall.id) ?? authorState(wall).opacity;
        const targetOpacity = target.type === "roof_hidden"
          ? 0
          : target.occupied && target.type === "roof_visible"
            ? Math.min(0.22, target.opacity)
            : target.opacity;
        const blend = Math.min(1, dt / 170);
        const opacity = previous + (targetOpacity - previous) * blend;
        currentOpacity.current.set(wall.id, opacity);
        if (Math.abs(opacity - targetOpacity) > 0.012) unsettled = true;
        const visualType: RoofType = target.type === "roof_visible" && target.occupied ? "roof_cutaway" : target.type;
        const nextWall = {
          ...wall,
          wallType: visualType,
          properties: { ...structureChannels(visualType, wall.properties), roofOpacity: opacity, roofAutoCutaway: target.autoCutaway },
        };
        derivedSignature.current.set(wall.id, appliedSignature(nextWall));
        return nextWall;
      });
      applying.current = true;
      runtime.engine.setVisibility({ ...state, walls: nextWalls }, false);
      applying.current = false;
      if (unsettled) frame.current = requestAnimationFrame(paintFrame);
    };

    const schedulePaint = () => {
      if (!frame.current) {
        lastTime.current = performance.now();
        frame.current = requestAnimationFrame(paintFrame);
      }
    };

    const sync = (snapshot?: TabletopSnapshot | null) => {
      if (applying.current) return;
      const runtime = currentTabletopRuntime();
      const current = snapshot ?? runtime?.snapshot() ?? null;
      if (!runtime || !current) return;
      const state = (runtime.engine as unknown as VisibilityInternals).visibilityState;
      if (!state) return;
      const tokens = relevantTokens(current);
      const liveRoofIds = new Set<string>();

      for (const wall of state.walls) {
        if (!isRoofStructure(wall.wallType)) continue;
        liveRoofIds.add(wall.id);
        const previousDerived = derivedSignature.current.get(wall.id);
        const currentSignature = appliedSignature(wall);
        // A value different from our last projection came from persistence/editor.
        // Adopt it as the new author truth before deriving the next frame.
        if (!canonical.current.has(wall.id) || (previousDerived && previousDerived !== currentSignature)) {
          canonical.current.set(wall.id, authorState(wall));
          currentOpacity.current.set(wall.id, authorState(wall).opacity);
        }
        const author = canonical.current.get(wall.id) ?? authorState(wall);
        const occupied = author.type === "roof_visible" && author.autoCutaway && tokens.some((token) => {
          if (token.levelId && wall.levelId && token.levelId !== wall.levelId) return false;
          return entityIsBelowRoof(token, wall);
        });
        targets.current.set(wall.id, { ...author, occupied });
      }

      for (const id of [...canonical.current.keys()]) {
        if (liveRoofIds.has(id)) continue;
        canonical.current.delete(id);
        targets.current.delete(id);
        currentOpacity.current.delete(id);
        derivedSignature.current.delete(id);
      }
      if (liveRoofIds.size) schedulePaint();
    };

    const onRender = (event: Event) => sync((event as CustomEvent<TabletopSnapshot>).detail);
    const onDestroyed = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      canonical.current.clear();
      targets.current.clear();
      currentOpacity.current.clear();
      derivedSignature.current.clear();
      applying.current = false;
    };
    sync();
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  return null;
}
