import { useEffect, useMemo, useRef, useState } from "react";
import { tabletopRegionBehavior, type TabletopSurfaceType } from "@/lib/tabletop/tabletop-regions";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { Point, TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-atmosphere.css";

interface AtmosphereRegion {
  id: string;
  surface: TabletopSurfaceType;
  tint?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  intensity: number;
}

type PowerTheme =
  | "neutral"
  | "fire"
  | "ice"
  | "storm"
  | "void"
  | "blood"
  | "nature"
  | "water"
  | "light"
  | "shadow";

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pseudo(seed: number, offset: number) {
  const value = Math.sin((seed + offset * 101.37) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function entityScreenBox(entity: TabletopEntity) {
  const runtime = currentTabletopRuntime();
  if (!runtime) return null;
  const center = runtime.worldToClient({
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  });
  const right = runtime.worldToClient({
    x: entity.x + entity.width,
    y: entity.y + entity.height / 2,
  });
  const bottom = runtime.worldToClient({
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height,
  });
  const width = Math.max(8, Math.hypot(right.x - center.x, right.y - center.y) * 2);
  const height = Math.max(8, Math.hypot(bottom.x - center.x, bottom.y - center.y) * 2);
  return {
    left: center.x - width / 2,
    top: center.y - height / 2,
    width,
    height,
  };
}

function surfaceIntensity(surface: TabletopSurfaceType, concealment: number) {
  switch (surface) {
    case "smoke":
      return Math.max(0.38, concealment);
    case "hazard":
      return 0.7;
    case "water":
      return 0.52;
    case "ice":
      return 0.42;
    case "foliage":
      return 0.48;
    case "mud":
      return 0.32;
    case "difficult":
      return 0.24;
    default:
      return 0.2;
  }
}

function inferPowerTheme(text: string): PowerTheme {
  const value = text.toLocaleLowerCase("pt-BR");
  if (/fogo|chama|incênd|brasa|calor|inferno|explos/.test(value)) return "fire";
  if (/gelo|frio|neve|geada|congel/.test(value)) return "ice";
  if (/raio|relâmp|trovão|tempest|elétr|choque/.test(value)) return "storm";
  if (/vazio|abismo|entrop|distor|ruptura/.test(value)) return "void";
  if (/sangue|hemorr|ferida|carne/.test(value)) return "blood";
  if (/planta|raiz|folha|flor|natureza|espinho|vinha/.test(value)) return "nature";
  if (/água|mar|onda|chuva|névoa|vapor/.test(value)) return "water";
  if (/luz|solar|brilho|radiante|cura|restaur|sagrado/.test(value)) return "light";
  if (/sombra|treva|escuro|noturno|ocult/.test(value)) return "shadow";
  return "neutral";
}

function useSnapshot() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);

  useEffect(() => {
    let frame = 0;
    let attempts = 0;
    const bootstrap = () => {
      const runtime = currentTabletopRuntime();
      if (runtime) {
        setSnapshot(runtime.snapshot());
        return;
      }
      if (attempts++ < 90) frame = window.requestAnimationFrame(bootstrap);
    };
    bootstrap();
    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      setSnapshot(detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    };
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  return snapshot;
}

function usePowerTheme() {
  const [theme, setTheme] = useState<PowerTheme>("neutral");
  const [active, setActive] = useState(false);
  const [pointer, setPointer] = useState<Point>(() =>
    typeof window === "undefined"
      ? { x: 0, y: 0 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  );

  useEffect(() => {
    const syncFromDock = () => {
      const dock = document.querySelector<HTMLElement>(".tadeon-tactical-dock");
      const powerMode = dock?.dataset.mode === "power";
      setActive(Boolean(powerMode));
      if (!powerMode) {
        setTheme("neutral");
        delete document.documentElement.dataset.tadeonPowerTheme;
        return;
      }
      const text = [
        dock?.querySelector<HTMLElement>(".tadeon-tactical-dock__readout.is-power strong")?.textContent,
        dock?.querySelector<HTMLElement>(".tadeon-tactical-dock__readout.is-power small")?.textContent,
      ]
        .filter(Boolean)
        .join(" ");
      const next = inferPowerTheme(text);
      setTheme(next);
      document.documentElement.dataset.tadeonPowerTheme = next;
    };
    const onTacticalState = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: string; text?: string }>).detail;
      const powerMode = detail?.mode === "power";
      setActive(powerMode);
      const next = powerMode ? inferPowerTheme(detail?.text ?? "") : "neutral";
      setTheme(next);
      if (powerMode) document.documentElement.dataset.tadeonPowerTheme = next;
      else delete document.documentElement.dataset.tadeonPowerTheme;
    };
    syncFromDock();
    window.addEventListener("tadeon-tabletop-tactical-state", onTacticalState);
    return () => {
      window.removeEventListener("tadeon-tabletop-tactical-state", onTacticalState);
      delete document.documentElement.dataset.tadeonPowerTheme;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let nextPointer = pointer;
    const flush = () => {
      frame = 0;
      setPointer(nextPointer);
    };
    const pointerMove = (event: PointerEvent) => {
      nextPointer = { x: event.clientX, y: event.clientY };
      if (!frame) frame = window.requestAnimationFrame(flush);
    };
    window.addEventListener("pointermove", pointerMove, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", pointerMove);
    };
  }, [active]);

  return { theme, active, pointer };
}

export function TabletopAtmosphereBridge() {
  const snapshot = useSnapshot();
  const { theme, active: powerActive, pointer } = usePowerTheme();
  const previousSceneId = useRef<string | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const sceneId = snapshot?.scene.id ?? null;
    if (!sceneId) {
      previousSceneId.current = null;
      return;
    }
    if (previousSceneId.current && previousSceneId.current !== sceneId) {
      setTransitioning(true);
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
      transitionTimer.current = window.setTimeout(() => setTransitioning(false), 720);
    }
    previousSceneId.current = sceneId;
    return () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    };
  }, [snapshot?.scene.id]);

  const regions = useMemo<AtmosphereRegion[]>(() => {
    if (!snapshot) return [];
    return snapshot.scene.entities
      .filter((entity) => !entity.hidden && entity.type === "area")
      .flatMap((entity) => {
        const behavior = tabletopRegionBehavior(entity);
        if (!behavior?.enabled || behavior.surface === "normal" || behavior.surface === "custom") return [];
        const box = entityScreenBox(entity);
        if (!box) return [];
        return [{
          id: entity.id,
          surface: behavior.surface,
          tint: behavior.tint,
          rotation: entity.rotation,
          intensity: surfaceIntensity(behavior.surface, behavior.concealment),
          ...box,
        }];
      })
      .slice(0, 18);
  }, [snapshot]);

  if (!snapshot) return null;

  return (
    <>
      <div className="tadeon-atmosphere-layer" aria-hidden="true">
        {regions.map((region) => {
          const seed = hashString(region.id);
          const particleCount = region.surface === "smoke" || region.surface === "hazard" ? 9 : 6;
          return (
            <div
              key={region.id}
              className="tadeon-atmosphere-region"
              data-surface={region.surface}
              style={{
                left: region.left,
                top: region.top,
                width: region.width,
                height: region.height,
                transform: `rotate(${region.rotation}deg)`,
                opacity: region.intensity,
                ...(region.tint ? ({ "--region-tint": region.tint } as React.CSSProperties) : {}),
              }}
            >
              <span className="tadeon-atmosphere-region__veil" />
              {Array.from({ length: particleCount }, (_, index) => (
                <i
                  key={index}
                  style={{
                    left: `${8 + pseudo(seed, index * 5 + 1) * 84}%`,
                    top: `${8 + pseudo(seed, index * 5 + 2) * 84}%`,
                    width: `${5 + pseudo(seed, index * 5 + 3) * 11}px`,
                    height: `${5 + pseudo(seed, index * 5 + 3) * 11}px`,
                    animationDelay: `${-pseudo(seed, index * 5 + 4) * 5.5}s`,
                    animationDuration: `${3.4 + pseudo(seed, index * 5 + 5) * 4.8}s`,
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {powerActive && (
        <div
          className="tadeon-power-particle-field"
          data-theme={theme}
          aria-hidden="true"
          style={{ left: pointer.x, top: pointer.y }}
        >
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 12;
            const radius = 24 + (index % 4) * 8;
            return (
              <i
                key={index}
                style={{
                  "--power-x": `${Math.cos(angle) * radius}px`,
                  "--power-y": `${Math.sin(angle) * radius}px`,
                  animationDelay: `${-(index % 6) * 0.16}s`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>
      )}

      {transitioning && (
        <div className="tadeon-scene-transition" aria-hidden="true">
          <span />
        </div>
      )}
    </>
  );
}
