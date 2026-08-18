import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  clearTabletopTransfer,
  queueTabletopTransfer,
  readTabletopTransfer,
  type CrossSurfaceTransfer,
} from "@/lib/cross-surface-transfer";

const NEXUS_MIME = "application/x-tadeon-nexus-node";
const SHEET_MIME = "application/x-tadeon-sheet";
const SHEET_PATH = /^\/sheet\/([^/]+)$/;

interface DragPayload {
  id?: string;
  label?: string;
}

interface RuntimePoint {
  x: number;
  y: number;
}

interface RuntimeSnapshot {
  scene: { gridSize: number };
}

interface RuntimeEntitySeed {
  type: "character" | "note";
  label: string;
  width: number;
  height: number;
  linkedSheetId?: string;
  linkedKnowledgeNodeId?: string;
  properties: Record<string, string>;
}

interface LightweightTabletopRuntime {
  snapshot(): RuntimeSnapshot;
  clientToWorld(point: RuntimePoint): RuntimePoint;
  engine: {
    addEntityAt(seed: RuntimeEntitySeed, point: RuntimePoint): unknown;
  };
}

function currentRuntime() {
  if (typeof window === "undefined") return undefined;
  return (
    window as typeof window & {
      __tadeonTabletopRuntime?: LightweightTabletopRuntime;
    }
  ).__tadeonTabletopRuntime;
}

function parsePayload(raw: string) {
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function addTransfer(runtime: LightweightTabletopRuntime, transfer: CrossSurfaceTransfer, point: RuntimePoint) {
  const gridSize = runtime.snapshot().scene.gridSize;
  if (transfer.kind === "sheet") {
    runtime.engine.addEntityAt(
      {
        type: "character",
        label: transfer.label.trim() || "Personagem",
        width: gridSize,
        height: gridSize,
        linkedSheetId: transfer.id,
        properties: {
          integration_source: "sheet",
          integration_linked_at: new Date().toISOString(),
        },
      },
      point,
    );
    return "Ficha adicionada à Mesa como personagem vinculado.";
  }

  runtime.engine.addEntityAt(
    {
      type: "note",
      label: transfer.label.trim() || "Página do Nexus",
      width: gridSize * 1.5,
      height: gridSize,
      linkedKnowledgeNodeId: transfer.id,
      properties: {
        integration_source: "nexus",
        integration_linked_at: new Date().toISOString(),
      },
    },
    point,
  );
  return "Página do Nexus adicionada à Mesa com vínculo preservado.";
}

function stageCenter() {
  const stage = document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
  if (!stage) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const rect = stage.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
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
      title="Arraste para uma Mesa aberta ou toque para levar esta ficha à Mesa"
      onClick={() => {
        const queued = queueTabletopTransfer({ kind: "sheet", id: sheetId, label: name });
        if (!queued) {
          toast.error("Não foi possível preparar a ficha para a Mesa neste navegador.");
          return;
        }
        window.location.assign("/tabletop");
      }}
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
      const runtime = currentRuntime();
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
        toast.success(
          addTransfer(
            runtime,
            {
              kind: "sheet",
              id: payload.id,
              label: payload.label?.trim() || "Personagem",
              createdAt: Date.now(),
            },
            point,
          ),
        );
        return;
      }

      const payload = parsePayload(nexusRaw);
      if (!payload?.id) return;
      toast.success(
        addTransfer(
          runtime,
          {
            kind: "nexus",
            id: payload.id,
            label: payload.label?.trim() || "Página do Nexus",
            createdAt: Date.now(),
          },
          point,
        ),
      );
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

  useEffect(() => {
    if (window.location.pathname !== "/tabletop") return;
    const transfer = readTabletopTransfer();
    if (!transfer) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      const runtime = currentRuntime();
      attempts += 1;
      if (!runtime) {
        if (attempts >= 120) {
          window.clearInterval(timer);
          toast.error("A Mesa abriu, mas ainda não ficou pronta para receber o item.");
        }
        return;
      }

      const clientPoint = stageCenter();
      const worldPoint = runtime.clientToWorld(clientPoint);
      try {
        const message = addTransfer(runtime, transfer, worldPoint);
        clearTabletopTransfer();
        window.clearInterval(timer);
        toast.success(message);
      } catch {
        window.clearInterval(timer);
        toast.error("A Mesa não conseguiu inserir o item transferido.");
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, []);
}

export function TabletopCrossSurfaceBridge() {
  const sheetPortal = useSheetDragSource();
  useTabletopDropTarget();
  return sheetPortal;
}
