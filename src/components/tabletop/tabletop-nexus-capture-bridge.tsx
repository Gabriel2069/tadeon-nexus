import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { knowledgeService } from "@/lib/knowledge/knowledge-service";
import type { KnowledgeNodeType } from "@/lib/nexus-contracts";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";

const database = supabase as unknown as SupabaseClient;

interface CaptureRequest {
  entityId: string;
  action: "register-nexus" | "capture-note" | "capture-clue" | "capture-event";
}

function nodeTypeForEntity(type: TabletopEntity["type"]): KnowledgeNodeType {
  if (type === "character") return "character";
  if (type === "npc") return "npc";
  if (type === "creature") return "creature";
  if (type === "handout_pin" || type === "note" || type === "text") return "document";
  if (type === "marker" || type === "area") return "location";
  return "object";
}

function actionNodeType(
  action: CaptureRequest["action"],
  entity: TabletopEntity,
): KnowledgeNodeType {
  if (action === "capture-clue") return "clue";
  if (action === "capture-event") return "historical_event";
  if (action === "capture-note") return "free_note";
  return nodeTypeForEntity(entity.type);
}

function actionTitle(action: CaptureRequest["action"], entity: TabletopEntity) {
  if (action === "capture-clue") return `Pista · ${entity.label}`;
  if (action === "capture-event") return `Evento · ${entity.label}`;
  if (action === "capture-note") return `Nota · ${entity.label}`;
  return entity.label;
}

export function TabletopNexusCaptureBridge() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      setSnapshot(detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    };
    setSnapshot(currentTabletopRuntime()?.snapshot() ?? null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    return () => window.removeEventListener("tadeon-tabletop-render", onRender);
  }, []);

  const capture = useCallback(
    async (request: CaptureRequest) => {
      if (busyRef.current) return;
      const runtime = currentTabletopRuntime();
      const current = snapshot ?? runtime?.snapshot() ?? null;
      const entity = current?.scene.entities.find(
        (item) => item.id === request.entityId,
      );
      if (!runtime || !current || !entity || current.scene.id === "local-scene")
        return;
      busyRef.current = true;
      try {
        const { data: scene, error: sceneError } = await database
          .from("tabletop_scenes")
          .select("id,name,campaign_id")
          .eq("id", current.scene.id)
          .maybeSingle();
        if (sceneError || !scene?.campaign_id)
          throw sceneError ?? new Error("scene");
        const { data: campaign, error: campaignError } = await database
          .from("campaigns")
          .select("id,name,workspace_id")
          .eq("id", scene.campaign_id)
          .maybeSingle();
        if (campaignError || !campaign?.workspace_id)
          throw campaignError ?? new Error("campaign");

        const title = actionTitle(request.action, entity);
        const nodeType = actionNodeType(request.action, entity);
        const isPrimaryRegistration = request.action === "register-nexus";
        const result = await knowledgeService.create({
          workspaceId: campaign.workspace_id,
          campaignId: campaign.id,
          nodeType,
          title,
          summary: `${isPrimaryRegistration ? "Registrado" : "Capturado"} a partir da cena ${scene.name}.`,
          contentMarkdown: [
            `# ${title}`,
            "",
            `${isPrimaryRegistration ? "Registrado" : "Capturado"} a partir da **Mesa Nexus**, na cena **${scene.name}**.`,
            "",
            `- Cena: [[${scene.name}]]`,
            `- Entidade de origem: ${entity.label}`,
            `- Posição: ${Math.round(entity.x)}, ${Math.round(entity.y)}`,
            entity.levelId ? `- Nível: ${entity.levelId}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          properties: {
            tabletop: {
              scene_id: scene.id,
              scene_name: scene.name,
              campaign_id: campaign.id,
              entity_id: entity.id,
              level_id: entity.levelId ?? null,
              x: entity.x,
              y: entity.y,
              captured_as: request.action,
            },
            ...(entity.linkedSheetId
              ? { linked_sheet_id: entity.linkedSheetId }
              : {}),
          },
          status: "draft",
          visibility: "masters",
          coverAssetId: entity.assetId ?? null,
        });

        if (isPrimaryRegistration) {
          runtime.engine.selectOnly(entity.id);
          runtime.engine.updateSelected(
            { linkedKnowledgeNodeId: result.node.id },
            "Vincular entidade ao Nexus",
          );
        }
        toast.success(
          isPrimaryRegistration
            ? "A peça foi registrada no Nexus e manteve o vínculo com a cena."
            : "A memória da cena foi capturada no Nexus.",
        );
        window.open(
          `/nexus?node=${encodeURIComponent(result.node.id)}`,
          `tadeon-nexus-${result.node.id}`,
          "popup=yes,width=1320,height=900,resizable=yes,scrollbars=yes",
        );
      } catch {
        toast.error("Não foi possível registrar esta memória no Nexus.");
      } finally {
        busyRef.current = false;
      }
    },
    [snapshot],
  );

  useEffect(() => {
    const onCapture = (event: Event) => {
      const detail = (event as CustomEvent<Partial<CaptureRequest>>).detail;
      if (
        !detail ||
        typeof detail.entityId !== "string" ||
        ![
          "register-nexus",
          "capture-note",
          "capture-clue",
          "capture-event",
        ].includes(String(detail.action))
      )
        return;
      void capture(detail as CaptureRequest);
    };
    window.addEventListener("tadeon-tabletop-open-integration-tools", onCapture);
    window.addEventListener("tadeon-tabletop-capture-nexus", onCapture);
    return () => {
      window.removeEventListener("tadeon-tabletop-open-integration-tools", onCapture);
      window.removeEventListener("tadeon-tabletop-capture-nexus", onCapture);
    };
  }, [capture]);

  return null;
}
