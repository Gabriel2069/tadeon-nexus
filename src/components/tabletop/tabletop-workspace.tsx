import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  Archive,
  BookOpen,
  Box,
  Bug,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardPaste,
  Copy,
  Eye,
  EyeOff,
  Focus,
  Grid2X2,
  History,
  Image,
  Layers3,
  Loader2,
  Lock,
  LockOpen,
  Maximize2,
  MousePointer2,
  PanelRightOpen,
  Plus,
  Redo2,
  RefreshCw,
  RotateCw,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TabletopLiveSession } from "@/components/tabletop/tabletop-live-session";
import { TabletopVisibilityPanel } from "@/components/tabletop/tabletop-visibility-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import {
  createEmptyVisibilityState,
  tabletopVisibilityService,
  type TabletopVisibilityState,
} from "@/lib/tabletop/tabletop-visibility-service";
import {
  moveTabletopScene,
  tabletopPersistenceService,
  TabletopServiceError,
  type PersistedTabletopScene,
  type TabletopAssetTarget,
  type TabletopCampaignSummary,
  type TabletopEntityLinkTargets,
  type TabletopSaveOverrides,
  type TabletopSceneSnapshotSummary,
  type TabletopSceneSummary,
} from "@/lib/tabletop/tabletop-persistence-service";
import {
  cloneScene,
  EMPTY_TABLETOP_SCENE,
  type Point,
  type TabletopEntitySeed,
  type TabletopSnapshot,
} from "@/lib/tabletop/types";

interface ContextMenuState extends Point {
  entityId?: string;
}

const EMPTY_SNAPSHOT: TabletopSnapshot = {
  scene: cloneScene(EMPTY_TABLETOP_SCENE),
  selectedIds: [],
  canUndo: false,
  canRedo: false,
};

const EMPTY_LINK_TARGETS: TabletopEntityLinkTargets = {
  sheets: [],
  knowledge: [],
};

const TABLETOP_PALETTE_MIME = "application/x-tadeon-tabletop-palette";

type PaletteDragPayload =
  | { kind: "asset"; id: string; entityType: "token" | "object" }
  | { kind: "knowledge"; id: string };

