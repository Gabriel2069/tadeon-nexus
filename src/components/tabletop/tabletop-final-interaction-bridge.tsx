import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Shapes, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopEntity } from "@/lib/tabletop/types";

const db = supabase as unknown as SupabaseClient;

type RenameKind = "entity" | "wall" | "light" | "fog";
type RenameItem = { id: string; kind: RenameKind; label: string };

type SpatialRow = { id: string; label: string | null; fallback: string };

function radialAnchor(entity: TabletopEntity) {
  const runtime = currentTabletopRuntime();
  if (!runtime) return null;
  const point = runtime.worldToClient({ x: entity.x + entity.width / 2, y: entity.y });
  const host = runtime.host.getBoundingClientRect();
  return {
    x: Math.max(host.left + 34, Math.min(host.right - 34, point.x)),
    y: Math.max(host.top + 28, Math.min(host.bottom - 34, point.y - 30)),
  };
}

export function TabletopFinalInteractionBridge() {
  const { role } = useAuth();
  const [renameHost, setRenameHost] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RenameItem[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/tabletop") return;
    let frame = 0;
    const tick = () => {
      const runtime = currentTabletopRuntime();
      const snapshot = runtime?.snapshot() ?? null;
      const entity = snapshot?.selectedIds.length === 1
        ? snapshot.scene.entities.find((candidate) => candidate.id === snapshot.selectedIds[0]) ?? null
        : null;
      const trigger = document.querySelector<HTMLElement>(".tadeon-radial-trigger");
      if (entity && trigger) {
        const anchor = radialAnchor(entity);
        if (anchor) {
          trigger.style.position = "fixed";
          trigger.style.left = `${anchor.x}px`;
          trigger.style.top = `${anchor.y}px`;
          trigger.style.transform = "translate(-50%, -100%)";
        }
      }
      const radial = document.querySelector<HTMLElement>('.tadeon-radial-actions[data-state="open"]');
      if (entity && radial) {
        const center = runtime?.worldToClient({ x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 });
        const host = runtime?.host.getBoundingClientRect();
        if (center && host) {
          radial.style.position = "fixed";
          radial.style.left = `${Math.max(host.left + 92, Math.min(host.right - 92, center.x))}px`;
          radial.style.top = `${Math.max(host.top + 92, Math.min(host.bottom - 92, center.y))}px`;
        }
      }

      const header = document.querySelector<HTMLElement>(".tadeon-placeables__panel > header");
      if (header) {
        let host = header.querySelector<HTMLElement>("[data-tadeon-rename-host]");
        if (!host) {
          host = document.createElement("div");
          host.dataset.tadeonRenameHost = "true";
          header.insertBefore(host, header.lastElementChild);
        }
        setRenameHost((current) => (current === host ? current : host));
      } else setRenameHost(null);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const refreshItems = useCallback(async () => {
    const runtime = currentTabletopRuntime();
    const snapshot = runtime?.snapshot();
    if (!snapshot || snapshot.scene.id === "local-scene") return;
    const sceneId = snapshot.scene.id;
    const entities: RenameItem[] = snapshot.scene.entities.map((entity) => ({
      id: entity.id,
      kind: "entity",
      label: entity.label || "Entidade sem nome",
    }));
    const [walls, lights, fog] = await Promise.all([
      db.from("tabletop_walls").select("id,label,wall_type").eq("scene_id", sceneId),
      db.from("tabletop_lights").select("id,label").eq("scene_id", sceneId),
      db.from("tabletop_fog_strokes").select("id,label,operation").eq("scene_id", sceneId).order("sequence_index"),
    ]);
    const wallItems = ((walls.data ?? []) as Array<{ id: string; label: string | null; wall_type: string }>).map((row) => ({
      id: row.id,
      kind: "wall" as const,
      label: row.label?.trim() || row.wall_type.replaceAll("_", " "),
    }));
    const lightItems = ((lights.data ?? []) as SpatialRow[]).map((row, index) => ({
      id: row.id,
      kind: "light" as const,
      label: row.label?.trim() || `Luz ${index + 1}`,
    }));
    const fogItems = ((fog.data ?? []) as Array<{ id: string; label: string | null; operation: string }>).map((row, index) => ({
      id: row.id,
      kind: "fog" as const,
      label: row.label?.trim() || `${row.operation === "reveal" ? "Revelação" : "Cobertura"} ${index + 1}`,
    }));
    const next = [...entities, ...wallItems, ...lightItems, ...fogItems];
    setItems(next);
    setSelectedKey((current) => current && next.some((item) => `${item.kind}:${item.id}` === current) ? current : next[0] ? `${next[0].kind}:${next[0].id}` : "");
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshItems();
  }, [open, refreshItems]);

  const selected = useMemo(
    () => items.find((item) => `${item.kind}:${item.id}` === selectedKey) ?? null,
    [items, selectedKey],
  );

  useEffect(() => {
    setDraft(selected?.label ?? "");
  }, [selected]);

  const rename = async () => {
    const value = draft.trim().slice(0, 120);
    if (!selected || !value || busy) return;
    setBusy(true);
    try {
      if (selected.kind === "entity") {
        const engine = currentTabletopRuntime()?.engine;
        engine?.selectEntityById(selected.id);
        engine?.updateSelected({ label: value }, "Renomear entidade");
      } else {
        const table = selected.kind === "wall" ? "tabletop_walls" : selected.kind === "light" ? "tabletop_lights" : "tabletop_fog_strokes";
        const { error } = await db.from(table).update({ label: value }).eq("id", selected.id);
        if (error) throw error;
      }
      await refreshItems();
      window.dispatchEvent(new CustomEvent("tadeon-tabletop-placeable-renamed", { detail: { id: selected.id, kind: selected.kind, label: value } }));
    } finally {
      setBusy(false);
    }
  };

  if (role !== "mestre" || !renameHost) return null;

  return createPortal(
    <>
      <Button size="sm" variant="ghost" className="tadeon-rename-launcher" onClick={() => setOpen(true)} title="Renomear qualquer elemento da cena">
        <Pencil /> Renomear
      </Button>
      {open && (
        <div className="tadeon-rename-popover" role="dialog" aria-label="Renomear elementos da cena">
          <header><Shapes /><div><small>Identidade da cena</small><strong>Renomear tudo</strong></div><Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar"><X /></Button></header>
          <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} aria-label="Elemento a renomear">
            {items.map((item) => <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.kind === "entity" ? "Entidade" : item.kind === "wall" ? "Arquitetura" : item.kind === "light" ? "Luz" : "Névoa"} · {item.label}</option>)}
          </select>
          <Input value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void rename(); }} placeholder="Novo nome" />
          <Button size="sm" disabled={!selected || !draft.trim() || busy} onClick={() => void rename()}><Pencil /> Aplicar nome</Button>
        </div>
      )}
    </>,
    renameHost,
  );
}
