import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { tabletopMediaKind } from "@/lib/tabletop/tabletop-media";
import { structureChannels, type TabletopStructureType } from "@/lib/tabletop/tabletop-spatial";
import { tabletopRegionsAtPoint } from "@/lib/tabletop/tabletop-regions";
import type { Point, TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";

const database = supabase as unknown as SupabaseClient;

type AudioNodeState = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  url: string;
};

type WallRow = {
  level_id: string | null;
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  wall_type: string;
  properties: unknown;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finite(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function center(entity: TabletopEntity): Point {
  return { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
}

function intersects(a: Point, b: Point, c: Point, d: Point) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(denominator) < 1e-8) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator;
  return t > 0.0001 && t < 0.9999 && u >= 0 && u <= 1;
}

function entityAudio(entity: TabletopEntity) {
  const properties = objectValue(entity.properties);
  const mediaKind = tabletopMediaKind(properties.mime_type, entity.assetUrl);
  const propertyUrl = typeof properties.audio_url === "string" ? properties.audio_url.trim() : "";
  const url = mediaKind === "audio" ? entity.assetUrl ?? "" : propertyUrl;
  if (!url || properties.audio_enabled === false) return null;
  return {
    url,
    loop: properties.audio_loop !== false,
    volume: Math.max(0, Math.min(1, finite(properties.audio_volume, 0.72))),
    radius: Math.max(32, Math.min(100_000, finite(properties.audio_radius, 512))),
    rolloff: Math.max(0.35, Math.min(4, finite(properties.audio_rolloff, 1.45))),
    occlusion: properties.audio_occlusion !== false,
  };
}

function wallTransmission(
  walls: WallRow[],
  from: Point,
  to: Point,
  levelId?: string | null,
) {
  let transmission = 1;
  for (const wall of walls) {
    if (levelId && wall.level_id && wall.level_id !== levelId) continue;
    if (!intersects(
      from,
      to,
      { x: finite(wall.x1), y: finite(wall.y1) },
      { x: finite(wall.x2), y: finite(wall.y2) },
    )) continue;
    const channels = structureChannels(
      wall.wall_type as TabletopStructureType,
      objectValue(wall.properties),
    );
    transmission *= channels.soundTransmission;
    if (transmission <= 0.025) return 0.025;
  }
  return Math.max(0.025, Math.min(1, transmission));
}

export function TabletopSpatialAudioBridge() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [walls, setWalls] = useState<WallRow[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef(new Map<string, AudioNodeState>());

  const audioSources = useMemo(
    () =>
      (snapshot?.scene.entities ?? []).flatMap((entity) => {
        const config = entityAudio(entity);
        return config ? [{ entity, config }] : [];
      }),
    [snapshot],
  );
  const hasAudio = audioSources.length > 0;
  const needsOcclusion = audioSources.some(({ config }) => config.occlusion);

  useEffect(() => {
    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      setSnapshot(detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    };
    const bootstrap = () => setSnapshot(currentTabletopRuntime()?.snapshot() ?? null);
    bootstrap();
    window.addEventListener("tadeon-tabletop-render", onRender);
    return () => window.removeEventListener("tadeon-tabletop-render", onRender);
  }, []);

  useEffect(() => {
    const sceneId = snapshot?.scene.id;
    if (!sceneId || sceneId === "local-scene" || !needsOcclusion) {
      setWalls([]);
      return;
    }
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      const { data, error } = await database
        .from("tabletop_walls")
        .select("level_id,x1,y1,x2,y2,wall_type,properties")
        .eq("scene_id", sceneId);
      if (active && !error) setWalls((data ?? []) as unknown as WallRow[]);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [needsOcclusion, snapshot?.scene.id]);

  useEffect(() => {
    if (!hasAudio) return;
    const unlock = () => {
      const AudioContextCtor = window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!contextRef.current) contextRef.current = new AudioContextCtor();
      if (contextRef.current.state === "suspended") void contextRef.current.resume();
      setAudioUnlocked(true);
    };
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, [hasAudio]);

  useEffect(() => {
    const context = contextRef.current;
    if (!snapshot || !context || !audioUnlocked) return;
    const live = new Set<string>();

    for (const { entity, config } of audioSources) {
      live.add(entity.id);
      let node = nodesRef.current.get(entity.id);
      if (!node || node.url !== config.url) {
        if (node) {
          node.element.pause();
          node.source.disconnect();
          node.gain.disconnect();
          node.pan.disconnect();
        }
        const element = new Audio(config.url);
        element.crossOrigin = "anonymous";
        element.preload = "metadata";
        element.loop = config.loop;
        const source = context.createMediaElementSource(element);
        const gain = context.createGain();
        const pan = context.createStereoPanner();
        source.connect(gain).connect(pan).connect(context.destination);
        node = { element, source, gain, pan, url: config.url };
        nodesRef.current.set(entity.id, node);
      }
      node.element.loop = config.loop;
      if (node.element.paused) void node.element.play().catch(() => undefined);
    }

    for (const [id, node] of nodesRef.current) {
      if (live.has(id)) continue;
      node.element.pause();
      node.source.disconnect();
      node.gain.disconnect();
      node.pan.disconnect();
      nodesRef.current.delete(id);
    }
  }, [audioSources, audioUnlocked, snapshot]);

  useEffect(() => {
    if (!audioUnlocked || !hasAudio) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const runtime = currentTabletopRuntime();
      const current = snapshot;
      const context = contextRef.current;
      if (!runtime || !current || !context || nodesRef.current.size === 0) return;
      const rect = runtime.host.getBoundingClientRect();
      const listener = runtime.clientToWorld({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      const activeLevelId = current.activeLevelId ?? current.scene.levels?.[0]?.id;

      for (const { entity, config } of audioSources) {
        const node = nodesRef.current.get(entity.id);
        if (!node) continue;
        const sourcePoint = center(entity);
        const sameLevel = !activeLevelId || !entity.levelId || entity.levelId === activeLevelId;
        const distance = Math.hypot(sourcePoint.x - listener.x, sourcePoint.y - listener.y);
        const normalized = Math.max(0, 1 - distance / config.radius);
        let gain = sameLevel ? normalized ** config.rolloff * config.volume : 0;
        if (gain > 0 && config.occlusion)
          gain *= wallTransmission(walls, listener, sourcePoint, entity.levelId);
        const regions = tabletopRegionsAtPoint(current.scene, sourcePoint);
        const absorption = regions.reduce(
          (maximum, entry) => Math.max(maximum, entry.behavior.soundAbsorption),
          0,
        );
        gain *= 1 - absorption;
        node.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, gain)), context.currentTime, 0.06);
        const pan = Math.max(-1, Math.min(1, (sourcePoint.x - listener.x) / Math.max(64, config.radius * 0.65)));
        node.pan.pan.setTargetAtTime(pan, context.currentTime, 0.08);
      }
    }, 160);
    return () => window.clearInterval(timer);
  }, [audioSources, audioUnlocked, hasAudio, snapshot, walls]);

  useEffect(
    () => () => {
      for (const node of nodesRef.current.values()) {
        node.element.pause();
        node.source.disconnect();
        node.gain.disconnect();
        node.pan.disconnect();
      }
      nodesRef.current.clear();
      void contextRef.current?.close();
      contextRef.current = null;
    },
    [],
  );

  return null;
}
