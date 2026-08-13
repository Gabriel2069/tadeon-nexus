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
  Axis3d,
  BookOpen,
  Box,
  BrickWall,
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
  FileSearch,
  Film,
  Focus,
  Grid2X2,
  Hand,
  History,
  Image,
  ImagePlus,
  Layers3,
  Lightbulb,
  Loader2,
  Lock,
  LockOpen,
  Maximize2,
  MousePointer2,
  PanelRightOpen,
  PanelRightClose,
  PencilLine,
  Plus,
  Redo2,
  CloudFog,
  Eraser,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Ruler,
  Save,
  Scan,
  SlidersHorizontal,
  Trash2,
  Undo2,
  UserRound,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrandMark, ThreadField } from "@/components/brand-mark";
import { TabletopLiveSession } from "@/components/tabletop/tabletop-live-session";
import { TabletopHandoutViewer } from "@/components/tabletop/tabletop-handout-viewer";
import { TabletopEntityDossier } from "@/components/tabletop/tabletop-entity-dossier";
import { TabletopVisibilityPanel } from "@/components/tabletop/tabletop-visibility-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import { tabletopEntityInsightService } from "@/lib/tabletop/tabletop-entity-insight-service";
import type { TabletopSheetSummary } from "@/lib/tabletop/tabletop-entity-insight";
import { tabletopMasterHandoutService } from "@/lib/tabletop/tabletop-master-handout-service";
import type { TabletopParticipantHandout } from "@/lib/tabletop/tabletop-participant-service";
import { assetService } from "@/lib/assets/asset-service";
import { AssetServiceError } from "@/lib/assets/asset-errors";
import type { TabletopToolMode } from "@/lib/tabletop/interaction-controller";
import type { TabletopProjectionMode } from "@/lib/tabletop/camera-controller";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  normalizeTabletopViewOrientation,
  type TabletopViewOrientation,
  type TabletopViewState,
} from "@/lib/tabletop/tabletop-projection";
import { tabletopViewPreferenceService } from "@/lib/tabletop/tabletop-view-preference-service";
import {
  isTabletopBackgroundMime,
  isTabletopEntityMediaMime,
  tabletopMediaKind,
} from "@/lib/tabletop/tabletop-media";
import {
  createTabletopStructure,
  structureFamily,
  structureStateLabel,
  structureStateOptions,
  TABLETOP_STRUCTURE_PRESETS,
  type TabletopStructureType,
} from "@/lib/tabletop/tabletop-spatial";
import {
  createEmptyVisibilityState,
  tabletopVisibilityService,
  type TabletopLight,
  type TabletopVisibilityState,
  type TabletopWall,
} from "@/lib/tabletop/tabletop-visibility-service";
import { compactVisibilityToolPoints } from "@/lib/tabletop/visibility-tooling";
import {
  fitTabletopAssetSize,
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
  type TabletopEntity,
  type TabletopEntitySeed,
  type TabletopLevel,
  type TabletopSnapshot,
} from "@/lib/tabletop/types";
import type {
  TabletopAlignment,
  TabletopDistribution,
  TabletopStackEdge,
} from "@/lib/tabletop/tabletop-arrangement";
import "@/styles/tabletop-editor.css";