function parsePaletteDragPayload(value: string): PaletteDragPayload | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.kind === "knowledge" && typeof parsed.id === "string") {
      return { kind: "knowledge", id: parsed.id };
    }
    if (
      parsed.kind === "asset" &&
      typeof parsed.id === "string" &&
      (parsed.entityType === "token" || parsed.entityType === "object")
    ) {
      return {
        kind: "asset",
        id: parsed.id,
        entityType: parsed.entityType,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function knowledgeEntityType(nodeType: string): TabletopEntitySeed["type"] {
  if (nodeType === "character") return "character";
  if (nodeType === "npc") return "npc";
  if (nodeType === "creature") return "creature";
  if (nodeType === "clue" || nodeType === "document") return "handout_pin";
  if (nodeType === "location" || nodeType === "map") return "marker";
  return "object";
}

function entityProperties(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sceneFingerprint(scene: TabletopSnapshot["scene"]) {
  return JSON.stringify(scene);
}

function clampContextMenu(position: Point) {
  if (typeof window === "undefined") return position;
  return {
    x: Math.max(8, Math.min(position.x, window.innerWidth - 184)),
    y: Math.max(8, Math.min(position.y, window.innerHeight - 248)),
  };
}

function errorMessage(error: unknown) {
  if (!(error instanceof TabletopServiceError))
    return "Não foi possível concluir a operação na Mesa Nexus.";
  switch (error.code) {
    case "TABLETOP_AUTH_REQUIRED":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "TABLETOP_CONFLICT":
      return "A cena mudou em outra sessão. Recarregue antes de salvar novamente.";
    case "TABLETOP_INVALID_INPUT":
      return "Revise os dados da cena antes de salvar.";
    case "TABLETOP_NOT_FOUND":
      return "A cena não existe mais ou não está disponível.";
    default:
      return "A Mesa Nexus não conseguiu acessar o banco com segurança.";
  }
}

export function TabletopWorkspace({
  realtimeEnabled = false,
  lightingEnabled = false,
}: {
  realtimeEnabled?: boolean;
  lightingEnabled?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TabletopEngine | null>(null);
  const engineReadyRef = useRef(false);
  const persistedSceneRef = useRef<PersistedTabletopScene | null>(null);
  const visibilityRef = useRef<TabletopVisibilityState>(
    createEmptyVisibilityState(),
  );
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [visibility, setVisibility] = useState<TabletopVisibilityState>(
    createEmptyVisibilityState,
  );
  const [visibilityDirty, setVisibilityDirty] = useState(false);
  const [visibilityAvailable, setVisibilityAvailable] = useState(true);
  const [campaigns, setCampaigns] = useState<TabletopCampaignSummary[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [scenes, setScenes] = useState<TabletopSceneSummary[]>([]);
  const [persistedScene, setPersistedScene] =
    useState<PersistedTabletopScene | null>(null);
  const [snapshots, setSnapshots] = useState<TabletopSceneSnapshotSummary[]>(
    [],
  );
  const [snapshotId, setSnapshotId] = useState("");
  const [linkTargets, setLinkTargets] =
    useState<TabletopEntityLinkTargets>(EMPTY_LINK_TARGETS);
  const [paletteAssets, setPaletteAssets] = useState<TabletopAssetTarget[]>([]);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [assetDropType, setAssetDropType] = useState<"token" | "object">(
    "object",
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [diagnostics, setDiagnostics] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState(false);
  const editable = Boolean(
    persistedScene && persistedScene.status !== "archived",
  );
  const selected = useMemo(
    () =>
      snapshot.scene.entities.filter((entity) =>
        snapshot.selectedIds.includes(entity.id),
      ),
    [snapshot],
  );
  const primary = selected[0];
  const currentSceneIndex = scenes.findIndex(
    (scene) => scene.id === persistedScene?.id,
  );
  const primaryProperties = entityProperties(primary?.properties);
  const visualConditions = Array.isArray(primaryProperties.visual_conditions)
    ? primaryProperties.visual_conditions.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const visualIcons = Array.isArray(primaryProperties.icons)
    ? primaryProperties.icons.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const barCurrent = Number(primaryProperties.bar_current) || 0;
  const barMax = Number(primaryProperties.bar_max) || 0;

  const installScene = useCallback((scene: PersistedTabletopScene) => {
    persistedSceneRef.current = scene;
    setPersistedScene(scene);
    setDirty(false);
    setConflict(false);
    if (engineReadyRef.current) {
      engineRef.current?.loadScene(scene);
      engineRef.current?.setReadOnly(scene.status === "archived");
      engineRef.current?.fitToScreen();
    }
  }, []);

  const installVisibility = useCallback(
    (next: TabletopVisibilityState, sceneVersion?: number) => {
      visibilityRef.current = next;
      setVisibility(next);
      setVisibilityDirty(false);
      setVisibilityAvailable(true);
      engineRef.current?.setVisibility(next, lightingEnabled);
      if (typeof sceneVersion === "number" && persistedSceneRef.current) {
        const stored = {
          ...persistedSceneRef.current,
          globalIllumination: next.globalIllumination,
          version: sceneVersion,
        };
        persistedSceneRef.current = stored;
        setPersistedScene(stored);
      }
    },
    [lightingEnabled],
  );

  const previewVisibility = useCallback(
    (next: TabletopVisibilityState) => {
      visibilityRef.current = next;
      setVisibility(next);
      setVisibilityDirty(true);
      engineRef.current?.setVisibility(next, lightingEnabled);
    },
    [lightingEnabled],
  );

  const clearScene = useCallback(() => {
    persistedSceneRef.current = null;
    setPersistedScene(null);
    setSnapshots([]);
    setSnapshotId("");
    setDirty(false);
    setConflict(false);
    const emptyVisibility = createEmptyVisibilityState();
    visibilityRef.current = emptyVisibility;
    setVisibility(emptyVisibility);
    setVisibilityDirty(false);
    setVisibilityAvailable(true);
    if (engineReadyRef.current) {
      engineRef.current?.loadScene(EMPTY_TABLETOP_SCENE);
      engineRef.current?.setVisibility(emptyVisibility, false);
      engineRef.current?.setReadOnly(true);
    }
  }, []);

  const loadSnapshots = useCallback(async (sceneId: string) => {
    const next = await tabletopPersistenceService.listSnapshots(sceneId);
    setSnapshots(next);
    setSnapshotId((current) =>
      next.some((item) => item.id === current) ? current : (next[0]?.id ?? ""),
    );
  }, []);

  const loadScene = useCallback(
    async (sceneId: string) => {
      setLoading(true);
      try {
        const scene = await tabletopPersistenceService.loadScene(sceneId);
        installScene(scene);
        if (lightingEnabled) {
          try {
            installVisibility(await tabletopVisibilityService.load(scene.id));
          } catch {
            const fallback = createEmptyVisibilityState();
            visibilityRef.current = fallback;
            setVisibility(fallback);
            setVisibilityDirty(false);
            setVisibilityAvailable(false);
            engineRef.current?.setVisibility(fallback, false);
            toast.error(
              "A cena abriu, mas a iluminação não pôde ser carregada com segurança.",
            );
          }
        } else {
          installVisibility(createEmptyVisibilityState());
        }
        await loadSnapshots(scene.id);
      } catch (error) {
        toast.error(errorMessage(error));
        clearScene();
      } finally {
        setLoading(false);
      }
    },
    [
      clearScene,
      installScene,
      installVisibility,
      lightingEnabled,
      loadSnapshots,
    ],
  );

  const refreshScenes = useCallback(async (nextCampaignId: string) => {
    const next = await tabletopPersistenceService.listScenes(nextCampaignId);
    setScenes(next);
    return next;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const engine = new TabletopEngine({
      onChange: (next) => {
        if (cancelled) return;
        setSnapshot(next);
        const stored = persistedSceneRef.current;
        setDirty(
          Boolean(
            stored &&
            stored.id === next.scene.id &&
            sceneFingerprint(stored) !== sceneFingerprint(next.scene),
          ),
        );
      },
      onAssetError: (message) => toast.error(message),
      onContextMenu: (position, entityId) =>
        setContextMenu({ ...clampContextMenu(position), entityId }),
    });
    engineRef.current = engine;
    void engine
      .init(host)
      .then(() => {
        if (cancelled) return;
        engineReadyRef.current = true;
        const stored = persistedSceneRef.current;
        if (stored) {
          engine.loadScene(stored);
          engine.setVisibility(visibilityRef.current, lightingEnabled);
          engine.setReadOnly(stored.status === "archived");
          engine.fitToScreen();
        } else {
          engine.setReadOnly(true);
        }
      })
      .catch((error) => toast.error(errorMessage(error)));
    return () => {
      cancelled = true;
      engineReadyRef.current = false;
      engineRef.current = null;
      void engine.destroy();
    };
  }, [lightingEnabled]);

  useEffect(() => {
    let active = true;
    void tabletopPersistenceService
      .listCampaigns()
      .then((next) => {
        if (!active) return;
        setCampaigns(next);
        setCampaignId((current) => current || next[0]?.id || "");
        if (next.length === 0) setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(errorMessage(error));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    let active = true;
    setLoading(true);
    void refreshScenes(campaignId)
      .then(async (next) => {
        if (!active) return;
        const preferred =
          next.find((scene) => scene.status !== "archived") ?? next[0];
        if (preferred) await loadScene(preferred.id);
        else clearScene();
      })
      .catch((error) => {
        if (active) toast.error(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId, clearScene, loadScene, refreshScenes]);

  useEffect(() => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      setLinkTargets(EMPTY_LINK_TARGETS);
      return;
    }
    let active = true;
    void tabletopPersistenceService
      .listEntityLinkTargets(campaign.id, campaign.workspaceId)
      .then((targets) => {
        if (active) setLinkTargets(targets);
      })
      .catch((error) => {
        if (active) toast.error(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [campaignId, campaigns]);

  useEffect(() => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      setPaletteAssets([]);
      return;
    }
    let active = true;
    setPaletteLoading(true);
    void tabletopPersistenceService
      .listPaletteAssets(campaign.workspaceId, campaign.id)
      .then((assets) => {
        if (active) setPaletteAssets(assets);
      })
      .catch(() => {
        if (active) setPaletteAssets([]);
      })
      .finally(() => {
        if (active) setPaletteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [campaignId, campaigns]);

  const saveCurrent = async (overrides: TabletopSaveOverrides = {}) => {
    const stored = persistedSceneRef.current;
    if (!stored || !editable) return null;
    setSaving(true);
    try {
      const saved = await tabletopPersistenceService.saveWorkspace(
        stored,
        snapshot.scene,
        overrides,
      );
      installScene(saved);
      await Promise.all([
        refreshScenes(saved.campaignId),
        loadSnapshots(saved.id),
      ]);
      toast.success(
        overrides.status === "archived" ? "Cena arquivada." : "Cena salva.",
      );
      return saved;
    } catch (error) {
      if (
        error instanceof TabletopServiceError &&
        error.code === "TABLETOP_CONFLICT"
      )
        setConflict(true);
      toast.error(errorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createScene = async () => {
    if (!campaignId) return;
    const name = window.prompt("Nome da nova cena:", "Nova cena");
    if (name === null) return;
    setSaving(true);
    try {
      const created = await tabletopPersistenceService.createScene(
        campaignId,
        name,
      );
      await refreshScenes(campaignId);
      installScene(created);
      setSnapshots([]);
      setSnapshotId("");
      toast.success("Cena criada com cinco camadas protegidas.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const duplicateScene = async () => {
    const stored = persistedSceneRef.current;
    if (!stored) return;
    if (dirty) {
      toast.error("Salve ou recarregue a cena antes de duplicá-la.");
      return;
    }
    setSaving(true);
    try {
      const duplicate = await tabletopPersistenceService.duplicateScene(
        stored.id,
      );
      await refreshScenes(duplicate.campaignId);
      installScene(duplicate);
      setSnapshots([]);
      setSnapshotId("");
      toast.success("Cena duplicada como rascunho.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const archiveScene = async () => {
    const stored = persistedSceneRef.current;
    if (!stored || stored.status === "archived") return;
    if (!window.confirm(`Arquivar a cena “${stored.name}”?`)) return;
    const saved = await saveCurrent({ status: "archived" });
    if (!saved) return;
    const next = (await refreshScenes(saved.campaignId)).find(
      (scene) => scene.status !== "archived",
    );
    if (next) await loadScene(next.id);
    else clearScene();
  };

  const moveCurrentScene = async (direction: -1 | 1) => {
    const stored = persistedSceneRef.current;
    if (!stored || dirty) {
      if (dirty) toast.error("Salve ou recarregue antes de reordenar cenas.");
      return;
    }
    const reordered = moveTabletopScene(scenes, stored.id, direction);
    if (reordered === scenes) return;
    setSaving(true);
    try {
      const next = await tabletopPersistenceService.reorderScenes(
        stored.campaignId,
        reordered,
      );
      setScenes(next);
      await loadScene(stored.id);
      toast.success("Ordem das cenas atualizada.");
    } catch (error) {
      if (
        error instanceof TabletopServiceError &&
        error.code === "TABLETOP_CONFLICT"
      )
        setConflict(true);
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const createSnapshot = async () => {
    let stored = persistedSceneRef.current;
    if (!stored) return;
    if (dirty) {
      stored = await saveCurrent();
      if (!stored) return;
    }
    const name = window.prompt("Nome do snapshot:", "Snapshot manual");
    if (name === null) return;
    setSaving(true);
    try {
      await tabletopPersistenceService.createSnapshot(stored.id, name);
      await loadSnapshots(stored.id);
      toast.success("Snapshot criado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const restoreSnapshot = async () => {
    const stored = persistedSceneRef.current;
    if (!stored || !snapshotId) return;
    if (
      !window.confirm(
        "Restaurar este snapshot? Um snapshot de recuperação será criado antes.",
      )
    )
      return;
    setSaving(true);
    try {
      await tabletopPersistenceService.restoreSnapshot(
        snapshotId,
        stored.version,
      );
      await loadScene(stored.id);
      await refreshScenes(stored.campaignId);
      toast.success("Snapshot restaurado com ponto de recuperação.");
    } catch (error) {
      if (
        error instanceof TabletopServiceError &&
        error.code === "TABLETOP_CONFLICT"
      )
        setConflict(true);
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const requestSceneChange = (sceneId: string) => {
    if (sceneId === persistedSceneRef.current?.id) return;
    if (
      dirty &&
      !window.confirm("Descartar as alterações locais e abrir outra cena?")
    )
      return;
    void loadScene(sceneId);
  };

  const requestCampaignChange = (nextCampaignId: string) => {
    if (
      dirty &&
      !window.confirm("Descartar as alterações locais e trocar de campanha?")
    )
      return;
    setCampaignId(nextCampaignId);
  };

  const updateNumber = (
    key: "x" | "y" | "width" | "height" | "rotation",
    value: string,
  ) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const normalized =
      key === "width" || key === "height" ? Math.max(8, parsed) : parsed;
    engineRef.current?.updateSelected({ [key]: normalized }, `Alterar ${key}`);
  };

  const applySizePreset = (size: number) => {
    engineRef.current?.updateSelected(
      { width: size, height: size },
      "Aplicar preset de tamanho",
    );
  };

  const updateProperties = (patch: Record<string, unknown>) =>
    engineRef.current?.updateSelectedProperties(patch);

  const beginPaletteDrag = (
    event: DragEvent<HTMLElement>,
    payload: PaletteDragPayload,
    label: string,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(TABLETOP_PALETTE_MIME, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", label);
  };

  const paletteSeed = (
    payload: PaletteDragPayload,
  ): TabletopEntitySeed | null => {
    if (payload.kind === "asset") {
      const asset = paletteAssets.find((item) => item.id === payload.id);
      if (!asset) return null;
      return {
        type: payload.entityType,
        label: asset.displayName,
        width: payload.entityType === "token" ? 64 : asset.width,
        height: payload.entityType === "token" ? 64 : asset.height,
        assetId: asset.id,
        assetUrl: asset.previewUrl,
        properties: { source: "nexus_assets", mime_type: asset.mimeType },
      };
    }

    const node = linkTargets.knowledge.find((item) => item.id === payload.id);
    if (!node) return null;
    return {
      type: knowledgeEntityType(node.nodeType),
      label: node.title,
      linkedKnowledgeNodeId: node.id,
      properties: { source: "nexus_library", node_type: node.nodeType },
    };
  };

  const insertPaletteItem = (payload: PaletteDragPayload) => {
    if (!editable) return;
    const seed = paletteSeed(payload);
    if (!seed) return;
    engineRef.current?.addEntityToViewport(seed);
  };

  const updateBackgroundAsset = (assetId: string) => {
    const asset = paletteAssets.find((item) => item.id === assetId);
    engineRef.current?.setBackgroundAsset(asset?.id ?? null, asset?.previewUrl);
  };

  const dropPaletteItem = (event: DragEvent<HTMLElement>) => {
    const payload = parsePaletteDragPayload(
      event.dataTransfer.getData(TABLETOP_PALETTE_MIME),
    );
    if (!payload || !editable) return;
    event.preventDefault();

    const seed = paletteSeed(payload);
    if (!seed) return;

    const engine = engineRef.current;
    engine?.addEntityAt(
      seed,
      engine.clientToWorld({ x: event.clientX, y: event.clientY }),
    );
  };

  const closeContext = () => setContextMenu(null);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-[#080a0f] text-foreground">
      <header className="relative z-10 border-b border-border/70 bg-card/95 px-3 py-3 shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 min-w-32">
            <p className="tadeon-eyebrow">Editor persistente</p>
            <h1 className="font-cinzel text-lg font-semibold">Mesa Nexus</h1>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:max-w-[28rem]">
            <select
              aria-label="Campanha da Mesa Nexus"
              value={campaignId}
              onChange={(event) => requestCampaignChange(event.target.value)}
              className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-xs sm:h-9"
            >
              {campaigns.length === 0 && (
                <option value="">Sem campanhas</option>
              )}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Cena da Mesa Nexus"
              value={persistedScene?.id ?? ""}
              onChange={(event) => requestSceneChange(event.target.value)}
              disabled={!campaignId || scenes.length === 0}
              className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-xs sm:h-9"
            >
              {scenes.length === 0 && <option value="">Nenhuma cena</option>}
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.status === "archived" ? "Arquivada · " : ""}
                  {scene.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            className="min-w-24 gap-2"
            disabled={!editable || !dirty || saving || conflict}
            onClick={() => void saveCurrent()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : dirty ? (
              <Save className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            {saving ? "Salvando" : dirty ? "Salvar" : "Salvo"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2 sm:hidden"
            aria-expanded={mobileToolsOpen}
            onClick={() => setMobileToolsOpen((value) => !value)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Ferramentas
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="lg:hidden"
            aria-label={mobilePanelOpen ? "Fechar painel" : "Abrir painel"}
            aria-expanded={mobilePanelOpen}
            onClick={() => setMobilePanelOpen((value) => !value)}
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={`${mobileToolsOpen ? "flex" : "hidden"} mt-3 flex-wrap items-center gap-2 border-t border-border/50 pt-3 sm:flex`}
        >
          <ToolbarButton
            label="Mover cena para cima"
            disabled={
              !persistedScene || saving || dirty || currentSceneIndex <= 0
            }
            onClick={() => void moveCurrentScene(-1)}
          >
            <ChevronUp className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Mover cena para baixo"
            disabled={
              !persistedScene ||
              saving ||
              dirty ||
              currentSceneIndex < 0 ||
              currentSceneIndex >= scenes.length - 1
            }
            onClick={() => void moveCurrentScene(1)}
          >
            <ChevronDown className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Nova cena"
            disabled={!campaignId || saving}
            onClick={() => void createScene()}
          >
            <Plus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Duplicar cena"
            disabled={!persistedScene || saving || dirty}
            onClick={() => void duplicateScene()}
          >
            <Copy className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Arquivar cena"
            disabled={!editable || saving}
            onClick={() => void archiveScene()}
          >
            <Archive className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label={conflict ? "Recarregar após conflito" : "Recarregar cena"}
            disabled={!persistedScene || saving}
            onClick={() => persistedScene && void loadScene(persistedScene.id)}
          >
            <RefreshCw
              className={`h-4 w-4 ${conflict ? "text-destructive" : ""}`}
            />
          </ToolbarButton>

          <span className="mx-1 hidden h-7 w-px bg-border sm:block" />
          <ToolbarButton
            label="Adicionar token"
            disabled={!editable || saving}
            onClick={() => engineRef.current?.addEntity("token")}
          >
            <UserRound className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Adicionar objeto"
            disabled={!editable || saving}
            onClick={() => engineRef.current?.addEntity("object")}
          >
            <Box className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Copiar seleção"
            disabled={!editable || selected.length === 0}
            onClick={() => engineRef.current?.copySelected()}
          >
            <Clipboard className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Colar"
            disabled={!editable}
            onClick={() => engineRef.current?.pasteClipboard()}
          >
            <ClipboardPaste className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Desfazer"
            disabled={!editable || !snapshot.canUndo}
            onClick={() => engineRef.current?.undo()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Refazer"
            disabled={!editable || !snapshot.canRedo}
            onClick={() => engineRef.current?.redo()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Centralizar"
            onClick={() => engineRef.current?.center()}
          >
            <Focus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Ajustar à tela"
            onClick={() => engineRef.current?.fitToScreen()}
          >
            <Maximize2 className="h-4 w-4" />
          </ToolbarButton>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            <Grid2X2 className="h-4 w-4 text-muted-foreground" />
            <select
              aria-label="Modo de grade"
              value={snapshot.scene.gridMode}
              disabled={!editable}
              onChange={(event) =>
                engineRef.current?.setGrid(
                  event.target.value === "none" ? "none" : "square",
                )
              }
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs min-[480px]:max-w-36 sm:h-9 sm:flex-none"
            >
              <option value="square">Grade quadrada</option>
              <option value="none">Sem grade</option>
            </select>
            <Input
              aria-label="Tamanho da grade"
              type="number"
              min={8}
              disabled={!editable}
              value={snapshot.scene.gridSize}
              onChange={(event) =>
                engineRef.current?.setGrid(
                  snapshot.scene.gridMode,
                  Number(event.target.value),
                )
              }
              className="h-10 w-20 sm:h-9"
            />
            <Label
              htmlFor="tabletop-snap"
              className="text-xs text-muted-foreground"
            >
              Snap
            </Label>
            <Switch
              id="tabletop-snap"
              disabled={!editable}
              checked={snapshot.scene.snap}
              onCheckedChange={(checked) => engineRef.current?.setSnap(checked)}
            />
            <ToolbarButton
              label="Diagnóstico"
              onClick={() => setDiagnostics((value) => !value)}
            >
              <Bug className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>
        <TabletopLiveSession
          enabled={realtimeEnabled}
          campaignId={campaignId || null}
          campaignName={
            campaigns.find((campaign) => campaign.id === campaignId)?.name ?? null
          }
          sceneId={persistedScene?.id ?? null}
          sceneName={persistedScene?.name ?? null}
        />
      </header>

      {conflict && (
        <div
          role="alert"
          className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
        >
          Outra sessão alterou esta cena. Suas mudanças locais não foram
          sobrescritas; recarregue a versão atual antes de editar novamente.
        </div>
      )}
      {persistedScene?.status === "archived" && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          Cena arquivada em modo de consulta. Duplique-a para continuar
          editando.
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section
          className="relative min-h-[58svh] overflow-hidden sm:min-h-[65vh] lg:min-h-0"
          onClick={closeContext}
          onDragOver={(event) => {
            if (
              editable &&
              event.dataTransfer.types.includes(TABLETOP_PALETTE_MIME)
            ) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={dropPaletteItem}
        >
          <div ref={hostRef} className="absolute inset-0" />
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!persistedScene && !loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto max-w-sm rounded-2xl border border-primary/20 bg-card/90 p-6 text-center shadow-2xl backdrop-blur">
                <MousePointer2 className="mx-auto h-8 w-8 text-primary" />
                <h2 className="mt-3 font-cinzel text-xl">Nenhuma cena</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crie uma cena persistente para iniciar o mapa, as camadas e os
                  tokens.
                </p>
                <Button
                  className="mt-4 gap-2"
                  disabled={!campaignId}
                  onClick={() => void createScene()}
                >
                  <Plus className="h-4 w-4" />
                  Criar cena
                </Button>
              </div>
            </div>
          )}
          {persistedScene &&
            snapshot.scene.entities.length === 0 &&
            !loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto max-w-sm rounded-2xl border border-primary/20 bg-card/90 p-6 text-center shadow-2xl backdrop-blur">
                  <MousePointer2 className="mx-auto h-8 w-8 text-primary" />
                  <h2 className="mt-3 font-cinzel text-xl">Cena vazia</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Adicione um token ou objeto. As mudanças só chegam ao banco
                    quando você salvar.
                  </p>
                  <Button
                    className="mt-4 gap-2"
                    disabled={!editable}
                    onClick={() => engineRef.current?.addEntity("token")}
                  >
                    <UserRound className="h-4 w-4" />
                    Adicionar token
                  </Button>
                </div>
              </div>
            )}
          {diagnostics && (
            <pre className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-black/80 p-3 text-[10px] text-emerald-300">
              {JSON.stringify(engineRef.current?.diagnostics() ?? {}, null, 2)}
            </pre>
          )}
        </section>

        <aside
          className={`${mobilePanelOpen ? "block" : "hidden"} max-h-[72svh] overflow-y-auto border-t border-border/70 bg-card/95 p-4 lg:block lg:max-h-none lg:border-l lg:border-t-0`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              <p className="tadeon-eyebrow">Paleta e controles</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMobilePanelOpen(false)}
            >
              Fechar
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Arraste no computador ou toque para inserir no centro do mapa.
          </p>
          <div className="mt-3">
            <Label htmlFor="asset-drop-type" className="text-[10px] uppercase">
              Asset entra como
            </Label>
            <select
              id="asset-drop-type"
              value={assetDropType}
              disabled={!editable}
              onChange={(event) =>
                setAssetDropType(
                  event.target.value === "token" ? "token" : "object",
                )
              }
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="object">Objeto</option>
              <option value="token">Token</option>
            </select>
          </div>
          <div className="mt-3">
            <Label
              htmlFor="scene-background-asset"
              className="text-[10px] uppercase"
            >
              Mapa de fundo
            </Label>
            <select
              id="scene-background-asset"
              value={snapshot.scene.backgroundAssetId ?? ""}
              disabled={!editable}
              onChange={(event) => updateBackgroundAsset(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="">Sem mapa de fundo</option>
              {paletteAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.displayName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Usa um asset privado autorizado para preencher a camada Mapa.
            </p>
          </div>
          <div className="mt-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {paletteLoading && (
              <div className="col-span-2 flex items-center justify-center py-5">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {!paletteLoading && paletteAssets.length === 0 && (
              <p className="col-span-2 rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                Nenhuma imagem pronta no Nexus Assets.
              </p>
            )}
            {paletteAssets.slice(0, 12).map((asset) => (
              <button
                key={asset.id}
                type="button"
                draggable={editable}
                disabled={!editable}
                title={`Adicionar ${asset.displayName}`}
                onClick={() =>
                  insertPaletteItem({
                    kind: "asset",
                    id: asset.id,
                    entityType: assetDropType,
                  })
                }
                onDragStart={(event) =>
                  beginPaletteDrag(
                    event,
                    { kind: "asset", id: asset.id, entityType: assetDropType },
                    asset.displayName,
                  )
                }
                className="overflow-hidden rounded-md border border-border/60 bg-secondary/15 text-left disabled:opacity-50"
              >
                <div className="flex aspect-video items-center justify-center bg-black/30">
                  {asset.previewUrl ? (
                    <img
                      src={asset.previewUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className="block truncate px-2 py-1.5 text-[10px]">
                  {asset.displayName}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Biblioteca de O Nexus
            </p>
          </div>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
            {linkTargets.knowledge.length === 0 && (
              <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                Nenhuma Página do Nexus disponível.
              </p>
            )}
            {linkTargets.knowledge.slice(0, 12).map((node) => (
              <button
                key={node.id}
                type="button"
                draggable={editable}
                disabled={!editable}
                onClick={() =>
                  insertPaletteItem({ kind: "knowledge", id: node.id })
                }
                onDragStart={(event) =>
                  beginPaletteDrag(
                    event,
                    { kind: "knowledge", id: node.id },
                    node.title,
                  )
                }
                className="flex w-full items-center gap-2 rounded-md border border-border/50 bg-secondary/15 px-2 py-2 text-left disabled:opacity-50"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-xs">
                  {node.title}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {node.nodeType}
                </span>
              </button>
            ))}
          </div>

          <TabletopVisibilityPanel
            enabled={lightingEnabled}
            editable={editable && visibilityAvailable}
            sceneId={persistedScene?.id ?? null}
            sceneWidth={snapshot.scene.width}
            sceneHeight={snapshot.scene.height}
            state={visibility}
            dirty={visibilityDirty}
            onPreview={previewVisibility}
            onSaved={installVisibility}
          />

          <div className="mt-6 flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-primary" />
            <p className="tadeon-eyebrow">Camadas</p>
          </div>
          <div className="mt-3 space-y-1">
            {snapshot.scene.layers.map((layer) => (
              <div
                key={layer.id}
                className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/15 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-xs">
                  {layer.name}
                </span>
                <button
                  type="button"
                  className="rounded p-1 hover:bg-secondary disabled:opacity-40"
                  aria-label={
                    layer.visible
                      ? `Ocultar ${layer.name}`
                      : `Exibir ${layer.name}`
                  }
                  disabled={!editable}
                  onClick={() =>
                    engineRef.current?.updateLayer(layer.id, {
                      visible: !layer.visible,
                    })
                  }
                >
                  {layer.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="rounded p-1 hover:bg-secondary disabled:opacity-40"
                  aria-label={
                    layer.locked
                      ? `Desbloquear ${layer.name}`
                      : `Bloquear ${layer.name}`
                  }
                  disabled={!editable || layer.layerType === "map"}
                  onClick={() =>
                    engineRef.current?.updateLayer(layer.id, {
                      locked: !layer.locked,
                    })
                  }
                >
                  {layer.locked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <LockOpen className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <p className="tadeon-eyebrow">Snapshots</p>
          </div>
          <div className="mt-3 flex gap-2">
            <select
              aria-label="Snapshot da cena"
              value={snapshotId}
              disabled={snapshots.length === 0 || saving}
              onChange={(event) => setSnapshotId(event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
            >
              {snapshots.length === 0 && (
                <option value="">Nenhum snapshot</option>
              )}
              {snapshots.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · v{item.sceneVersion}
                </option>
              ))}
            </select>
            <ToolbarButton
              label="Criar snapshot"
              disabled={!editable || saving}
              onClick={() => void createSnapshot()}
            >
              <Camera className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Restaurar snapshot"
              disabled={!editable || !snapshotId || saving || dirty}
              onClick={() => void restoreSnapshot()}
            >
              <History className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <p className="tadeon-eyebrow mt-7">Inspector</p>
          {!primary ? (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Selecione uma entidade no canvas. Shift permite seleção múltipla.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-cinzel text-lg font-semibold">
                  {primary.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.length} selecionada
                  {selected.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label
                    htmlFor="entity-label"
                    className="text-[10px] uppercase"
                  >
                    Nome
                  </Label>
                  <Input
                    id="entity-label"
                    disabled={!editable || selected.length !== 1}
                    value={primary.label}
                    maxLength={240}
                    onChange={(event) =>
                      engineRef.current?.updateSelected(
                        { label: event.target.value },
                        "Renomear entidade",
                      )
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label
                      htmlFor="entity-size-preset"
                      className="text-[10px] uppercase"
                    >
                      Preset
                    </Label>
                    <select
                      id="entity-size-preset"
                      defaultValue=""
                      disabled={!editable}
                      onChange={(event) => {
                        const size = Number(event.target.value);
                        if (size > 0) applySizePreset(size);
                        event.target.value = "";
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">Tamanho…</option>
                      <option value="32">Minúsculo · ½</option>
                      <option value="64">Médio · 1</option>
                      <option value="128">Grande · 2</option>
                      <option value="192">Enorme · 3</option>
                      <option value="256">Colossal · 4</option>
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="entity-elevation"
                      className="text-[10px] uppercase"
                    >
                      Elevação
                    </Label>
                    <Input
                      id="entity-elevation"
                      type="number"
                      disabled={!editable}
                      value={primary.elevation ?? 0}
                      onChange={(event) =>
                        engineRef.current?.updateSelected(
                          { elevation: Number(event.target.value) || 0 },
                          "Alterar elevação",
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="entity-sheet"
                    className="text-[10px] uppercase"
                  >
                    Ficha vinculada
                  </Label>
                  <select
                    id="entity-sheet"
                    value={primary.linkedSheetId ?? ""}
                    disabled={!editable}
                    onChange={(event) => {
                      const linkedSheetId = event.target.value || null;
                      const sheet = linkTargets.sheets.find(
                        (item) => item.id === linkedSheetId,
                      );
                      engineRef.current?.updateSelected(
                        {
                          linkedSheetId,
                          ownerUserId: sheet?.ownerId ?? null,
                        },
                        "Vincular ficha e proprietário",
                      );
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Nenhuma ficha</option>
                    {linkTargets.sheets.map((sheet) => (
                      <option key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </option>
                    ))}
                  </select>
                  {primary.linkedSheetId && (
                    <a
                      href={`/sheet/${primary.linkedSheetId}`}
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Abrir ficha vinculada
                    </a>
                  )}
                  {primary.ownerUserId && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Proprietário do token definido pela ficha vinculada.
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="entity-knowledge"
                    className="text-[10px] uppercase"
                  >
                    Página do Nexus
                  </Label>
                  <select
                    id="entity-knowledge"
                    value={primary.linkedKnowledgeNodeId ?? ""}
                    disabled={!editable}
                    onChange={(event) =>
                      engineRef.current?.updateSelected(
                        { linkedKnowledgeNodeId: event.target.value || null },
                        "Vincular Página do Nexus",
                      )
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Nenhuma página</option>
                    {linkTargets.knowledge.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title} · {node.nodeType}
                      </option>
                    ))}
                  </select>
                  {primary.linkedKnowledgeNodeId && (
                    <a
                      href={`/nexus?node=${encodeURIComponent(primary.linkedKnowledgeNodeId)}`}
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Abrir Página do Nexus vinculada
                    </a>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <Label htmlFor="entity-hidden" className="text-xs">
                    Oculto na cena
                  </Label>
                  <Switch
                    id="entity-hidden"
                    disabled={!editable}
                    checked={primary.hidden}
                    onCheckedChange={(hidden) =>
                      engineRef.current?.updateSelected(
                        { hidden },
                        hidden ? "Ocultar entidade" : "Exibir entidade",
                      )
                    }
                  />
                </div>
                <div>
                  <Label
                    htmlFor="entity-status"
                    className="text-[10px] uppercase"
                  >
                    Estado visual
                  </Label>
                  <Input
                    id="entity-status"
                    disabled={!editable}
                    value={
                      typeof primaryProperties.status === "string"
                        ? primaryProperties.status
                        : ""
                    }
                    maxLength={80}
                    placeholder="Ex.: alerta, caído, neutro"
                    onChange={(event) =>
                      updateProperties({ status: event.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label
                      htmlFor="entity-bar-current"
                      className="text-[10px] uppercase"
                    >
                      Barra atual
                    </Label>
                    <Input
                      id="entity-bar-current"
                      type="number"
                      min={0}
                      disabled={!editable}
                      value={barCurrent}
                      onChange={(event) =>
                        updateProperties({
                          bar_current: Math.max(
                            0,
                            Number(event.target.value) || 0,
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="entity-bar-max"
                      className="text-[10px] uppercase"
                    >
                      Barra máxima
                    </Label>
                    <Input
                      id="entity-bar-max"
                      type="number"
                      min={0}
                      disabled={!editable}
                      value={barMax}
                      onChange={(event) =>
                        updateProperties({
                          bar_max: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </div>
                  <p className="col-span-2 -mt-2 text-[10px] text-muted-foreground">
                    Deixe a máxima em 0 para ocultar a barra. É apenas visual.
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="entity-icons"
                    className="text-[10px] uppercase"
                  >
                    Ícones ou marcadores
                  </Label>
                  <Input
                    id="entity-icons"
                    disabled={!editable}
                    value={visualIcons.join(", ")}
                    placeholder="Ex.: ⚑, ✦, Alvo"
                    onChange={(event) =>
                      updateProperties({
                        icons: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                          .slice(0, 4),
                      })
                    }
                  />
                </div>
                <div>
                  <Label
                    htmlFor="entity-conditions"
                    className="text-[10px] uppercase"
                  >
                    Condições visuais
                  </Label>
                  <Input
                    id="entity-conditions"
                    disabled={!editable}
                    value={visualConditions.join(", ")}
                    placeholder="Ex.: Sangrando, Marcado"
                    onChange={(event) =>
                      updateProperties({
                        visual_conditions: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean)
                          .slice(0, 20),
                      })
                    }
                  />
                </div>
                <div>
                  <Label
                    htmlFor="entity-notes"
                    className="text-[10px] uppercase"
                  >
                    Anotações
                  </Label>
                  <textarea
                    id="entity-notes"
                    disabled={!editable}
                    value={
                      typeof primaryProperties.notes === "string"
                        ? primaryProperties.notes
                        : ""
                    }
                    maxLength={2000}
                    rows={3}
                    onChange={(event) =>
                      updateProperties({ notes: event.target.value })
                    }
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["x", "y", "width", "height", "rotation"] as const).map(
                  (key) => (
                    <div
                      key={key}
                      className={key === "rotation" ? "col-span-2" : ""}
                    >
                      <Label
                        htmlFor={`entity-${key}`}
                        className="text-[10px] uppercase"
                      >
                        {key === "rotation" ? "Rotação" : key}
                      </Label>
                      <Input
                        id={`entity-${key}`}
                        type="number"
                        disabled={!editable}
                        value={Math.round(primary[key] * 100) / 100}
                        onChange={(event) =>
                          updateNumber(key, event.target.value)
                        }
                      />
                    </div>
                  ),
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!editable}
                  onClick={() => engineRef.current?.toggleSelectedLock()}
                >
                  {primary.locked ? (
                    <LockOpen className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {primary.locked ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!editable}
                  onClick={() => engineRef.current?.duplicateSelected()}
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!editable}
                  onClick={() => engineRef.current?.copySelected()}
                >
                  <Clipboard className="h-4 w-4" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={!editable}
                  onClick={() => engineRef.current?.pasteClipboard()}
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Colar
                </Button>
                <Button
                  variant="destructive"
                  className="col-span-2 gap-2"
                  disabled={!editable || primary.locked}
                  onClick={() => engineRef.current?.deleteSelected()}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir seleção
                </Button>
              </div>
              <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-[11px] text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <RotateCw className="h-3.5 w-3.5" /> Atalhos
                </p>
                <p className="mt-1">
                  Ctrl/Cmd+C · Ctrl/Cmd+V · Ctrl/Cmd+D · Del · setas
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {contextMenu && editable && (
        <div
          role="menu"
          className="fixed z-50 max-h-[calc(100dvh-1rem)] w-44 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
            onClick={() => {
              engineRef.current?.duplicateSelected();
              closeContext();
            }}
          >
            Duplicar
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
            onClick={() => {
              engineRef.current?.copySelected();
              closeContext();
            }}
          >
            Copiar
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
            onClick={() => {
              engineRef.current?.pasteClipboard();
              closeContext();
            }}
          >
            Colar
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
            onClick={() => {
              engineRef.current?.toggleSelectedLock();
              closeContext();
            }}
          >
            Bloquear / desbloquear
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              engineRef.current?.deleteSelected();
              closeContext();
            }}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="h-10 w-10 sm:h-9 sm:w-9"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
