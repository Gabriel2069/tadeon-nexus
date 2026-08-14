import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";

const NEXUS_MIME = "application/x-tadeon-nexus-node";
const SHEET_MIME = "application/x-tadeon-sheet";
const SHEET_PATH = /^\/sheet\/([^/]+)$/;

interface DragPayload {
  id?: string;
  label?: string;
}

function parsePayload(raw: string) {
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function useSheetDragSource() {
  const match = typeof window === "undefined" ? null : window.location.pathname.match(SHEET_PATH);
  const sheetId = match?.[1] ?? null;
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [name, setName] = useState("Ficha");

  useEffect(() => {
    if (!sheetId) return;
    let active = true;
    void supabase
      .from("character_sheets")
      .select("name")
      .eq("id", sheetId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.name) setName(data.name);
      });
    return () => {
      active = false;
    };
  }, [sheetId]);

  useEffect(() => {
    if (!sheetId) return;
    const attach = () => {
      const existing = document.getElementById("tadeon-sheet-experience-actions");
      if (existing) setHost(existing);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [sheetId]);

  if (!sheetId || !host) return null;
  return createPortal(
    <button
      type="button"
      draggable
      className="tadeon-sheet-tabletop-drag"
      title="Arraste esta ficha para uma Mesa aberta para criar um token vinculado"
      onDragStart={(event) => {
        const payload = JSON.stringify({ id: sheetId, label: name });
        event.dataTransfer.setData(SHEET_MIME, payload);
        event.dataTransfer.setData("text/plain", `${name} ~ /sheet/${sheetId}`);
        event.dataTransfer.effectAllowed = "copyLink";
      }}
    >
      <GripVertical aria-hidden="true" /> Mesa
    </button>,
    host,
  );
}

function useTabletopDropTarget() {
  useEffect(() => {
    if (window.location.pathname !== "/tabletop") return;
    const dragOver = (event: DragEvent) => {
      const types = event.dataTransfer?.types ?? [];
      if (!types.includes(NEXUS_MIME) && !types.includes(SHEET_MIME)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      document.documentElement.dataset.tadeonTabletopDrop = "ready";
    };
    const dragLeave = (event: DragEvent) => {
      if (event.relatedTarget) return;
      delete document.documentElement.dataset.tadeonTabletopDrop;
    };
    const drop = (event: DragEvent) => {
      delete document.documentElement.dataset.tadeonTabletopDrop;
      const runtime = currentTabletopRuntime();
      if (!runtime || !event.dataTransfer) return;
      const nexusRaw = event.dataTransfer.getData(NEXUS_MIME);
      const sheetRaw = event.dataTransfer.getData(SHEET_MIME);
      if (!nexusRaw && !sheetRaw) return;
      event.preventDefault();
      event.stopPropagation();
      const point = runtime.clientToWorld({ x: event.clientX, y: event.clientY });
      if (sheetRaw) {
        const payload = parsePayload(sheetRaw);
        if (!payload?.id) return;
        runtime.engine.addEntityAt(
          {
            type: "character",
            label: payload.label?.trim() || "Personagem",
            width: runtime.snapshot().scene.gridSize,
            height: runtime.snapshot().scene.gridSize,
            linkedSheetId: payload.id,
            properties: {
              integration_source: "sheet",
              integration_linked_at: new Date().toISOString(),
            },
          },
          point,
        );
        toast.success("Ficha adicionada à Mesa como personagem vinculado.");
        return;
      }
      const payload = parsePayload(nexusRaw);
      if (!payload?.id) return;
      runtime.engine.addEntityAt(
        {
          type: "note",
          label: payload.label?.trim() || "Página do Nexus",
          width: runtime.snapshot().scene.gridSize * 1.5,
          height: runtime.snapshot().scene.gridSize,
          linkedKnowledgeNodeId: payload.id,
          properties: {
            integration_source: "nexus",
            integration_linked_at: new Date().toISOString(),
          },
        },
        point,
      );
      toast.success("Página do Nexus adicionada à Mesa com vínculo preservado.");
    };
    document.addEventListener("dragover", dragOver, true);
    document.addEventListener("dragleave", dragLeave, true);
    document.addEventListener("drop", drop, true);
    return () => {
      document.removeEventListener("dragover", dragOver, true);
      document.removeEventListener("dragleave", dragLeave, true);
      document.removeEventListener("drop", drop, true);
      delete document.documentElement.dataset.tadeonTabletopDrop;
    };
  }, []);
}

export function TabletopCrossSurfaceBridge() {
  const sheetPortal = useSheetDragSource();
  useTabletopDropTarget();
  return sheetPortal;
}
