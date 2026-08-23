import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BookOpen,
  Box,
  ChevronDown,
  Eye,
  EyeOff,
  FilePlus2,
  Focus,
  Link2,
  Loader2,
  MapPinned,
  ScanEye,
  Share2,
  ShieldQuestion,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { knowledgeService } from "@/lib/knowledge/knowledge-service";
import type { KnowledgeNodeType } from "@/lib/nexus-contracts";
import { tabletopRegionsAtPoint } from "@/lib/tabletop/tabletop-regions";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { structureChannels, type TabletopStructureType } from "@/lib/tabletop/tabletop-spatial";
import type { Point, TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import { TabletopStagePortal } from "@/components/tabletop/tabletop-stage-portal";
import "@/styles/tabletop-integration-tools.css";

const database = supabase as unknown as SupabaseClient;

interface SceneContext {
  sceneId: string;
  sceneName: string;
  campaignId: string;
  campaignName: string;
  workspaceId: string;
  globalIllumination: number;
}

interface CampaignMember {
  userId: string;
  role: string;
  name: string;
}

interface WallRow {
  id: string;
  level_id: string | null;
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  wall_type: string;
  blocks_vision: boolean;
  properties: unknown;
}

interface LightRow {
  id: string;
  level_id: string | null;
  x: number | string;
  y: number | string;
  radius: number | string;
  intensity: number | string;
  enabled: boolean;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function center(entity: TabletopEntity): Point {
  return { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
}

function segmentIntersection(a: Point, b: Point, c: Point, d: Point) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(denominator) < 1e-8) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator;
  return t > 0.0001 && t < 0.9999 && u >= 0 && u <= 1;
}

function nodeTypeForEntity(type: TabletopEntity["type"]): KnowledgeNodeType {
  if (type === "character") return "character";
  if (type === "npc") return "npc";
  if (type === "creature") return "creature";
  if (type === "handout_pin" || type === "note" || type === "text") return "document";
  if (type === "marker" || type === "area") return "location";
  return "object";
}

function useRuntimeSnapshot() {
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

export function TabletopIntegrationToolsBridge() {
  const { role } = useAuth();
  const snapshot = useRuntimeSnapshot();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sceneContext, setSceneContext] = useState<SceneContext | null>(null);
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [walls, setWalls] = useState<WallRow[]>([]);
  const [lights, setLights] = useState<LightRow[]>([]);
  const [audience, setAudience] = useState<"campaign" | string>("campaign");

  const selected = useMemo(() => {
    if (!snapshot || snapshot.selectedIds.length !== 1) return null;
    return snapshot.scene.entities.find((entity) => entity.id === snapshot.selectedIds[0]) ?? null;
  }, [snapshot]);
  const pair = useMemo(() => {
    if (!snapshot || snapshot.selectedIds.length !== 2) return null;
    const entities = snapshot.selectedIds
      .map((id) => snapshot.scene.entities.find((entity) => entity.id === id))
      .filter((entity): entity is TabletopEntity => Boolean(entity));
    return entities.length === 2 ? entities : null;
  }, [snapshot]);

  const refreshContext = useCallback(async () => {
    const sceneId = snapshot?.scene.id;
    if (!sceneId || sceneId === "local-scene") {
      setSceneContext(null);
      return;
    }
    const { data: scene } = await database
      .from("tabletop_scenes")
      .select("id,name,campaign_id,global_illumination")
      .eq("id", sceneId)
      .maybeSingle();
    if (!scene?.campaign_id) return;
    const { data: campaign } = await database
      .from("campaigns")
      .select("id,name,workspace_id")
      .eq("id", scene.campaign_id)
      .maybeSingle();
    if (!campaign?.workspace_id) return;
    setSceneContext({
      sceneId: scene.id,
      sceneName: scene.name,
      campaignId: campaign.id,
      campaignName: campaign.name,
      workspaceId: campaign.workspace_id,
      globalIllumination: numberValue(scene.global_illumination, 1),
    });
  }, [snapshot?.scene.id]);

  const refreshSpatial = useCallback(async () => {
    if (!open || !sceneContext) return;
    const [wallResult, lightResult] = await Promise.all([
      database
        .from("tabletop_walls")
        .select("id,level_id,x1,y1,x2,y2,wall_type,blocks_vision,properties")
        .eq("scene_id", sceneContext.sceneId),
      database
        .from("tabletop_lights")
        .select("id,level_id,x,y,radius,intensity,enabled")
        .eq("scene_id", sceneContext.sceneId)
        .eq("enabled", true),
    ]);
    if (!wallResult.error) setWalls((wallResult.data ?? []) as unknown as WallRow[]);
    if (!lightResult.error) setLights((lightResult.data ?? []) as unknown as LightRow[]);
  }, [open, sceneContext]);

  const refreshMembers = useCallback(async () => {
    if (!open || !sceneContext) return;
    const { data: memberRows } = await database
      .from("campaign_members")
      .select("user_id,role")
      .eq("campaign_id", sceneContext.campaignId);
    const userIds = [...new Set((memberRows ?? []).map((entry) => String(entry.user_id)))];
    if (!userIds.length) {
      setMembers([]);
      return;
    }
    const { data: profiles } = await database
      .from("profiles")
      .select("id,full_name,email")
      .in("id", userIds);
    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        String(profile.id),
        String(profile.full_name || profile.email || "Participante"),
      ]),
    );
    setMembers(
      (memberRows ?? [])
        .filter((entry) => String(entry.role) !== "master" && String(entry.role) !== "co_master")
        .map((entry) => ({
          userId: String(entry.user_id),
          role: String(entry.role),
          name: profileMap.get(String(entry.user_id)) ?? "Participante",
        })),
    );
  }, [open, sceneContext]);

  useEffect(() => void refreshContext(), [refreshContext]);
  useEffect(() => void refreshSpatial(), [refreshSpatial]);
  useEffect(() => void refreshMembers(), [refreshMembers]);

  const diagnostics = useMemo(() => {
    if (!snapshot || !pair) return [] as string[];
    const [observer, target] = pair;
    const reasons: string[] = [];
    if (observer.levelId && target.levelId && observer.levelId !== target.levelId)
      reasons.push("As duas peças estão em andares diferentes.");
    if (target.hidden) reasons.push("O alvo está marcado como oculto.");
    const from = center(observer);
    const to = center(target);
    const relevantWalls = walls.filter((wall) => {
      if (observer.levelId && wall.level_id && wall.level_id !== observer.levelId) return false;
      if (!segmentIntersection(from, to, { x: numberValue(wall.x1), y: numberValue(wall.y1) }, { x: numberValue(wall.x2), y: numberValue(wall.y2) })) return false;
      const channels = structureChannels(
        wall.wall_type as TabletopStructureType,
        objectValue(wall.properties),
      );
      return wall.blocks_vision || channels.visionTransmission < 0.98;
    });
    if (relevantWalls.length) {
      const transmission = relevantWalls.reduce((value, wall) => {
        const channels = structureChannels(wall.wall_type as TabletopStructureType, objectValue(wall.properties));
        return value * channels.visionTransmission;
      }, 1);
      reasons.push(
        transmission < 0.08
          ? `${relevantWalls.length} barreira(s) bloqueiam a linha de visão.`
          : `${relevantWalls.length} superfície(s) reduzem a transmissão visual para ${Math.round(transmission * 100)}%.`,
      );
    }
    const targetRegions = tabletopRegionsAtPoint(snapshot.scene, to);
    const concealment = targetRegions.reduce((max, entry) => Math.max(max, entry.behavior.concealment), 0);
    if (concealment > 0.05) reasons.push(`A região do alvo aplica ${Math.round(concealment * 100)}% de ocultação.`);
    const localLights = lights.filter((light) => {
      if (target.levelId && light.level_id && light.level_id !== target.levelId) return false;
      const distance = Math.hypot(numberValue(light.x) - to.x, numberValue(light.y) - to.y);
      return light.enabled && distance <= numberValue(light.radius) * Math.max(0.12, numberValue(light.intensity, 1));
    });
    if (sceneContext && sceneContext.globalIllumination < 0.2 && localLights.length === 0)
      reasons.push("A iluminação global está muito baixa e nenhuma luz local alcança o alvo.");
    if (!reasons.length) reasons.push("Nenhum bloqueio estrutural óbvio foi encontrado entre as duas peças.");
    return reasons;
  }, [lights, pair, sceneContext, snapshot, walls]);

  if (
    role !== "mestre" ||
    !snapshot ||
    typeof window === "undefined" ||
    window.location.pathname !== "/tabletop" ||
    new URLSearchParams(window.location.search).get("view") === "director"
  )
    return null;

  const openNexus = (nodeId: string) => {
    window.open(`/nexus?node=${encodeURIComponent(nodeId)}`, `tadeon-nexus-${nodeId}`, "popup=yes,width=1320,height=900,resizable=yes,scrollbars=yes");
  };

  const registerInNexus = async () => {
    if (!selected || !sceneContext || busy) return;
    setBusy(true);
    try {
      const result = await knowledgeService.create({
        workspaceId: sceneContext.workspaceId,
        campaignId: sceneContext.campaignId,
        nodeType: nodeTypeForEntity(selected.type),
        title: selected.label,
        summary: `Registrado a partir da cena ${sceneContext.sceneName}.`,
        contentMarkdown: `# ${selected.label}\n\nRegistrado a partir da **Mesa Nexus**, na cena **${sceneContext.sceneName}**.`,
        properties: {
          tabletop: {
            scene_id: sceneContext.sceneId,
            entity_id: selected.id,
            level_id: selected.levelId ?? null,
            x: selected.x,
            y: selected.y,
          },
          ...(selected.linkedSheetId ? { linked_sheet_id: selected.linkedSheetId } : {}),
        },
        status: "draft",
        visibility: "masters",
        coverAssetId: selected.assetId ?? null,
      });
      currentTabletopRuntime()?.engine.updateSelected(
        { linkedKnowledgeNodeId: result.node.id },
        "Vincular entidade ao Nexus",
      );
      toast.success("A entidade virou uma página do Nexus sem deixar de ser a mesma peça da Mesa.");
      openNexus(result.node.id);
    } catch {
      toast.error("Não foi possível registrar esta entidade no Nexus.");
    } finally {
      setBusy(false);
    }
  };

  const revealLinkedNode = async () => {
    if (!selected?.linkedKnowledgeNodeId || !sceneContext || busy) return;
    setBusy(true);
    try {
      const node = await knowledgeService.get(selected.linkedKnowledgeNodeId);
      if (audience === "campaign") {
        if (node.campaign_id === sceneContext.campaignId) {
          if (node.visibility !== "campaign")
            await knowledgeService.update(node.id, { visibility: "campaign" }, node.updated_at);
        } else {
          let current = node;
          if (node.visibility !== "users") {
            const updated = await knowledgeService.update(node.id, { visibility: "users" }, node.updated_at);
            current = updated.node;
          }
          void current;
          await Promise.all(members.map((member) => knowledgeService.setNodeAccess(node.id, member.userId, "view")));
        }
      } else {
        if (node.visibility !== "users")
          await knowledgeService.update(node.id, { visibility: "users" }, node.updated_at);
        await knowledgeService.setNodeAccess(node.id, audience, "view");
      }
      currentTabletopRuntime()?.engine.addEntityAt(
        {
          type: "handout_pin",
          label: `Arquivo · ${node.title}`,
          linkedKnowledgeNodeId: node.id,
          assetId: node.cover_asset_id,
          width: Math.max(48, snapshot.scene.gridSize * 0.72),
          height: Math.max(48, snapshot.scene.gridSize * 0.72),
          levelId: selected.levelId ?? null,
          properties: { source_entity_id: selected.id, reveal_audience: audience },
        },
        { x: selected.x + selected.width + snapshot.scene.gridSize * 0.4, y: selected.y + selected.height / 2 },
      );
      toast.success(audience === "campaign" ? "Página preparada como handout para a campanha." : "Página liberada apenas para o participante escolhido.");
    } catch {
      toast.error("Não foi possível preparar esse conhecimento para os jogadores.");
    } finally {
      setBusy(false);
    }
  };

  const hiddenCount = snapshot.scene.entities.filter((entity) => entity.hidden).length;
  const regionCount = snapshot.scene.entities.filter((entity) => entity.type === "area").length;
  const linkedCount = snapshot.scene.entities.filter((entity) => entity.linkedKnowledgeNodeId || entity.linkedSheetId).length;

  return (
    <TabletopStagePortal>
    <aside className="tadeon-tabletop-now" data-open={open}>
      <button type="button" className="tadeon-tabletop-now__handle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <ShieldQuestion aria-hidden="true" />
        <span>Agora</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <section className="tadeon-tabletop-now__panel">
          <header>
            <span><MapPinned aria-hidden="true" /></span>
            <div><small>Contexto vivo do mestre</small><strong>{snapshot.scene.name}</strong></div>
            <Button size="icon" variant="ghost" aria-label="Fechar painel Agora" onClick={() => setOpen(false)}><X aria-hidden="true" /></Button>
          </header>

          <div className="tadeon-tabletop-now__metrics">
            <span><Box aria-hidden="true" /><strong>{snapshot.scene.entities.length}</strong><small>peças</small></span>
            <span><EyeOff aria-hidden="true" /><strong>{hiddenCount}</strong><small>ocultas</small></span>
            <span><ScanEye aria-hidden="true" /><strong>{regionCount}</strong><small>regiões</small></span>
            <span><Link2 aria-hidden="true" /><strong>{linkedCount}</strong><small>ligadas</small></span>
          </div>

          {selected && (
            <div className="tadeon-tabletop-now__selection">
              <div className="tadeon-tabletop-now__selection-head">
                <div><small>Em foco</small><strong>{selected.label}</strong></div>
                <Button size="icon" variant="ghost" title="Enquadrar na Mesa" onClick={() => currentTabletopRuntime()?.engine.focusSelection()}><Focus aria-hidden="true" /></Button>
              </div>
              <div className="tadeon-tabletop-now__links">
                {selected.linkedKnowledgeNodeId ? (
                  <Button size="sm" variant="outline" onClick={() => openNexus(selected.linkedKnowledgeNodeId!)}><BookOpen aria-hidden="true" /> Abrir no Nexus</Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={busy || !sceneContext} onClick={() => void registerInNexus()}>
                    {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FilePlus2 aria-hidden="true" />} Registrar no Nexus
                  </Button>
                )}
                {selected.linkedSheetId && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`/sheet/${selected.linkedSheetId}?popout=1&mode=game`, `tadeon-sheet-${selected.linkedSheetId}`, "popup=yes,width=1180,height=900,resizable=yes,scrollbars=yes")}><UserRound aria-hidden="true" /> Ficha</Button>
                )}
              </div>
              {selected.linkedKnowledgeNodeId && (
                <div className="tadeon-tabletop-now__reveal">
                  <label>
                    <span>Público do handout</span>
                    <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                      <option value="campaign">Campanha inteira</option>
                      {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                    </select>
                  </label>
                  <Button size="sm" disabled={busy || !sceneContext} onClick={() => void revealLinkedNode()}>
                    {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : audience === "campaign" ? <UsersRound aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    Revelar página
                  </Button>
                </div>
              )}
            </div>
          )}

          {pair && (
            <div className="tadeon-tabletop-now__diagnostic">
              <div><ScanEye aria-hidden="true" /><span><small>Diagnóstico de visão</small><strong>{pair[0].label} → {pair[1].label}</strong></span></div>
              <ul>{diagnostics.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <small>Selecione exatamente duas peças para comparar outra linha de visão.</small>
            </div>
          )}

          {!selected && !pair && (
            <div className="tadeon-tabletop-now__hint"><Share2 aria-hidden="true" /><span>Selecione uma peça para Nexus/Ficha, ou duas para diagnosticar a linha de visão.</span></div>
          )}
        </section>
      )}
    </aside>
    </TabletopStagePortal>
  );
}