interface ContextMenuState extends Point {
  entityId?: string;
  lightId?: string;
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
  | { kind: "sheet"; id: string }
  | { kind: "knowledge"; id: string };

type TabletopPanelTab = "library" | "space" | "master" | "scene" | "inspector";
type PendingNavigation =
  | { kind: "scene"; id: string }
  | { kind: "campaign"; id: string };

const TOOL_LABELS: Record<TabletopToolMode, string> = {
  select: "Seleção",
  pan: "Mão",
  measure: "Régua",
  draw: "Desenho",
  structure: "Arquitetura",
  light: "Luz",
  fog_reveal: "Revelar névoa",
  fog_hide: "Cobrir com névoa",
};

const TOOL_HINTS: Record<TabletopToolMode, string> = {
  select: "Arraste uma área · alças transformam · Espaço move a cena",
  pan: "Arraste para navegar · Ctrl/Cmd + roda amplia · duplo clique enquadra",
  measure: "Arraste para medir · Alt ignora a grade · R ativa a régua",
  draw: "Arraste para desenhar · Shift cria uma linha · D ativa o traço",
  structure:
    "Arraste para construir · Shift mantém o eixo · Alt ignora a grade · B ativa",
  light: "Clique para a luz padrão · arraste para definir o alcance · L ativa",
  fog_reveal: "Pinte a área que os jogadores podem enxergar · F ativa",
  fog_hide: "Pinte para devolver uma área à névoa",
};

const DRAW_COLORS = ["#d9d7a4", "#74242d", "#4f6e5d", "#e9e3d5", "#1f3644"];

function colorToNumber(value: string) {
  const parsed = Number.parseInt(value.replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xd9d7a4;
}

function parsePaletteDragPayload(value: string): PaletteDragPayload | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.kind === "knowledge" && typeof parsed.id === "string") {
      return { kind: "knowledge", id: parsed.id };
    }
    if (parsed.kind === "sheet" && typeof parsed.id === "string") {
      return { kind: "sheet", id: parsed.id };
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
  const structureTypeRef = useRef<TabletopStructureType>("wall");
  const activeLevelIdRef = useRef<string | null>(null);
  const restoredViewRef = useRef<TabletopViewState | null>(null);
  const viewPreferenceSceneRef = useRef<string | null>(null);
  const pendingViewRef = useRef<TabletopViewState | null>(null);
  const viewSaveTimerRef = useRef<number | null>(null);
  const dossierRequestRef = useRef(0);
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
  const [dossierEntityId, setDossierEntityId] = useState<string | null>(null);
  const [dossierSheetSummary, setDossierSheetSummary] =
    useState<TabletopSheetSummary | null>(null);
  const [dossierHandout, setDossierHandout] =
    useState<TabletopParticipantHandout | null>(null);
  const [selectedHandout, setSelectedHandout] =
    useState<TabletopParticipantHandout | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [panelTab, setPanelTab] = useState<TabletopPanelTab>("library");
  const [paletteSearch, setPaletteSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");
  const [toolMode, setToolMode] = useState<TabletopToolMode>("select");
  const [projectionMode, setProjectionMode] =
    useState<TabletopProjectionMode>("plan");
  const [viewOrientation, setViewOrientation] =
    useState<TabletopViewOrientation>(DEFAULT_TABLETOP_VIEW_ORIENTATION);
  const [structureType, setStructureType] =
    useState<TabletopStructureType>("wall");
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(
    null,
  );
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetUploadProgress, setAssetUploadProgress] = useState(0);
  const [drawColor, setDrawColor] = useState("#d9d7a4");
  const [drawWidth, setDrawWidth] = useState(5);
  const [lightToolRadius, setLightToolRadius] = useState(320);
  const [fogToolRadius, setFogToolRadius] = useState(160);
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);
  const [sceneName, setSceneName] = useState("Nova cena");
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState("Marco da sessão");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
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
  const dossierEntity = useMemo(
    () =>
      snapshot.scene.entities.find((entity) => entity.id === dossierEntityId) ??
      null,
    [dossierEntityId, snapshot.scene.entities],
  );
  const selectedStructure = useMemo(
    () =>
      visibility.walls.find((wall) => wall.id === selectedStructureId) ?? null,
    [selectedStructureId, visibility.walls],
  );
  const selectedLight = useMemo(
    () =>
      visibility.lights.find((light) => light.id === selectedLightId) ?? null,
    [selectedLightId, visibility.lights],
  );
  const activeLevel = useMemo(
    () =>
      snapshot.scene.levels?.find((level) => level.id === activeLevelId) ??
      snapshot.scene.levels?.find((level) => level.visible) ??
      snapshot.scene.levels?.[0] ??
      null,
    [activeLevelId, snapshot.scene.levels],
  );
  const masterLayer =
    snapshot.scene.layers.find((layer) => layer.layerType === "master") ?? null;
  const masterEntities = snapshot.scene.entities.filter((entity) => {
    if (!entity.hidden && entity.layerId !== masterLayer?.id) return false;
    const query = masterSearch.trim().toLocaleLowerCase("pt-BR");
    return !query || entity.label.toLocaleLowerCase("pt-BR").includes(query);
  });
  const normalizedPaletteSearch = paletteSearch
    .trim()
    .toLocaleLowerCase("pt-BR");
  const visiblePaletteAssets = paletteAssets
    .filter(
      (asset) =>
        !normalizedPaletteSearch ||
        asset.displayName
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedPaletteSearch),
    )
    .slice(0, 36);
  const visiblePaletteSheets = linkTargets.sheets
    .filter(
      (sheet) =>
        !normalizedPaletteSearch ||
        sheet.name.toLocaleLowerCase("pt-BR").includes(normalizedPaletteSearch),
    )
    .slice(0, 36);
  const visiblePaletteKnowledge = linkTargets.knowledge
    .filter(
      (node) =>
        !normalizedPaletteSearch ||
        node.title.toLocaleLowerCase("pt-BR").includes(normalizedPaletteSearch) ||
        node.nodeType
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedPaletteSearch),
    )
    .slice(0, 36);
  const currentSceneIndex = scenes.findIndex(
    (scene) => scene.id === persistedScene?.id,
  );
  const primaryProperties = entityProperties(primary?.properties);
  const primaryMimeType =
    typeof primaryProperties.mime_type === "string"
      ? primaryProperties.mime_type
      : "";
  const primaryMediaKind = tabletopMediaKind(
    primaryMimeType,
    primary?.assetUrl,
  );
  const primaryAnimated =
    primaryMediaKind === "gif" || primaryMediaKind === "video";
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

  useEffect(() => {
    if (snapshot.selectedIds.length > 0) setPanelTab("inspector");
  }, [snapshot.selectedIds.length]);

  useEffect(() => {
    engineRef.current?.setToolMode(toolMode);
  }, [toolMode]);

  useEffect(() => {
    engineRef.current?.setDrawingStyle({
      color: colorToNumber(drawColor),
      width: drawWidth,
    });
  }, [drawColor, drawWidth]);

  useEffect(() => {
    engineRef.current?.setVisibilityToolRadius("light", lightToolRadius);
    engineRef.current?.setVisibilityToolRadius("fog", fogToolRadius);
  }, [fogToolRadius, lightToolRadius]);

  useEffect(() => {
    structureTypeRef.current = structureType;
    engineRef.current?.setStructureType(structureType);
  }, [structureType]);

  useEffect(() => {
    engineRef.current?.setProjectionMode(projectionMode);
  }, [projectionMode]);

  useEffect(() => {
    engineRef.current?.setProjectionOrientation(viewOrientation);
  }, [viewOrientation]);

  useEffect(() => {
    activeLevelIdRef.current = activeLevelId;
    engineRef.current?.setActiveLevel(activeLevelId);
  }, [activeLevelId]);

  useEffect(() => {
    if (!mobilePanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobilePanelOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobilePanelOpen]);

  const installScene = useCallback((scene: PersistedTabletopScene) => {
    persistedSceneRef.current = scene;
    setPersistedScene(scene);
    setDirty(false);
    setConflict(false);
    setActiveLevelId((current) =>
      scene.levels.some((level) => level.id === current && level.visible)
        ? current
        : (scene.levels.find((level) => level.visible)?.id ??
          scene.levels[0]?.id ??
          null),
    );
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

  const replaceStructure = useCallback(
    (nextStructure: TabletopWall) => {
      previewVisibility({
        ...visibilityRef.current,
        walls: visibilityRef.current.walls.map((wall) =>
          wall.id === nextStructure.id ? nextStructure : wall,
        ),
      });
    },
    [previewVisibility],
  );

  const deleteStructure = useCallback(
    (id: string) => {
      previewVisibility({
        ...visibilityRef.current,
        walls: visibilityRef.current.walls.filter((wall) => wall.id !== id),
      });
      setSelectedStructureId(null);
    },
    [previewVisibility],
  );

  const duplicateStructure = useCallback(
    (id: string) => {
      const source = visibilityRef.current.walls.find((wall) => wall.id === id);
      if (!source) return;
      const copy = {
        ...source,
        id: crypto.randomUUID(),
        x1: source.x1 + 24,
        y1: source.y1 + 24,
        x2: source.x2 + 24,
        y2: source.y2 + 24,
      };
      previewVisibility({
        ...visibilityRef.current,
        walls: [...visibilityRef.current.walls, copy],
      });
      engineRef.current?.setSelectedStructure(copy.id);
    },
    [previewVisibility],
  );

  const clearScene = useCallback(() => {
    viewPreferenceSceneRef.current = null;
    restoredViewRef.current = null;
    pendingViewRef.current = null;
    if (viewSaveTimerRef.current !== null) {
      window.clearTimeout(viewSaveTimerRef.current);
      viewSaveTimerRef.current = null;
    }
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
      viewPreferenceSceneRef.current = null;
      try {
        const [scene, restoredView] = await Promise.all([
          tabletopPersistenceService.loadScene(sceneId),
          tabletopViewPreferenceService.load(sceneId).catch(() => null),
        ]);
        const nextView = restoredView
          ? {
              ...restoredView,
              levelId: scene.levels.some(
                (level) => level.id === restoredView.levelId && level.visible,
              )
                ? restoredView.levelId
                : (scene.levels.find((level) => level.visible)?.id ??
                  scene.levels[0]?.id ??
                  null),
            }
          : null;
        restoredViewRef.current = nextView;
        installScene(scene);
        if (nextView) {
          setProjectionMode(nextView.projection);
          setViewOrientation(nextView);
          setActiveLevelId(nextView.levelId);
          engineRef.current?.applyViewState(nextView);
        } else {
          setProjectionMode("plan");
          setViewOrientation(DEFAULT_TABLETOP_VIEW_ORIENTATION);
          engineRef.current?.setProjectionOrientation(
            DEFAULT_TABLETOP_VIEW_ORIENTATION,
          );
          engineRef.current?.setProjectionMode("plan");
          engineRef.current?.fitToScreen();
        }
        viewPreferenceSceneRef.current = scene.id;
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

  const openEntityDossier = useCallback((entity: TabletopEntity) => {
    const request = dossierRequestRef.current + 1;
    dossierRequestRef.current = request;
    setDossierEntityId(entity.id);
    setDossierSheetSummary(null);
    setDossierHandout(null);
    const tasks: Promise<void>[] = [];

    if (entity.linkedSheetId) {
      tasks.push(
        tabletopEntityInsightService
          .loadSheetSummary(entity.linkedSheetId)
          .then((summary) => {
            if (dossierRequestRef.current === request)
              setDossierSheetSummary(summary);
          })
          .catch(() => {
            if (dossierRequestRef.current === request)
              toast.error(
                "A ficha vinculada não pôde ser resumida com segurança.",
              );
          }),
      );
    }

    if (entity.linkedKnowledgeNodeId) {
      tasks.push(
        tabletopMasterHandoutService
          .load(entity.linkedKnowledgeNodeId)
          .then((handout) => {
            if (dossierRequestRef.current !== request) return;
            if (entity.type === "handout_pin") {
              setDossierEntityId(null);
              setSelectedHandout(handout);
            } else {
              setDossierHandout(handout);
            }
          })
          .catch(() => {
            if (dossierRequestRef.current === request)
              toast.error(
                "O arquivo vinculado não pôde ser aberto com segurança.",
              );
          }),
      );
    }

    setDossierLoading(tasks.length > 0);
    if (tasks.length === 0) return;
    void Promise.all(tasks).finally(() => {
      if (dossierRequestRef.current === request) setDossierLoading(false);
    });
  }, []);

  const flushViewPreference = useCallback(() => {
    if (viewSaveTimerRef.current !== null)
      window.clearTimeout(viewSaveTimerRef.current);
    viewSaveTimerRef.current = null;
    const pending = pendingViewRef.current;
    const targetSceneId = viewPreferenceSceneRef.current;
    pendingViewRef.current = null;
    if (!pending || !targetSceneId) return;
    void tabletopViewPreferenceService
      .save(targetSceneId, pending)
      .catch(() => undefined);
  }, []);

  const queueViewPreference = useCallback(
    (view: TabletopViewState) => {
      if (!viewPreferenceSceneRef.current) return;
      pendingViewRef.current = view;
      if (viewSaveTimerRef.current !== null)
        window.clearTimeout(viewSaveTimerRef.current);
      viewSaveTimerRef.current = window.setTimeout(flushViewPreference, 500);
    },
    [flushViewPreference],
  );

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
      onActivateEntity: (entity) => {
        openEntityDossier(entity);
        return true;
      },
      onToolModeChange: setToolMode,
      onSelectStructure: (id) => {
        setSelectedStructureId(id);
        if (id) setPanelTab("space");
      },
      onSelectLight: (id) => {
        setSelectedLightId(id);
        if (id) setPanelTab("space");
      },
      onUpdateStructure: (_before, after) => replaceStructure(after),
      onDeleteStructure: deleteStructure,
      onDuplicateStructure: duplicateStructure,
      onUpdateLight: (_before: TabletopLight, after: TabletopLight) => {
        previewVisibility({
          ...visibilityRef.current,
          lights: visibilityRef.current.lights.map((light) =>
            light.id === after.id ? { ...after } : light,
          ),
        });
        setPanelTab("space");
      },
      onDeleteLight: (id) => {
        previewVisibility({
          ...visibilityRef.current,
          lights: visibilityRef.current.lights.filter(
            (light) => light.id !== id,
          ),
        });
        setSelectedLightId(null);
      },
      onDuplicateLight: (id) => {
        const source = visibilityRef.current.lights.find(
          (light) => light.id === id,
        );
        if (!source) return;
        const copy: TabletopLight = {
          ...source,
          id: crypto.randomUUID(),
          x: source.x + 24,
          y: source.y + 24,
          entityId: null,
          visibilityPolygon: undefined,
        };
        previewVisibility({
          ...visibilityRef.current,
          lights: [...visibilityRef.current.lights, copy],
        });
        engine.setSelectedLight(copy.id);
      },
      onCreateStructure: ({ start, end }) => {
        const id = crypto.randomUUID();
        const structure = createTabletopStructure({
          id,
          type: structureTypeRef.current,
          start,
          end,
        });
        if (!structure) return;
        const scene = persistedSceneRef.current;
        const spatialStructure: TabletopWall = {
          ...structure,
          levelId: activeLevelIdRef.current ?? scene?.levels[0]?.id ?? "",
          baseElevation: 0,
          height: Math.max(42, (scene?.gridSize ?? 64) * 1.15),
          thickness: 8,
          playerOperable: false,
          version: 1,
        };
        previewVisibility({
          ...visibilityRef.current,
          walls: [...visibilityRef.current.walls, spatialStructure],
        });
        setPanelTab("space");
        engine.setSelectedStructure(id);
      },
      onCommitVisibilityTool: (tool) => {
        const levelId =
          activeLevelIdRef.current ??
          persistedSceneRef.current?.levels[0]?.id ??
          "";
        if (!levelId || tool.points.length === 0) return;
        if (tool.kind === "light") {
          const point = tool.points[0];
          previewVisibility({
            ...visibilityRef.current,
            lights: [
              ...visibilityRef.current.lights,
              {
                id: crypto.randomUUID(),
                levelId,
                entityId: null,
                x: point.x,
                y: point.y,
                elevation: 0,
                radius: Math.max(8, Math.min(100_000, tool.radius)),
                intensity: 0.88,
                color: "#f2c66d",
                enabled: true,
                castsShadows: true,
              },
            ],
          });
        } else {
          const points = compactVisibilityToolPoints(tool.points);
          if (points.length === 0) return;
          const nextSequence = visibilityRef.current.fogStrokes.reduce(
            (maximum, stroke) => Math.max(maximum, stroke.sequenceIndex + 1),
            0,
          );
          previewVisibility({
            ...visibilityRef.current,
            fogEnabled: true,
            fogStrokes: [
              ...visibilityRef.current.fogStrokes,
              {
                id: crypto.randomUUID(),
                levelId,
                operation: tool.kind === "fog_reveal" ? "reveal" : "hide",
                points,
                radius: Math.max(8, Math.min(1_024, tool.radius)),
                sequenceIndex: nextSequence,
              },
            ],
          });
        }
        setPanelTab("space");
      },
      onContextMenu: (position, entityId, lightId) =>
        setContextMenu({ ...clampContextMenu(position), entityId, lightId }),
      onViewChange: queueViewPreference,
    });
    engineRef.current = engine;
    void engine
      .init(host)
      .then(() => {
        if (cancelled) return;
        engineReadyRef.current = true;
        engine.setStructureType(structureTypeRef.current);
        engine.setVisibilityToolRadius("light", 320);
        engine.setVisibilityToolRadius("fog", 160);
        const stored = persistedSceneRef.current;
        if (stored) {
          engine.loadScene(stored);
          engine.setVisibility(visibilityRef.current, lightingEnabled);
          engine.setReadOnly(stored.status === "archived");
          if (restoredViewRef.current)
            engine.applyViewState(restoredViewRef.current);
          else {
            engine.setActiveLevel(activeLevelIdRef.current);
            engine.fitToScreen();
          }
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
  }, [
    deleteStructure,
    duplicateStructure,
    lightingEnabled,
    openEntityDossier,
    previewVisibility,
    queueViewPreference,
    replaceStructure,
  ]);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushViewPreference();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flushViewPreference();
    };
  }, [flushViewPreference]);

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
    const name = sceneName.trim();
    if (!name) {
      toast.error("Dê um nome à nova cena.");
      return;
    }
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
      setSceneDialogOpen(false);
      setSceneName("Nova cena");
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
    const saved = await saveCurrent({ status: "archived" });
    if (!saved) return;
    setArchiveDialogOpen(false);
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
    const name = snapshotName.trim();
    if (!name) {
      toast.error("Dê um nome ao snapshot.");
      return;
    }
    setSaving(true);
    try {
      await tabletopPersistenceService.createSnapshot(stored.id, name);
      await loadSnapshots(stored.id);
      setSnapshotDialogOpen(false);
      setSnapshotName("Marco da sessão");
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
    setSaving(true);
    try {
      await tabletopPersistenceService.restoreSnapshot(
        snapshotId,
        stored.version,
      );
      await loadScene(stored.id);
      await refreshScenes(stored.campaignId);
      setRestoreDialogOpen(false);
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
    if (dirty) {
      setPendingNavigation({ kind: "scene", id: sceneId });
      return;
    }
    void loadScene(sceneId);
  };

  const requestCampaignChange = (nextCampaignId: string) => {
    if (dirty) {
      setPendingNavigation({ kind: "campaign", id: nextCampaignId });
      return;
    }
    setCampaignId(nextCampaignId);
  };

  const confirmPendingNavigation = () => {
    const pending = pendingNavigation;
    setPendingNavigation(null);
    if (!pending) return;
    if (pending.kind === "scene") void loadScene(pending.id);
    else setCampaignId(pending.id);
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

  const createLevel = () => {
    if (!editable) return;
    const levels = snapshot.scene.levels ?? [];
    const highest = levels.reduce(
      (value, level) =>
        Math.max(value, level.baseElevation + Math.max(8, level.height)),
      0,
    );
    const level: TabletopLevel = {
      id: crypto.randomUUID(),
      name: "Andar " + (levels.length + 1),
      order:
        levels.reduce((value, item) => Math.max(value, item.order), -1) + 1,
      baseElevation: highest,
      height: Math.max(64, snapshot.scene.gridSize * 3),
      visible: true,
      locked: false,
      version: 0,
    };
    engineRef.current?.addLevel(level);
    setActiveLevelId(level.id);
    setPanelTab("space");
  };

  const updateActiveLevel = (patch: Partial<TabletopLevel>) => {
    if (!activeLevel || !editable) return;
    engineRef.current?.updateLevel(activeLevel.id, patch, {
      restackAbove: true,
    });
  };

  const uploadTabletopImage = async (
    file: File,
    target: "entity" | "background",
  ) => {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (
      !campaign ||
      !editable ||
      (target === "background"
        ? !isTabletopBackgroundMime(file.type)
        : !isTabletopEntityMediaMime(file.type))
    ) {
      toast.error(
        target === "background"
          ? "Escolha PNG, JPEG, WebP ou AVIF para o ambiente."
          : "Escolha uma imagem, GIF animado, WebM ou MP4 para a entidade.",
      );
      return;
    }
    setAssetUploading(true);
    setAssetUploadProgress(0);
    try {
      const asset = await assetService.createUploadTask({
        workspaceId: campaign.workspaceId,
        campaignId: campaign.id,
        file,
        displayName: file.name,
        visibility: "campaign",
        provider: "supabase",
        metadata: {
          source: "tabletop",
          role: target === "background" ? "scene_background" : "entity_image",
        },
        onProgress: ({ percent }) => setAssetUploadProgress(percent),
      }).promise;
      const previewUrl = await assetService.createTemporaryAccess(asset, 300);
      const size = fitTabletopAssetSize(asset.width, asset.height);
      const targetAsset: TabletopAssetTarget = {
        id: asset.id,
        displayName: asset.display_name,
        mimeType: asset.mime_type,
        ...size,
        previewUrl,
      };
      setPaletteAssets((current) => [
        targetAsset,
        ...current.filter((item) => item.id !== targetAsset.id),
      ]);
      if (target === "background") {
        engineRef.current?.setBackgroundAsset(asset.id, previewUrl);
      } else {
        engineRef.current?.updateSelected(
          {
            assetId: asset.id,
            assetUrl: previewUrl,
            ...(primary?.type === "token" ||
            primary?.type === "character" ||
            primary?.type === "npc" ||
            primary?.type === "creature"
              ? {}
              : size),
          },
          "Aplicar imagem à entidade",
        );
        if (
          primary?.type === "token" ||
          primary?.type === "character" ||
          primary?.type === "npc" ||
          primary?.type === "creature" ||
          primary?.type === "object"
        )
          engineRef.current?.updateSelectedProperties({
            render_mode: "billboard",
            mime_type: asset.mime_type,
            playback_loop: true,
            playback_muted: true,
          });
      }
      toast.success(
        target === "background"
          ? "Imagem aplicada ao ambiente."
          : "Imagem aplicada ao token ou objeto.",
      );
    } catch (error) {
      toast.error(
        error instanceof AssetServiceError
          ? error.message
          : "Não foi possível enviar esta mídia ao Nexus Assets.",
      );
    } finally {
      setAssetUploading(false);
      setAssetUploadProgress(0);
    }
  };

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
        properties: {
          source: "nexus_assets",
          mime_type: asset.mimeType,
          render_mode: "billboard",
          playback_loop: true,
          playback_muted: true,
          playback_speed: 1,
        },
      };
    }

    if (payload.kind === "sheet") {
      const sheet = linkTargets.sheets.find((item) => item.id === payload.id);
      if (!sheet) return null;
      return {
        type: "character",
        label: sheet.name,
        width: 72,
        height: 72,
        linkedSheetId: sheet.id,
        ownerUserId: sheet.ownerId,
        properties: {
          source: "nexus_sheet",
          render_mode: "billboard",
        },
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
    if (asset && !isTabletopBackgroundMime(asset.mimeType)) return;
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
    <div className="tadeon-tabletop-studio flex min-h-[calc(100dvh-4rem)] flex-col text-foreground">
      <header className="tadeon-tabletop-studio__header relative z-20 border-b border-border/70 px-3 py-3 backdrop-blur-xl sm:px-4">
        <ThreadField className="text-primary opacity-20" />
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <div className="tadeon-tabletop-studio__brand mr-2">
            <BrandMark className="h-10 w-10 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="tadeon-eyebrow">Estúdio de cena</p>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate font-cinzel text-lg font-semibold">
                  Mesa Nexus
                </h1>
                <span className="tadeon-tabletop-studio__status">
                  {persistedScene?.status === "archived"
                    ? "Consulta"
                    : editable
                      ? "Edição"
                      : "Sem cena"}
                </span>
              </div>
            </div>
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
            className="min-w-24 gap-2 sm:ml-auto"
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
          className={`${mobileToolsOpen ? "flex" : "hidden"} tadeon-tabletop-toolbar relative z-10 mt-3 max-w-full flex-wrap items-center gap-2 overflow-x-auto border-t border-border/50 pt-3 sm:flex`}
        >
          <ToolbarGroup label="Cena">
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
              onClick={() => setSceneDialogOpen(true)}
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
              onClick={() => setArchiveDialogOpen(true)}
            >
              <Archive className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label={conflict ? "Recarregar após conflito" : "Recarregar cena"}
              disabled={!persistedScene || saving}
              onClick={() =>
                persistedScene && void loadScene(persistedScene.id)
              }
            >
              <RefreshCw
                className={`h-4 w-4 ${conflict ? "text-destructive" : ""}`}
              />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup label="Editar">
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
          </ToolbarGroup>

          <ToolbarGroup label="Visão">
            <CanvasToolButton
              label={
                projectionMode === "isometric"
                  ? "Voltar à planta 2D"
                  : "Ativar projeção espacial 3D"
              }
              active={projectionMode === "isometric"}
              onClick={() =>
                setProjectionMode((mode) =>
                  mode === "plan" ? "isometric" : "plan",
                )
              }
            >
              <Axis3d className="h-4 w-4" />
            </CanvasToolButton>
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
            <ToolbarButton
              label="Reduzir zoom"
              onClick={() => engineRef.current?.zoomBy(0.82)}
            >
              <ZoomOut className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Ampliar zoom"
              onClick={() => engineRef.current?.zoomBy(1.22)}
            >
              <ZoomIn className="h-4 w-4" />
            </ToolbarButton>
          </ToolbarGroup>

          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 rounded-xl border border-white/5 bg-white/[0.025] p-1.5">
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
            campaigns.find((campaign) => campaign.id === campaignId)?.name ??
            null
          }
          sceneId={persistedScene?.id ?? null}
          sceneName={persistedScene?.name ?? null}
          getCurrentCamera={() =>
            engineReadyRef.current
              ? engineRef.current?.directorCamera(activeLevelIdRef.current)
              : null
          }
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

      <div
        className={`tadeon-tabletop-workbench grid min-h-0 flex-1 grid-cols-1 ${
          panelCollapsed
            ? "lg:grid-cols-[minmax(0,1fr)_3.75rem]"
            : "lg:grid-cols-[minmax(0,1fr)_23rem] 2xl:grid-cols-[minmax(0,1fr)_25rem]"
        }`}
      >
        <section
          className="tadeon-tabletop-stage relative min-h-[64svh] overflow-hidden sm:min-h-[70vh] lg:min-h-0"
          data-projection={projectionMode}
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
          <div
            className="tadeon-tabletop-canvas-rail"
            aria-label="Ferramentas do canvas"
          >
            <CanvasToolButton
              label="Ferramenta de seleção"
              active={toolMode === "select"}
              onClick={() => setToolMode("select")}
            >
              <MousePointer2 className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Ferramenta mão para mover a cena"
              active={toolMode === "pan"}
              onClick={() => setToolMode("pan")}
            >
              <Hand className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Régua para medir distâncias (R)"
              active={toolMode === "measure"}
              onClick={() => setToolMode("measure")}
            >
              <Ruler className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Desenho livre persistente (D)"
              active={toolMode === "draw"}
              disabled={!editable}
              onClick={() => setToolMode("draw")}
            >
              <PencilLine className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Construir paredes e aberturas (B)"
              active={toolMode === "structure"}
              disabled={!editable || !lightingEnabled || !visibilityAvailable}
              onClick={() => setToolMode("structure")}
            >
              <BrickWall className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Posicionar luz e arrastar o alcance (L)"
              active={toolMode === "light"}
              disabled={!editable || !lightingEnabled || !visibilityAvailable}
              onClick={() => setToolMode("light")}
            >
              <Lightbulb className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Pincel para revelar névoa (F)"
              active={toolMode === "fog_reveal"}
              disabled={!editable || !lightingEnabled || !visibilityAvailable}
              onClick={() => setToolMode("fog_reveal")}
            >
              <CloudFog className="h-4 w-4" />
            </CanvasToolButton>
            <CanvasToolButton
              label="Pincel para cobrir novamente com névoa"
              active={toolMode === "fog_hide"}
              disabled={!editable || !lightingEnabled || !visibilityAvailable}
              onClick={() => setToolMode("fog_hide")}
            >
              <Eraser className="h-4 w-4" />
            </CanvasToolButton>
            <span className="tadeon-tabletop-canvas-rail__divider" />
            <ToolbarButton
              label="Selecionar todas as entidades editáveis"
              disabled={!editable || snapshot.scene.entities.length === 0}
              onClick={() => engineRef.current?.selectAll()}
            >
              <Scan className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Adicionar token"
              disabled={!editable}
              onClick={() => engineRef.current?.addEntity("token")}
            >
              <UserRound className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Adicionar objeto"
              disabled={!editable}
              onClick={() => engineRef.current?.addEntity("object")}
            >
              <Box className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Abrir biblioteca"
              disabled={!persistedScene}
              onClick={() => {
                setPanelTab("library");
                setMobilePanelOpen(true);
              }}
            >
              <Image className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Ajustar à tela"
              onClick={() => engineRef.current?.fitToScreen()}
            >
              <Maximize2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
          {toolMode === "draw" && (
            <div
              className="tadeon-tabletop-tool-options"
              aria-label="Opções do desenho"
            >
              <div className="tadeon-tabletop-tool-options__heading">
                <PencilLine className="h-3.5 w-3.5" />
                <span>Traço</span>
              </div>
              <div
                className="tadeon-tabletop-draw-swatches"
                aria-label="Cores rápidas"
              >
                {DRAW_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Usar cor ${color}`}
                    aria-pressed={drawColor === color}
                    className="tadeon-tabletop-draw-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => setDrawColor(color)}
                  />
                ))}
                <label
                  className="tadeon-tabletop-draw-custom"
                  title="Cor personalizada"
                >
                  <span className="sr-only">Cor personalizada</span>
                  <input
                    type="color"
                    value={drawColor}
                    onChange={(event) => setDrawColor(event.target.value)}
                  />
                </label>
              </div>
              <label className="tadeon-tabletop-draw-width">
                <span>{drawWidth}px</span>
                <input
                  type="range"
                  min={2}
                  max={24}
                  step={1}
                  value={drawWidth}
                  onChange={(event) => setDrawWidth(Number(event.target.value))}
                />
              </label>
            </div>
          )}
          {(toolMode === "light" ||
            toolMode === "fog_reveal" ||
            toolMode === "fog_hide") && (
            <div
              className="tadeon-tabletop-tool-options"
              aria-label="Opções de luz e névoa no mapa"
            >
              <div className="tadeon-tabletop-tool-options__heading">
                {toolMode === "light" ? (
                  <Lightbulb className="h-3.5 w-3.5" />
                ) : toolMode === "fog_reveal" ? (
                  <CloudFog className="h-3.5 w-3.5" />
                ) : (
                  <Eraser className="h-3.5 w-3.5" />
                )}
                <span>
                  {toolMode === "light"
                    ? "Luz no mapa"
                    : toolMode === "fog_reveal"
                      ? "Revelar névoa"
                      : "Cobrir novamente"}
                </span>
              </div>
              {toolMode !== "light" && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={
                      toolMode === "fog_reveal" ? "secondary" : "outline"
                    }
                    onClick={() => setToolMode("fog_reveal")}
                  >
                    Revelar
                  </Button>
                  <Button
                    size="sm"
                    variant={toolMode === "fog_hide" ? "secondary" : "outline"}
                    onClick={() => setToolMode("fog_hide")}
                  >
                    Cobrir
                  </Button>
                </div>
              )}
              <label className="tadeon-tabletop-draw-width">
                <span>
                  {toolMode === "light"
                    ? `${lightToolRadius}px padrão`
                    : `${fogToolRadius}px de pincel`}
                </span>
                <input
                  type="range"
                  min={toolMode === "light" ? 32 : 16}
                  max={toolMode === "light" ? 1600 : 512}
                  step={8}
                  value={toolMode === "light" ? lightToolRadius : fogToolRadius}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (toolMode === "light") setLightToolRadius(value);
                    else setFogToolRadius(value);
                  }}
                />
              </label>
              <small className="max-w-56 text-[10px] text-muted-foreground">
                {toolMode === "light"
                  ? "Clique para usar o alcance padrão ou arraste para dimensionar."
                  : "Arraste sobre o mapa; o traço é compactado sem perder as extremidades."}
              </small>
            </div>
          )}
          {toolMode === "structure" && (
            <div
              className="tadeon-tabletop-tool-options tadeon-tabletop-tool-options--structure"
              aria-label="Opções de arquitetura"
            >
              <div className="tadeon-tabletop-tool-options__heading">
                <BrickWall className="h-3.5 w-3.5" />
                <span>Construir</span>
              </div>
              <div
                className="tadeon-tabletop-structure-presets"
                role="radiogroup"
                aria-label="Tipo de estrutura"
              >
                {TABLETOP_STRUCTURE_PRESETS.map((preset) => (
                  <button
                    key={preset.family}
                    type="button"
                    role="radio"
                    aria-checked={structureType === preset.type}
                    className="tadeon-tabletop-structure-preset"
                    onClick={() => setStructureType(preset.type)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedStructure && toolMode === "select" && (
            <div
              className="tadeon-tabletop-selection-dock tadeon-tabletop-selection-dock--structure"
              aria-label="Edição rápida da estrutura"
            >
              <div className="tadeon-tabletop-structure-selection__identity">
                <BrickWall className="h-4 w-4" aria-hidden="true" />
                <span>
                  <strong>
                    {structureStateLabel(selectedStructure.wallType)}
                  </strong>
                  <small>arraste o centro ou os vértices</small>
                </span>
              </div>
              {structureFamily(selectedStructure.wallType) !== "wall" && (
                <div
                  className="tadeon-tabletop-structure-selection__states"
                  aria-label="Estado rápido"
                >
                  {structureStateOptions(
                    structureFamily(selectedStructure.wallType),
                  ).map((stateType) => (
                    <button
                      key={stateType}
                      type="button"
                      aria-pressed={selectedStructure.wallType === stateType}
                      onClick={() =>
                        engineRef.current?.setSelectedStructureState(stateType)
                      }
                    >
                      {structureStateLabel(stateType).replace(
                        /^(Porta|Janela|Telhado) /,
                        "",
                      )}
                    </button>
                  ))}
                </div>
              )}
              <span className="tadeon-tabletop-selection-dock__divider" />
              <ToolbarButton
                label="Enquadrar estrutura"
                onClick={() => engineRef.current?.focusSelection()}
              >
                <Focus className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Duplicar estrutura"
                disabled={!editable}
                onClick={() => engineRef.current?.duplicateSelected()}
              >
                <Copy className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Abrir detalhes da estrutura"
                onClick={() => {
                  setPanelTab("space");
                  setPanelCollapsed(false);
                  setMobilePanelOpen(true);
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Excluir estrutura"
                disabled={!editable}
                onClick={() => engineRef.current?.deleteSelected()}
              >
                <Trash2 className="h-4 w-4" />
              </ToolbarButton>
            </div>
          )}
          {selected.length > 0 &&
            toolMode !== "draw" &&
            toolMode !== "structure" && (
              <div
                className="tadeon-tabletop-selection-dock"
                aria-label="Ações rápidas da seleção"
              >
                <div className="min-w-0 px-2">
                  <strong className="block truncate text-xs text-foreground">
                    {selected.length === 1
                      ? primary?.label
                      : `${selected.length} entidades`}
                  </strong>
                  <span className="block text-[10px] text-muted-foreground">
                    Seleção ativa
                  </span>
                </div>
                <span className="tadeon-tabletop-selection-dock__divider" />
                <ToolbarButton
                  label="Enquadrar seleção"
                  onClick={() => engineRef.current?.focusSelection()}
                >
                  <Focus className="h-4 w-4" />
                </ToolbarButton>
                {selected.length === 1 && primary && (
                  <ToolbarButton
                    label="Abrir cartão, ficha ou arquivo"
                    onClick={() => openEntityDossier(primary)}
                  >
                    <FileSearch className="h-4 w-4" />
                  </ToolbarButton>
                )}
                <ToolbarButton
                  label="Duplicar seleção"
                  disabled={!editable}
                  onClick={() => engineRef.current?.duplicateSelected()}
                >
                  <Copy className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label={
                    selected.some((entity) => !entity.hidden)
                      ? "Ocultar seleção dos jogadores"
                      : "Revelar seleção aos jogadores"
                  }
                  disabled={
                    !editable || selected.every((entity) => entity.locked)
                  }
                  onClick={() => {
                    const hidden = selected.some((entity) => !entity.hidden);
                    engineRef.current?.updateSelected(
                      { hidden },
                      hidden ? "Ocultar seleção" : "Revelar seleção",
                    );
                  }}
                >
                  {selected.some((entity) => !entity.hidden) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </ToolbarButton>
                {masterLayer && (
                  <ToolbarButton
                    label="Levar seleção aos bastidores do mestre"
                    disabled={
                      !editable ||
                      masterLayer.locked ||
                      selected.every((entity) => entity.locked)
                    }
                    onClick={() =>
                      engineRef.current?.moveSelectedToLayer(masterLayer.id)
                    }
                  >
                    <UserRound className="h-4 w-4" />
                  </ToolbarButton>
                )}
                <ToolbarButton
                  label="Bloquear ou desbloquear seleção"
                  disabled={!editable}
                  onClick={() => engineRef.current?.toggleSelectedLock()}
                >
                  {selected.some((entity) => entity.locked) ? (
                    <LockOpen className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </ToolbarButton>
                <ToolbarButton
                  label="Excluir seleção"
                  disabled={!editable}
                  onClick={() => engineRef.current?.deleteSelected()}
                >
                  <Trash2 className="h-4 w-4" />
                </ToolbarButton>
              </div>
            )}
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/55 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!persistedScene && !loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="tadeon-tabletop-empty-state pointer-events-auto max-w-sm p-6 text-center">
                <MousePointer2 className="mx-auto h-8 w-8 text-primary" />
                <h2 className="mt-3 font-cinzel text-xl">Nenhuma cena</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crie uma cena persistente para iniciar o mapa, as camadas e os
                  tokens.
                </p>
                <Button
                  className="mt-4 gap-2"
                  disabled={!campaignId}
                  onClick={() => setSceneDialogOpen(true)}
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
                <div className="tadeon-tabletop-empty-state pointer-events-auto max-w-sm p-6 text-center">
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
          {persistedScene && !loading && (
            <div
              className="tadeon-tabletop-stage-status"
              aria-label="Estado da cena"
            >
              <div className="tadeon-tabletop-stage-status__metric">
                <strong>{snapshot.scene.entities.length}</strong>
                <span>entidades</span>
              </div>
              <div className="tadeon-tabletop-stage-status__metric">
                <strong>{selected.length}</strong>
                <span>selecionadas</span>
              </div>
              <div className="tadeon-tabletop-stage-status__metric">
                <strong>
                  {snapshot.scene.gridMode === "none"
                    ? "Livre"
                    : snapshot.scene.gridSize}
                </strong>
                <span>grade</span>
              </div>
              <div className="tadeon-tabletop-stage-status__metric">
                <strong>{TOOL_LABELS[toolMode]}</strong>
                <span>ferramenta</span>
              </div>
              <span className="ml-auto hidden text-[11px] text-muted-foreground sm:block">
                {TOOL_HINTS[toolMode]}
              </span>
              <ToolbarButton
                label="Enquadrar seleção"
                disabled={selected.length === 0}
                onClick={() => engineRef.current?.focusSelection()}
              >
                <Focus className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Reduzir zoom"
                onClick={() => engineRef.current?.zoomBy(0.82)}
              >
                <ZoomOut className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                label="Ampliar zoom"
                onClick={() => engineRef.current?.zoomBy(1.22)}
              >
                <ZoomIn className="h-4 w-4" />
              </ToolbarButton>
            </div>
          )}
          {diagnostics && (
            <pre className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-border bg-black/80 p-3 text-[10px] text-emerald-300">
              {JSON.stringify(engineRef.current?.diagnostics() ?? {}, null, 2)}
            </pre>
          )}
        </section>

        {mobilePanelOpen && (
          <button
            type="button"
            className="tadeon-tabletop-panel-backdrop lg:hidden"
            onClick={() => setMobilePanelOpen(false)}
            aria-label="Fechar painel da Mesa"
          />
        )}

        <aside
          className={`${mobilePanelOpen ? "block" : "hidden"} tadeon-tabletop-panel max-h-[72svh] overflow-y-auto border-t border-border/70 p-4 lg:block lg:max-h-none lg:border-l lg:border-t-0`}
          data-collapsed={panelCollapsed ? "true" : "false"}
          aria-label="Painel de edição da Mesa Nexus"
        >
          <button
            type="button"
            className="tadeon-tabletop-panel__expand"
            onClick={() => setPanelCollapsed(false)}
            aria-label="Expandir painel contextual"
            title="Expandir painel"
          >
            <PanelRightOpen className="h-4 w-4" />
            <span>Editor</span>
          </button>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <div>
                <p className="tadeon-eyebrow">Painel contextual</p>
                <p className="font-cinzel text-base font-semibold">
                  {panelTab === "library"
                    ? "Montagem"
                    : panelTab === "space"
                      ? "Espaço"
                      : panelTab === "master"
                        ? "Bastidores"
                        : panelTab === "scene"
                          ? "Cena"
                          : "Inspetor"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="hidden lg:inline-flex"
              onClick={() => setPanelCollapsed(true)}
              aria-label="Recolher painel contextual"
              title="Recolher painel"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
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
          <div
            className="tadeon-tabletop-panel__tabs"
            role="tablist"
            aria-label="Áreas do editor"
          >
            {(
              [
                ["library", "Montagem"],
                ["space", `Espaço${visibilityDirty ? " · não salvo" : ""}`],
                [
                  "master",
                  `Mestre${masterEntities.length ? ` · ${masterEntities.length}` : ""}`,
                ],
                ["scene", "Cena"],
                [
                  "inspector",
                  `Inspetor${selected.length ? ` · ${selected.length}` : ""}`,
                ],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={panelTab === tab}
                className="tadeon-tabletop-panel__tab"
                onClick={() => setPanelTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>

          {panelTab === "library" && (
            <div className="tadeon-tabletop-panel__section" role="tabpanel">
              <p className="mt-1 text-[11px] text-muted-foreground">
                Arraste no computador ou toque para inserir no centro do mapa.
                Fichas já entram vinculadas ao personagem e ao jogador.
              </p>
              <div className="relative mt-3">
                <FileSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar na montagem"
                  value={paletteSearch}
                  onChange={(event) => setPaletteSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar asset, ficha ou página…"
                />
              </div>
              <div className="mt-3">
                <Label
                  htmlFor="asset-drop-type"
                  className="text-[10px] uppercase"
                >
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
                  onChange={(event) =>
                    updateBackgroundAsset(event.target.value)
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Sem mapa de fundo</option>
                  {paletteAssets
                    .filter((asset) => isTabletopBackgroundMime(asset.mimeType))
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.displayName}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Usa um asset privado autorizado para preencher a camada Mapa.
                </p>
                <label className="mt-2 flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/35 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10">
                  {assetUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Enviar imagem do ambiente
                  {assetUploading && assetUploadProgress > 0
                    ? ` · ${Math.round(assetUploadProgress)}%`
                    : ""}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    className="sr-only"
                    disabled={!editable || assetUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadTabletopImage(file, "background");
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="mt-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {paletteLoading && (
                  <div className="col-span-2 flex items-center justify-center py-5">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
                {!paletteLoading && visiblePaletteAssets.length === 0 && (
                  <p className="col-span-2 rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                    {paletteAssets.length === 0
                      ? "Nenhuma mídia visual pronta no Nexus Assets."
                      : "Nenhum asset corresponde à busca."}
                  </p>
                )}
                {visiblePaletteAssets.map((asset) => (
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
                        {
                          kind: "asset",
                          id: asset.id,
                          entityType: assetDropType,
                        },
                        asset.displayName,
                      )
                    }
                    className="tadeon-tabletop-asset overflow-hidden rounded-xl border border-border/60 bg-secondary/15 text-left disabled:opacity-50"
                  >
                    <div className="flex aspect-video items-center justify-center bg-black/30">
                      {asset.previewUrl &&
                      asset.mimeType.startsWith("video/") ? (
                        <video
                          src={asset.previewUrl}
                          className="h-full w-full object-cover"
                          muted
                          loop
                          autoPlay
                          playsInline
                          preload="metadata"
                          aria-label={`Prévia animada de ${asset.displayName}`}
                        />
                      ) : asset.previewUrl ? (
                        <img
                          src={asset.previewUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Film className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="block truncate px-2.5 py-2 text-[11px] font-medium">
                      {asset.displayName}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Fichas da campanha
                </p>
              </div>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                {visiblePaletteSheets.length === 0 && (
                  <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                    {linkTargets.sheets.length === 0
                      ? "Nenhuma ficha disponível nesta campanha."
                      : "Nenhuma ficha corresponde à busca."}
                  </p>
                )}
                {visiblePaletteSheets.map((sheet) => (
                  <button
                    key={sheet.id}
                    type="button"
                    draggable={editable}
                    disabled={!editable}
                    onClick={() =>
                      insertPaletteItem({ kind: "sheet", id: sheet.id })
                    }
                    onDragStart={(event) =>
                      beginPaletteDrag(
                        event,
                        { kind: "sheet", id: sheet.id },
                        sheet.name,
                      )
                    }
                    className="tadeon-tabletop-asset flex min-h-11 w-full items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-2.5 py-2 text-left disabled:opacity-50"
                  >
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {sheet.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-primary">
                      ficha
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
                {visiblePaletteKnowledge.length === 0 && (
                  <p className="rounded-md border border-dashed border-border/60 p-3 text-center text-[11px] text-muted-foreground">
                    {linkTargets.knowledge.length === 0
                      ? "Nenhuma Página do Nexus disponível."
                      : "Nenhuma Página corresponde à busca."}
                  </p>
                )}
                {visiblePaletteKnowledge.map((node) => (
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
                    className="tadeon-tabletop-asset flex min-h-11 w-full items-center gap-2 rounded-xl border border-border/50 bg-secondary/15 px-2.5 py-2 text-left disabled:opacity-50"
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
            </div>
          )}

          {panelTab === "space" && (
            <div className="tadeon-tabletop-panel__section" role="tabpanel">
              <div className="tadeon-tabletop-space-intro">
                <div>
                  <Axis3d className="h-5 w-5" />
                  <span>
                    <strong>Editor espacial</strong>
                    <small>paredes, aberturas, coberturas, luz e névoa</small>
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    projectionMode === "isometric" ? "default" : "outline"
                  }
                  onClick={() =>
                    setProjectionMode((mode) =>
                      mode === "plan" ? "isometric" : "plan",
                    )
                  }
                >
                  <Axis3d className="h-4 w-4" />
                  {projectionMode === "isometric" ? "3D ativo" : "Ver em 3D"}
                </Button>
              </div>
              <div className="mt-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="tadeon-eyebrow">Câmera espacial</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Rotação, angulação e altura preservam o centro e o encaixe
                      da grade.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={projectionMode !== "isometric"}
                    onClick={() =>
                      setViewOrientation(DEFAULT_TABLETOP_VIEW_ORIENTATION)
                    }
                  >
                    <Scan className="h-4 w-4" /> Reset
                  </Button>
                </div>
                <fieldset
                  disabled={projectionMode !== "isometric"}
                  className="mt-3 space-y-3 disabled:opacity-45"
                >
                  <label className="grid grid-cols-[1fr_auto] gap-x-2 text-[10px] uppercase text-muted-foreground">
                    <span>Rotação do mapa</span>
                    <output>{Math.round(viewOrientation.yaw)}°</output>
                    <input
                      className="col-span-2 mt-1 w-full accent-primary"
                      type="range"
                      min="0"
                      max="359"
                      step="1"
                      value={viewOrientation.yaw}
                      onChange={(event) =>
                        setViewOrientation((current) =>
                          normalizeTabletopViewOrientation({
                            ...current,
                            yaw: Number(event.target.value),
                          }),
                        )
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewOrientation((current) =>
                          normalizeTabletopViewOrientation({
                            ...current,
                            yaw: current.yaw - 45,
                          }),
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" /> −45°
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setViewOrientation((current) =>
                          normalizeTabletopViewOrientation({
                            ...current,
                            yaw: current.yaw + 45,
                          }),
                        )
                      }
                    >
                      <RotateCw className="h-4 w-4" /> +45°
                    </Button>
                  </div>
                  <label className="grid grid-cols-[1fr_auto] gap-x-2 text-[10px] uppercase text-muted-foreground">
                    <span>Inclinação</span>
                    <output>{Math.round(viewOrientation.tilt * 100)}%</output>
                    <input
                      className="col-span-2 mt-1 w-full accent-primary"
                      type="range"
                      min="18"
                      max="90"
                      step="1"
                      value={Math.round(viewOrientation.tilt * 100)}
                      onChange={(event) =>
                        setViewOrientation((current) =>
                          normalizeTabletopViewOrientation({
                            ...current,
                            tilt: Number(event.target.value) / 100,
                          }),
                        )
                      }
                    />
                  </label>
                  <label className="grid grid-cols-[1fr_auto] gap-x-2 text-[10px] uppercase text-muted-foreground">
                    <span>Escala de altura</span>
                    <output>
                      {viewOrientation.elevationScale.toFixed(2)}×
                    </output>
                    <input
                      className="col-span-2 mt-1 w-full accent-primary"
                      type="range"
                      min="25"
                      max="250"
                      step="5"
                      value={Math.round(viewOrientation.elevationScale * 100)}
                      onChange={(event) =>
                        setViewOrientation((current) =>
                          normalizeTabletopViewOrientation({
                            ...current,
                            elevationScale: Number(event.target.value) / 100,
                          }),
                        )
                      }
                    />
                  </label>
                </fieldset>
              </div>
              <div className="mt-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="tadeon-eyebrow">Andares e elevação</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      A grade, a oclusão, as luzes e as entidades seguem o andar
                      ativo.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!editable}
                    onClick={createLevel}
                  >
                    <Plus className="h-4 w-4" />
                    Andar
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <Label
                      htmlFor="tabletop-active-level"
                      className="text-[10px] uppercase"
                    >
                      Andar ativo
                    </Label>
                    <select
                      id="tabletop-active-level"
                      value={activeLevel?.id ?? ""}
                      onChange={(event) =>
                        setActiveLevelId(event.target.value || null)
                      }
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {(snapshot.scene.levels ?? []).map((level) => (
                        <option
                          key={level.id}
                          value={level.id}
                          disabled={!level.visible}
                        >
                          {level.name} · {level.baseElevation}
                        </option>
                      ))}
                    </select>
                  </div>
                  {activeLevel && (
                    <>
                      <div>
                        <Label
                          htmlFor="tabletop-level-name"
                          className="text-[10px] uppercase"
                        >
                          Nome do andar
                        </Label>
                        <Input
                          id="tabletop-level-name"
                          disabled={!editable}
                          value={activeLevel.name}
                          maxLength={120}
                          onChange={(event) =>
                            updateActiveLevel({ name: event.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label
                            htmlFor="tabletop-level-base"
                            className="text-[10px] uppercase"
                          >
                            Base
                          </Label>
                          <Input
                            id="tabletop-level-base"
                            type="number"
                            disabled={!editable}
                            value={activeLevel.baseElevation}
                            onChange={(event) =>
                              updateActiveLevel({
                                baseElevation: Number(event.target.value) || 0,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="tabletop-level-height"
                            className="text-[10px] uppercase"
                          >
                            Pé-direito
                          </Label>
                          <Input
                            id="tabletop-level-height"
                            type="number"
                            min={8}
                            disabled={!editable}
                            value={activeLevel.height}
                            onChange={(event) =>
                              updateActiveLevel({
                                height: Math.max(
                                  8,
                                  Number(event.target.value) || 8,
                                ),
                              })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <TabletopVisibilityPanel
                enabled={lightingEnabled}
                editable={editable && visibilityAvailable}
                sceneId={persistedScene?.id ?? null}
                sceneWidth={snapshot.scene.width}
                sceneHeight={snapshot.scene.height}
                levels={snapshot.scene.levels ?? []}
                activeLevelId={activeLevel?.id ?? null}
                state={visibility}
                dirty={visibilityDirty}
                selectedStructureId={selectedStructureId}
                selectedLightId={selectedLightId}
                onSelectStructure={(id) =>
                  engineRef.current?.setSelectedStructure(id)
                }
                onSelectLight={(id) => engineRef.current?.setSelectedLight(id)}
                onPreview={previewVisibility}
                onSaved={installVisibility}
              />
            </div>
          )}

          {panelTab === "master" && (
            <div className="tadeon-tabletop-panel__section" role="tabpanel">
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="tadeon-eyebrow">Bastidores do mestre</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Segredos, notas e peças da camada Mestre ficam fora da
                      projeção dos jogadores, mas continuam acessíveis durante
                      a direção.
                    </p>
                  </div>
                </div>
                {masterLayer && selected.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    disabled={!editable || masterLayer.locked}
                    onClick={() =>
                      engineRef.current?.moveSelectedToLayer(masterLayer.id)
                    }
                  >
                    <EyeOff className="h-4 w-4" />
                    Levar seleção aos bastidores
                  </Button>
                )}
              </div>
              <div className="relative mt-3">
                <FileSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar nos bastidores"
                  value={masterSearch}
                  onChange={(event) => setMasterSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar segredo, nota ou token…"
                />
              </div>
              <div className="mt-3 space-y-2">
                {masterEntities.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                    Nenhum item oculto corresponde à busca.
                  </div>
                )}
                {masterEntities.map((entity) => {
                  const level = snapshot.scene.levels?.find(
                    (item) => item.id === entity.levelId,
                  );
                  const inMasterLayer = entity.layerId === masterLayer?.id;
                  const fallbackLayer = snapshot.scene.layers.find(
                    (layer) =>
                      layer.layerType ===
                      (["token", "character", "npc", "creature"].includes(
                        entity.type,
                      )
                        ? "tokens"
                        : "objects"),
                  );
                  return (
                    <article
                      key={entity.id}
                      className="rounded-xl border border-border/60 bg-secondary/15 p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/25">
                          {entity.assetUrl ? (
                            <img
                              src={entity.assetUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <EyeOff className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-xs">
                            {entity.label}
                          </strong>
                          <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                            {level?.name ?? "Andar base"} · {entity.type}
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1 text-[9px]">
                            {entity.hidden && (
                              <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive">
                                oculto
                              </span>
                            )}
                            {inMasterLayer && (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                                mestre
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            engineRef.current?.selectEntityById(entity.id);
                            engineRef.current?.focusSelection();
                            setPanelTab("inspector");
                          }}
                        >
                          Localizar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!editable || entity.locked}
                          onClick={() => {
                            engineRef.current?.selectEntityById(entity.id);
                            engineRef.current?.updateSelected(
                              { hidden: !entity.hidden },
                              entity.hidden
                                ? "Revelar entidade"
                                : "Ocultar entidade",
                            );
                            setPanelTab("master");
                          }}
                        >
                          {entity.hidden ? "Revelar" : "Ocultar"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            !editable ||
                            entity.locked ||
                            (inMasterLayer
                              ? !fallbackLayer || fallbackLayer.locked
                              : !masterLayer || masterLayer.locked)
                          }
                          onClick={() => {
                            const target = inMasterLayer
                              ? fallbackLayer
                              : masterLayer;
                            if (!target) return;
                            engineRef.current?.selectEntityById(entity.id);
                            engineRef.current?.moveSelectedToLayer(target.id);
                            setPanelTab("master");
                          }}
                        >
                          {inMasterLayer ? "À cena" : "Mestre"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {panelTab === "scene" && (
            <div className="tadeon-tabletop-panel__section" role="tabpanel">
              <div className="mt-6 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-primary" />
                <p className="tadeon-eyebrow">Camadas</p>
              </div>
              <div className="mt-3 space-y-1">
                {snapshot.scene.layers.map((layer) => (
                  <div
                    key={layer.id}
                    className="flex min-h-12 items-center gap-2 rounded-xl border border-border/50 bg-secondary/15 px-2.5 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {layer.name}
                    </span>
                    <button
                      type="button"
                      className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary disabled:opacity-40"
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
                      className="grid h-10 w-10 place-items-center rounded-lg hover:bg-secondary disabled:opacity-40"
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
                  onClick={() => setSnapshotDialogOpen(true)}
                >
                  <Camera className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Restaurar snapshot"
                  disabled={!editable || !snapshotId || saving || dirty}
                  onClick={() => setRestoreDialogOpen(true)}
                >
                  <History className="h-4 w-4" />
                </ToolbarButton>
              </div>
            </div>
          )}

          {panelTab === "inspector" && (
            <div className="tadeon-tabletop-panel__section" role="tabpanel">
              <p className="tadeon-eyebrow">Inspetor de entidades</p>
              {!primary ? (
                <div className="tadeon-tabletop-inspector-card mt-4 text-center text-sm text-muted-foreground">
                  <MousePointer2 className="mx-auto h-6 w-6 text-primary/70" />
                  <p className="mt-3 font-medium text-foreground">
                    Nada selecionado
                  </p>
                  <p className="mt-1">
                    Toque numa entidade ou use Shift para selecionar um
                    conjunto.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full gap-2"
                    disabled={!editable || snapshot.scene.entities.length === 0}
                    onClick={() => engineRef.current?.selectAll()}
                  >
                    <MousePointer2 className="h-4 w-4" />
                    Selecionar tudo
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="tadeon-tabletop-inspector-card">
                    <p className="font-cinzel text-lg font-semibold">
                      {primary.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selected.length} selecionada
                      {selected.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="tadeon-tabletop-inspector-card space-y-3">
                    <p className="tadeon-eyebrow">Organização</p>
                    <div>
                      <Label
                        htmlFor="entity-layer"
                        className="text-[10px] uppercase"
                      >
                        Camada
                      </Label>
                      <select
                        id="entity-layer"
                        value={primary.layerId}
                        disabled={!editable}
                        onChange={(event) =>
                          engineRef.current?.moveSelectedToLayer(
                            event.target.value,
                          )
                        }
                        className="h-11 w-full rounded-[0.7rem] border border-input bg-background/55 px-3 text-sm"
                      >
                        {snapshot.scene.layers.map((layer) => (
                          <option
                            key={layer.id}
                            value={layer.id}
                            disabled={
                              layer.locked ||
                              !layer.visible ||
                              layer.layerType === "map"
                            }
                          >
                            {layer.name}
                            {layer.locked
                              ? " · bloqueada"
                              : !layer.visible
                                ? " · oculta"
                                : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ["back", "Enviar ao fundo"],
                          ["front", "Trazer à frente"],
                        ] as Array<[TabletopStackEdge, string]>
                      ).map(([edge, label]) => (
                        <Button
                          key={edge}
                          size="sm"
                          variant="outline"
                          disabled={!editable}
                          onClick={() =>
                            engineRef.current?.moveSelectedToEdge(edge)
                          }
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    {selected.length > 1 && (
                      <div>
                        <Label className="text-[10px] uppercase">
                          Alinhar seleção
                        </Label>
                        <div className="mt-1 grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ["left", "Esq."],
                              ["center-x", "Centro H"],
                              ["right", "Dir."],
                              ["top", "Topo"],
                              ["center-y", "Centro V"],
                              ["bottom", "Base"],
                            ] as Array<[TabletopAlignment, string]>
                          ).map(([alignment, label]) => (
                            <Button
                              key={alignment}
                              size="sm"
                              variant="outline"
                              className="px-2"
                              disabled={!editable}
                              onClick={() =>
                                engineRef.current?.alignSelected(alignment)
                              }
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.length > 2 && (
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            ["horizontal", "Distribuir H"],
                            ["vertical", "Distribuir V"],
                          ] as Array<[TabletopDistribution, string]>
                        ).map(([axis, label]) => (
                          <Button
                            key={axis}
                            size="sm"
                            variant="outline"
                            disabled={!editable}
                            onClick={() =>
                              engineRef.current?.distributeSelected(axis)
                            }
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="tadeon-tabletop-inspector-card space-y-3">
                    <p className="tadeon-eyebrow">Identidade e vínculos</p>
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
                        htmlFor="entity-level"
                        className="text-[10px] uppercase"
                      >
                        Andar
                      </Label>
                      <select
                        id="entity-level"
                        value={primary.levelId ?? activeLevel?.id ?? ""}
                        disabled={!editable}
                        onChange={(event) =>
                          engineRef.current?.updateSelected(
                            {
                              levelId: event.target.value || null,
                              elevation: 0,
                            },
                            "Mover entidade e encaixar no piso do andar",
                          )
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {(snapshot.scene.levels ?? []).map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name} · base {level.baseElevation}
                          </option>
                        ))}
                      </select>
                    </div>
                    {primary.assetUrl ? (
                      <div>
                        <Label
                          htmlFor="entity-render-mode"
                          className="text-[10px] uppercase"
                        >
                          Imagem no 3D
                        </Label>
                        <select
                          id="entity-render-mode"
                          value={
                            primaryProperties.render_mode === "flat"
                              ? "flat"
                              : "billboard"
                          }
                          disabled={!editable}
                          onChange={(event) =>
                            updateProperties({
                              render_mode: event.target.value,
                            })
                          }
                          className="h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="billboard">
                            Vertical · sempre legível
                          </option>
                          <option value="flat">Plano · acompanha o chão</option>
                        </select>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Tokens e objetos usam o modo vertical por padrão;
                          pisos, tiles e mapas permanecem planos.
                        </p>
                      </div>
                    ) : null}
                    {primaryAnimated && (
                      <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/15 p-2.5">
                        <div className="flex items-center gap-2">
                          <Film className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Movimento
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-background/60 px-2 text-[11px]">
                            Pausado
                            <Switch
                              checked={
                                primaryProperties.playback_paused === true
                              }
                              disabled={!editable}
                              onCheckedChange={(playback_paused) =>
                                updateProperties({ playback_paused })
                              }
                            />
                          </label>
                          <label className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-background/60 px-2 text-[11px]">
                            Repetir
                            <Switch
                              checked={
                                primaryProperties.playback_loop !== false
                              }
                              disabled={!editable}
                              onCheckedChange={(playback_loop) =>
                                updateProperties({ playback_loop })
                              }
                            />
                          </label>
                        </div>
                        <label className="block text-[10px] text-muted-foreground">
                          Velocidade
                          <select
                            value={String(
                              primaryProperties.playback_speed ?? 1,
                            )}
                            disabled={!editable}
                            onChange={(event) =>
                              updateProperties({
                                playback_speed: Number(event.target.value),
                              })
                            }
                            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                          >
                            <option value="0.5">0,5×</option>
                            <option value="0.75">0,75×</option>
                            <option value="1">1×</option>
                            <option value="1.5">1,5×</option>
                            <option value="2">2×</option>
                          </select>
                        </label>
                        {primaryMediaKind === "video" && (
                          <label className="flex min-h-10 items-center justify-between gap-2 rounded-md bg-background/60 px-2 text-[11px]">
                            Sem som
                            <Switch
                              checked={
                                primaryProperties.playback_muted !== false
                              }
                              disabled={!editable}
                              onCheckedChange={(playback_muted) =>
                                updateProperties({ playback_muted })
                              }
                            />
                          </label>
                        )}
                      </div>
                    )}
                    <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-primary/35 bg-primary/5 px-3 text-xs font-medium text-primary hover:bg-primary/10">
                      {assetUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      {primary.assetId
                        ? "Substituir mídia"
                        : "Adicionar imagem ou animação"}
                      {assetUploading && assetUploadProgress > 0
                        ? ` · ${Math.round(assetUploadProgress)}%`
                        : ""}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/webm,video/mp4"
                        className="sr-only"
                        disabled={!editable || assetUploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadTabletopImage(file, "entity");
                          event.target.value = "";
                        }}
                      />
                    </label>
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
                            {
                              linkedKnowledgeNodeId: event.target.value || null,
                            },
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
                              bar_max: Math.max(
                                0,
                                Number(event.target.value) || 0,
                              ),
                            })
                          }
                        />
                      </div>
                      <p className="col-span-2 -mt-2 text-[10px] text-muted-foreground">
                        Deixe a máxima em 0 para ocultar a barra. É apenas
                        visual.
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
                      <Textarea
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
                        className="min-h-24 resize-y"
                      />
                    </div>
                  </div>
                  <div className="tadeon-tabletop-inspector-card grid grid-cols-2 gap-3">
                    <p className="tadeon-eyebrow col-span-2">
                      Transformação precisa
                    </p>
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
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={
                      !editable ||
                      selected.every((entity) => entity.rotation === 0)
                    }
                    onClick={() => engineRef.current?.resetSelectedTransform()}
                  >
                    <RotateCw className="h-4 w-4" />
                    Zerar rotação
                  </Button>
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
                      Ctrl/Cmd+A · C · V · D · Z · Del · setas
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <Dialog open={sceneDialogOpen} onOpenChange={setSceneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel">Criar nova cena</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createScene();
            }}
          >
            <div>
              <Label htmlFor="new-scene-name">Nome da cena</Label>
              <Input
                id="new-scene-name"
                value={sceneName}
                onChange={(event) => setSceneName(event.target.value)}
                maxLength={160}
                autoFocus
                placeholder="Ex.: Salão das Vozes"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                A cena nasce como rascunho com as camadas Mapa, Objetos, Tokens,
                Desenhos e Mestre.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSceneDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!campaignId || saving || !sceneName.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar cena
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cinzel">
              Criar marco da cena
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void createSnapshot();
            }}
          >
            <div>
              <Label htmlFor="new-snapshot-name">Nome do snapshot</Label>
              <Input
                id="new-snapshot-name"
                value={snapshotName}
                onChange={(event) => setSnapshotName(event.target.value)}
                maxLength={160}
                autoFocus
                placeholder="Ex.: Antes do confronto"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Se houver alterações locais, a cena será salva antes de
                registrar este ponto.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSnapshotDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!editable || saving || !snapshotName.trim()}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar snapshot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Arquivar “{persistedScene?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A cena ficará disponível para consulta, mas não poderá ser
              editada. Você poderá duplicá-la depois para continuar a montagem
              em um novo rascunho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void archiveScene()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Arquivar cena
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar este marco da cena?</AlertDialogTitle>
            <AlertDialogDescription>
              A montagem atual será substituída pela versão escolhida. Antes
              disso, a Mesa criará automaticamente um ponto de recuperação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter montagem atual</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !snapshotId}
              onClick={() => void restoreSnapshot()}
            >
              Restaurar snapshot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingNavigation)}
        onOpenChange={(open) => {
          if (!open) setPendingNavigation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações locais?</AlertDialogTitle>
            <AlertDialogDescription>
              Há mudanças ainda não salvas nesta cena. Ao continuar para outra
              {pendingNavigation?.kind === "campaign" ? " campanha" : " cena"},
              essa montagem local será perdida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingNavigation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar e continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TabletopHandoutViewer
        handout={selectedHandout}
        open={selectedHandout !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHandout(null);
        }}
      />

      <TabletopEntityDossier
        entity={dossierEntity}
        sheetSummary={dossierSheetSummary}
        handout={dossierHandout}
        loading={dossierLoading}
        open={dossierEntity !== null}
        onOpenChange={(open) => {
          if (!open) {
            dossierRequestRef.current += 1;
            setDossierEntityId(null);
            setDossierSheetSummary(null);
            setDossierHandout(null);
            setDossierLoading(false);
          }
        }}
        onOpenHandout={(handout) => {
          dossierRequestRef.current += 1;
          setDossierEntityId(null);
          setDossierHandout(null);
          setDossierLoading(false);
          setSelectedHandout(handout);
        }}
      />

      {contextMenu && editable && (
        <div
          role="menu"
          className="fixed z-50 max-h-[calc(100dvh-1rem)] w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.lightId && selectedLight && (
            <div className="space-y-2 border-b border-border/60 p-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <strong className="min-w-0 flex-1 text-xs">Fonte de luz</strong>
                <input
                  type="color"
                  value={selectedLight.color}
                  aria-label="Cor da luz selecionada"
                  onChange={(event) =>
                    previewVisibility({
                      ...visibilityRef.current,
                      lights: visibilityRef.current.lights.map((light) =>
                        light.id === selectedLight.id
                          ? { ...light, color: event.target.value }
                          : light,
                      ),
                    })
                  }
                />
              </div>
              <label className="block text-[10px] text-muted-foreground">
                <span className="flex justify-between gap-2">
                  Intensidade
                  <output>{Math.round(selectedLight.intensity * 100)}%</output>
                </span>
                <input
                  className="w-full"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(selectedLight.intensity * 100)}
                  onChange={(event) =>
                    previewVisibility({
                      ...visibilityRef.current,
                      lights: visibilityRef.current.lights.map((light) =>
                        light.id === selectedLight.id
                          ? {
                              ...light,
                              intensity: Number(event.target.value) / 100,
                            }
                          : light,
                      ),
                    })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  className="min-h-10 rounded bg-secondary/50 px-2 text-left text-[11px] hover:bg-secondary"
                  onClick={() =>
                    previewVisibility({
                      ...visibilityRef.current,
                      lights: visibilityRef.current.lights.map((light) =>
                        light.id === selectedLight.id
                          ? { ...light, enabled: !light.enabled }
                          : light,
                      ),
                    })
                  }
                >
                  {selectedLight.enabled ? "Apagar" : "Acender"}
                </button>
                <button
                  type="button"
                  className="min-h-10 rounded bg-secondary/50 px-2 text-left text-[11px] hover:bg-secondary"
                  onClick={() =>
                    previewVisibility({
                      ...visibilityRef.current,
                      lights: visibilityRef.current.lights.map((light) =>
                        light.id === selectedLight.id
                          ? { ...light, castsShadows: !light.castsShadows }
                          : light,
                      ),
                    })
                  }
                >
                  {selectedLight.castsShadows ? "Sem sombras" : "Com sombras"}
                </button>
              </div>
            </div>
          )}
          {contextMenu.entityId && (
            <button
              type="button"
              className="min-h-11 w-full rounded px-3 py-2 text-left text-sm font-medium text-primary hover:bg-secondary"
              onClick={() => {
                const entity = snapshot.scene.entities.find(
                  (item) => item.id === contextMenu.entityId,
                );
                if (entity) openEntityDossier(entity);
                closeContext();
              }}
            >
              Abrir cartão / arquivo
            </button>
          )}
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
          {!contextMenu.lightId && (
            <>
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
                  const hidden = selected.some((entity) => !entity.hidden);
                  engineRef.current?.updateSelected(
                    { hidden },
                    hidden ? "Ocultar seleção" : "Revelar seleção",
                  );
                  closeContext();
                }}
              >
                {selected.some((entity) => !entity.hidden)
                  ? "Ocultar dos jogadores"
                  : "Revelar aos jogadores"}
              </button>
              {masterLayer && (
                <button
                  type="button"
                  className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    engineRef.current?.moveSelectedToLayer(masterLayer.id);
                    setPanelTab("master");
                    closeContext();
                  }}
                >
                  Levar aos bastidores do mestre
                </button>
              )}
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
                className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  engineRef.current?.moveSelectedToEdge("front");
                  closeContext();
                }}
              >
                Trazer à frente
              </button>
              <button
                type="button"
                className="min-h-11 w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  engineRef.current?.moveSelectedToEdge("back");
                  closeContext();
                }}
              >
                Enviar ao fundo
              </button>
            </>
          )}
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

function CanvasToolButton({
  label,
  active,
  disabled,
  children,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="icon"
      className="h-10 w-10 sm:h-9 sm:w-9"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tadeon-tabletop-toolbar__group">
      <span className="tadeon-tabletop-toolbar__label">{label}</span>
      {children}
    </div>
  );
}
