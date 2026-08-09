import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  BookMarked,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  FilePlus2,
  GitBranch,
  Hash,
  History,
  ImagePlus,
  Link2,
  ListTree,
  Loader2,
  Maximize2,
  PanelRight,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Star,
  Tag,
  TextQuote,
  Unlink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AssetPickerDialog } from "@/components/assets/asset-picker-dialog";
import { KnowledgeGraph } from "@/components/knowledge/knowledge-graph";
import { KnowledgeLibrary } from "@/components/knowledge/knowledge-library";
import { KnowledgePortabilityDialog } from "@/components/knowledge/knowledge-portability-dialog";
import {
  SafeMarkdown,
  type KnowledgeLinkPreview,
} from "@/components/knowledge/safe-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  KNOWLEDGE_NODE_STATUSES,
  KNOWLEDGE_NODE_TYPES,
  KNOWLEDGE_RELATION_DIRECTIONS,
  KNOWLEDGE_VISIBILITIES,
  RELATION_TYPES,
  type KnowledgeNodeStatus,
  type KnowledgeNodeType,
  type KnowledgeRelationDirection,
  type KnowledgeVisibility,
  type RelationType,
} from "@/lib/nexus-contracts";
import {
  KnowledgeServiceError,
  type KnowledgeErrorCode,
} from "@/lib/knowledge/knowledge-errors";
import {
  knowledgeService,
  type KnowledgeAssetLink,
  type KnowledgeBacklink,
  type KnowledgeBrokenLink,
  type KnowledgeEdge,
  type KnowledgeNode,
  type KnowledgeSearchOrder,
  type KnowledgeVersion,
} from "@/lib/knowledge/knowledge-service";

interface WorkspaceOption {
  id: string;
  name: string;
}

interface CampaignOption {
  id: string;
  workspace_id: string;
  name: string;
}

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
type RightPanel = "properties" | "relations" | "history" | "assets";

const TYPE_LABELS: Record<KnowledgeNodeType, string> = {
  rule: "Regra",
  concept: "Conceito",
  character: "Personagem",
  npc: "NPC",
  creature: "Criatura",
  organization: "Organização",
  religion: "Religião",
  culture: "Cultura",
  people: "Povo",
  language: "Idioma",
  kingdom: "Reino",
  region: "Região",
  city: "Cidade",
  location: "Local",
  river: "Rio",
  sea: "Mar",
  terrain: "Relevo",
  tectonic_plate: "Placa tectônica",
  historical_event: "Evento histórico",
  plot: "Trama",
  clue: "Pista",
  session: "Sessão",
  fragment: "Fragmento",
  transcendental_ability: "Habilidade transcendental",
  weapon: "Arma",
  object: "Objeto",
  document: "Documento",
  map: "Mapa",
  campaign: "Campanha",
  free_note: "Nota livre",
};

const STATUS_LABELS: Record<KnowledgeNodeStatus, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  canonical: "Canônico",
  deprecated: "Depreciado",
  archived: "Arquivado",
};

const VISIBILITY_LABELS: Record<KnowledgeVisibility, string> = {
  author: "Apenas autor",
  masters: "Apenas mestres",
  campaign: "Campanha",
  users: "Usuários específicos",
  workspace: "Workspace",
  internal_public: "Público interno",
};

const RELATION_LABELS: Record<RelationType, string> = {
  related_to: "Relacionado a",
  part_of: "Parte de",
  contains: "Contém",
  located_in: "Localizado em",
  member_of: "Membro de",
  owns: "Possui",
  created_by: "Criado por",
  allied_with: "Aliado a",
  opposes: "Oposto a",
  parent_of: "Ascendente de",
  child_of: "Descendente de",
  precedes: "Precede",
  follows: "Segue",
  reveals: "Revela",
  mentions: "Menciona",
  custom: "Relação personalizada",
};

const RELATION_DIRECTION_LABELS: Record<KnowledgeRelationDirection, string> = {
  directed: "Direcionada",
  bidirectional: "Bidirecional",
};

const DEFAULT_INVERSE_RELATION: Record<RelationType, RelationType> = {
  related_to: "related_to",
  part_of: "contains",
  contains: "part_of",
  located_in: "contains",
  member_of: "contains",
  owns: "related_to",
  created_by: "related_to",
  allied_with: "allied_with",
  opposes: "opposes",
  parent_of: "child_of",
  child_of: "parent_of",
  precedes: "follows",
  follows: "precedes",
  reveals: "related_to",
  mentions: "related_to",
  custom: "custom",
};

function errorMessage(error: unknown) {
  return error instanceof KnowledgeServiceError
    ? error.userMessage
    : "Não foi possível concluir a operação em O Nexus.";
}

function parseRelationProperties(value: string): Json {
  const parsed: unknown = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("RELATION_PROPERTIES_NOT_OBJECT");
  }
  return parsed as Json;
}

function draftKey(nodeId: string) {
  return `tadeon.nexus.draft.${nodeId}`;
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function formatTime(value: Date | null) {
  return value
    ? value.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

function renderSearchSnippet(value: string) {
  let highlighted = false;
  return value.split(/([⟦⟧])/).map((part, index) => {
    if (part === "⟦") {
      highlighted = true;
      return null;
    }
    if (part === "⟧") {
      highlighted = false;
      return null;
    }
    if (!part) return null;
    return highlighted ? (
      <mark
        key={`search-highlight-${index}`}
        className="rounded bg-primary/20 px-0.5 text-foreground"
      >
        {part}
      </mark>
    ) : (
      part
    );
  });
}

function insertAroundSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after = before,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);
  const next =
    textarea.value.slice(0, start) +
    before +
    selected +
    after +
    textarea.value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor };
}

export function NexusWorkspace({
  assetsEnabled,
  graphEnabled,
  initialNodeId,
}: {
  assetsEnabled: boolean;
  graphEnabled: boolean;
  initialNodeId?: string;
}) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const initialNodeOpenedRef = useRef<string | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [campaignId, setCampaignId] = useState<string>("workspace");
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [recent, setRecent] = useState<KnowledgeNode[]>([]);
  const [favorites, setFavorites] = useState<KnowledgeNode[]>([]);
  const [openNodes, setOpenNodes] = useState<KnowledgeNode[]>([]);
  const [selected, setSelected] = useState<KnowledgeNode | null>(null);
  const [aliases, setAliases] = useState<Array<Record<string, unknown>>>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [backlinks, setBacklinks] = useState<KnowledgeBacklink[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<KnowledgeBrokenLink[]>([]);
  const [versions, setVersions] = useState<KnowledgeVersion[]>([]);
  const [assetLinks, setAssetLinks] = useState<KnowledgeAssetLink[]>([]);
  const [previews, setPreviews] = useState<
    Record<string, KnowledgeLinkPreview | null>
  >({});
  const [loading, setLoading] = useState(true);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchPage, setSearchPage] = useState(0);
  const [searchCount, setSearchCount] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchSnippets, setSearchSnippets] = useState<Record<string, string>>(
    {},
  );
  const [typeFilter, setTypeFilter] = useState<KnowledgeNodeType | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<KnowledgeNodeStatus | "all">(
    "all",
  );
  const [visibilityFilter, setVisibilityFilter] = useState<
    KnowledgeVisibility | "all"
  >("all");
  const [searchRelationFilter, setSearchRelationFilter] = useState<
    RelationType | "all"
  >("all");
  const [searchOrder, setSearchOrder] =
    useState<KnowledgeSearchOrder>("relevance");
  const [onlyCanonical, setOnlyCanonical] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("properties");
  const [rightOpen, setRightOpen] = useState(true);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createType, setCreateType] = useState<KnowledgeNodeType>("free_note");
  const [createVisibility, setCreateVisibility] =
    useState<KnowledgeVisibility>("author");
  const [creating, setCreating] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [portabilityOpen, setPortabilityOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [aliasValue, setAliasValue] = useState("");
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);
  const [relationEditing, setRelationEditing] = useState<KnowledgeEdge | null>(
    null,
  );
  const [relationTargetId, setRelationTargetId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("related_to");
  const [relationLabel, setRelationLabel] = useState("");
  const [relationDirection, setRelationDirection] =
    useState<KnowledgeRelationDirection>("directed");
  const [relationVisibility, setRelationVisibility] =
    useState<KnowledgeVisibility>("workspace");
  const [relationPropertiesText, setRelationPropertiesText] = useState("{}");
  const [relationInverseEnabled, setRelationInverseEnabled] = useState(false);
  const [relationInverseType, setRelationInverseType] =
    useState<RelationType>("related_to");
  const [relationInverseLabel, setRelationInverseLabel] = useState("");
  const [relationFilterType, setRelationFilterType] = useState<
    RelationType | "all"
  >("all");
  const [relationFilterDirection, setRelationFilterDirection] = useState<
    KnowledgeRelationDirection | "all"
  >("all");
  const [relationFilterVisibility, setRelationFilterVisibility] = useState<
    KnowledgeVisibility | "all"
  >("all");
  const [relationSaving, setRelationSaving] = useState(false);

  const campaignScope = campaignId === "workspace" ? null : campaignId || null;
  const currentCampaign = campaigns.find(
    (campaign) => campaign.id === campaignScope,
  );

  const loadScopes = useCallback(async () => {
    setLoading(true);
    const [workspaceResult, campaignResult] = await Promise.all([
      supabase.from("workspaces").select("id,name").order("name"),
      supabase
        .from("campaigns")
        .select("id,workspace_id,name")
        .eq("status", "active")
        .order("name"),
    ]);
    if (workspaceResult.error || campaignResult.error) {
      toast.error("Não foi possível carregar os espaços de O Nexus.");
      setLoading(false);
      return;
    }
    const nextWorkspaces = (workspaceResult.data ?? []) as WorkspaceOption[];
    const nextCampaigns = (campaignResult.data ?? []) as CampaignOption[];
    setWorkspaces(nextWorkspaces);
    setCampaigns(nextCampaigns);
    setWorkspaceId((current) =>
      nextWorkspaces.some((workspace) => workspace.id === current)
        ? current
        : (nextCampaigns[0]?.workspace_id ?? nextWorkspaces[0]?.id ?? ""),
    );
    setCampaignId((current) =>
      current !== "workspace" &&
      !nextCampaigns.some((campaign) => campaign.id === current)
        ? (nextCampaigns[0]?.id ?? "workspace")
        : current,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setSearchPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadNodes = useCallback(async () => {
    if (!workspaceId) return;
    setNodeLoading(true);
    try {
      const [result, nextRecent, nextFavorites] = await Promise.all([
        knowledgeService.search({
          workspaceId,
          query: debouncedSearch,
          campaignId: campaignScope,
          includeWorkspace: true,
          nodeTypes: typeFilter === "all" ? undefined : [typeFilter],
          statuses: statusFilter === "all" ? undefined : [statusFilter],
          visibilities:
            visibilityFilter === "all" ? undefined : [visibilityFilter],
          relationTypes:
            searchRelationFilter === "all" ? undefined : [searchRelationFilter],
          onlyCanonical,
          order: searchOrder,
          page: searchPage,
          pageSize: 30,
        }),
        knowledgeService.listRecentNodes(40),
        knowledgeService.listFavoriteNodes(40),
      ]);
      setNodes(result.hits.map((hit) => hit.node));
      setSearchCount(result.count);
      setSearchHasMore(result.hasMore);
      setSearchSnippets(
        Object.fromEntries(
          result.hits.map((hit) => [hit.node.id, hit.snippet]),
        ),
      );
      const belongsToScope = (node: KnowledgeNode) =>
        node.workspace_id === workspaceId &&
        (campaignScope
          ? node.campaign_id === campaignScope || node.campaign_id === null
          : node.campaign_id === null);
      setRecent(nextRecent.filter(belongsToScope).slice(0, 12));
      setFavorites(nextFavorites.filter(belongsToScope).slice(0, 12));
    } catch (error) {
      toast.error(errorMessage(error));
      setNodes([]);
      setSearchCount(0);
      setSearchHasMore(false);
      setSearchSnippets({});
    } finally {
      setNodeLoading(false);
    }
  }, [
    campaignScope,
    debouncedSearch,
    onlyCanonical,
    searchOrder,
    searchPage,
    searchRelationFilter,
    statusFilter,
    typeFilter,
    visibilityFilter,
    workspaceId,
  ]);

  useEffect(() => {
    void loadScopes();
  }, [loadScopes]);

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    setSelected(null);
    setOpenNodes([]);
    setAliases([]);
    setEdges([]);
    setBacklinks([]);
    setBrokenLinks([]);
    setVersions([]);
    setAssetLinks([]);
    setPreviews({});
  }, [campaignId, workspaceId]);

  useEffect(() => {
    if (
      campaignScope &&
      currentCampaign &&
      currentCampaign.workspace_id !== workspaceId
    ) {
      setWorkspaceId(currentCampaign.workspace_id);
    }
  }, [campaignScope, currentCampaign, workspaceId]);

  const refreshNodeDetails = useCallback(async (node: KnowledgeNode) => {
    const [
      nextAliases,
      nextEdges,
      nextBacklinks,
      nextBrokenLinks,
      nextVersions,
      nextAssets,
      resolved,
    ] = await Promise.all([
      knowledgeService.listAliases(node.id),
      knowledgeService.listEdges(node.id),
      knowledgeService.listBacklinks(node.id),
      knowledgeService.listBrokenLinks(node.id),
      knowledgeService.listVersions(node.id, 40),
      knowledgeService.listNodeAssets(node.id),
      knowledgeService.resolveWikilinks(node),
    ]);
    setAliases(nextAliases as Array<Record<string, unknown>>);
    setEdges(nextEdges);
    setBacklinks(nextBacklinks);
    setBrokenLinks(nextBrokenLinks);
    setVersions(nextVersions);
    setAssetLinks(nextAssets);
    const nextPreviews: Record<string, KnowledgeLinkPreview | null> = {};
    for (const entry of resolved) {
      const previewKey = `${entry.reference.normalizedTarget}#${entry.reference.normalizedSection ?? ""}`;
      nextPreviews[previewKey] =
        entry.node && !entry.broken
          ? {
              id: entry.node.id,
              title: entry.node.title,
              summary: entry.node.summary,
              nodeType: TYPE_LABELS[entry.node.node_type],
            }
          : null;
    }
    setPreviews(nextPreviews);
  }, []);

  const openNode = useCallback(
    async (nodeOrId: KnowledgeNode | string, headingSlug?: string) => {
      try {
        const node =
          typeof nodeOrId === "string"
            ? await knowledgeService.get(nodeOrId)
            : nodeOrId;
        setSelected(node);
        setOpenNodes((current) => {
          const without = current.filter((item) => item.id !== node.id);
          return [...without, node].slice(-6);
        });
        setDraftTitle(node.title);
        setDraftContent(node.content_markdown);
        setSaveState("saved");
        setLastSavedAt(new Date(node.updated_at));
        setEditMode(false);
        void knowledgeService.touchRecent(node.id).catch(() => undefined);
        const recovered = window.localStorage.getItem(draftKey(node.id));
        if (recovered) {
          try {
            const value = JSON.parse(recovered) as {
              title?: string;
              content?: string;
            };
            if (
              typeof value.title === "string" &&
              typeof value.content === "string" &&
              (value.title !== node.title ||
                value.content !== node.content_markdown)
            ) {
              setDraftTitle(value.title);
              setDraftContent(value.content);
              setSaveState("dirty");
              setEditMode(true);
              toast.info("Rascunho local recuperado.");
            }
          } catch {
            window.localStorage.removeItem(draftKey(node.id));
          }
        }
        await refreshNodeDetails(node);
        if (headingSlug) {
          window.setTimeout(() => {
            document.getElementById(headingSlug)?.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
              block: "start",
            });
          }, 0);
        }
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [refreshNodeDetails],
  );

  const closeNode = useCallback(
    (nodeId: string) => {
      const closedIndex = openNodes.findIndex((node) => node.id === nodeId);
      const remaining = openNodes.filter((node) => node.id !== nodeId);
      setOpenNodes(remaining);

      if (selected?.id !== nodeId) return;
      const fallback =
        remaining[Math.min(Math.max(closedIndex, 0), remaining.length - 1)];
      setSelected(null);
      if (fallback) void openNode(fallback);
    },
    [openNode, openNodes, selected?.id],
  );

  useEffect(() => {
    if (!initialNodeId || initialNodeOpenedRef.current === initialNodeId) {
      return;
    }
    initialNodeOpenedRef.current = initialNodeId;
    void openNode(initialNodeId);
  }, [initialNodeId, openNode]);

  useEffect(() => {
    if (!initialNodeId && !selected && nodes[0]) void openNode(nodes[0]);
  }, [initialNodeId, nodes, openNode, selected]);

  const markDirty = useCallback(
    (title: string, content: string) => {
      if (!selected) return;
      setSaveState("dirty");
      window.localStorage.setItem(
        draftKey(selected.id),
        JSON.stringify({
          title,
          content,
          updatedAt: selected.updated_at,
          storedAt: new Date().toISOString(),
        }),
      );
    },
    [selected],
  );

  const save = useCallback(async () => {
    if (!selected || saveState === "saving") return;
    if (
      draftTitle.trim() === selected.title &&
      draftContent === selected.content_markdown
    ) {
      setSaveState("saved");
      window.localStorage.removeItem(draftKey(selected.id));
      return;
    }
    setSaveState("saving");
    try {
      const result = await knowledgeService.saveContent(
        selected,
        draftTitle,
        draftContent,
      );
      setSelected(result.node);
      setOpenNodes((current) =>
        current.map((node) =>
          node.id === result.node.id ? result.node : node,
        ),
      );
      setNodes((current) =>
        current.map((node) =>
          node.id === result.node.id ? result.node : node,
        ),
      );
      setSaveState("saved");
      setLastSavedAt(new Date());
      window.localStorage.removeItem(draftKey(selected.id));
      await refreshNodeDetails(result.node);
    } catch (error) {
      const code: KnowledgeErrorCode | undefined =
        error instanceof KnowledgeServiceError ? error.code : undefined;
      setSaveState(code === "KNOWLEDGE_CONFLICT" ? "conflict" : "error");
      toast.error(errorMessage(error));
    }
  }, [draftContent, draftTitle, refreshNodeDetails, saveState, selected]);

  useEffect(() => {
    if (!editMode || saveState !== "dirty") return;
    const timer = window.setTimeout(() => void save(), 900);
    return () => window.clearTimeout(timer);
  }, [draftContent, draftTitle, editMode, save, saveState]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setEditMode((current) => !current);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [save]);

  const createNode = async (missingTitle?: string) => {
    const title = (missingTitle ?? createTitle).trim();
    if (!workspaceId || !title) return;
    const visibility = missingTitle
      ? campaignScope
        ? "campaign"
        : "author"
      : createVisibility === "campaign" && !campaignScope
        ? "author"
        : createVisibility;
    setCreating(true);
    try {
      const result = await knowledgeService.create({
        workspaceId,
        campaignId: campaignScope,
        title,
        nodeType: missingTitle ? "free_note" : createType,
        visibility,
        contentMarkdown: `# ${title}\n\n`,
      });
      setCreateOpen(false);
      setCreateTitle("");
      await loadNodes();
      await openNode(result.node);
      setEditMode(true);
      toast.success("Página criada.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const updateMetadata = async (
    patch: Partial<{
      nodeType: KnowledgeNodeType;
      status: KnowledgeNodeStatus;
      visibility: KnowledgeVisibility;
    }>,
  ) => {
    if (!selected) return;
    if (patch.visibility === "campaign" && !selected.campaign_id) {
      toast.error(
        "Uma página do workspace não pode usar visibilidade de campanha.",
      );
      return;
    }
    setSaveState("saving");
    try {
      const result = await knowledgeService.update(
        selected.id,
        patch,
        selected.updated_at,
      );
      setSelected(result.node);
      setOpenNodes((current) =>
        current.map((node) =>
          node.id === result.node.id ? result.node : node,
        ),
      );
      setNodes((current) =>
        current.map((node) =>
          node.id === result.node.id ? result.node : node,
        ),
      );
      setSaveState("saved");
      setLastSavedAt(new Date());
    } catch (error) {
      setSaveState(
        error instanceof KnowledgeServiceError &&
          error.code === "KNOWLEDGE_CONFLICT"
          ? "conflict"
          : "error",
      );
      toast.error(errorMessage(error));
    }
  };

  const toggleFavorite = async () => {
    if (!selected) return;
    const favorite = favorites.some((node) => node.id === selected.id);
    try {
      await knowledgeService.setFavorite(selected.id, !favorite);
      setFavorites((current) =>
        favorite
          ? current.filter((node) => node.id !== selected.id)
          : [selected, ...current],
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const addAlias = async () => {
    if (!selected || !aliasValue.trim()) return;
    try {
      await knowledgeService.addAlias(selected.id, aliasValue);
      setAliasValue("");
      setAliases(
        (await knowledgeService.listAliases(selected.id)) as Array<
          Record<string, unknown>
        >,
      );
      toast.success("Alias adicionado.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const removeAlias = async (aliasId: string) => {
    if (!selected) return;
    try {
      await knowledgeService.removeAlias(aliasId);
      setAliases((current) =>
        current.filter((alias) => String(alias.id) !== aliasId),
      );
      toast.success("Alias removido.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openRelationCreator = () => {
    setRelationEditing(null);
    setRelationTargetId("");
    setRelationType("related_to");
    setRelationLabel("");
    setRelationDirection("directed");
    setRelationVisibility(selected?.visibility ?? "workspace");
    setRelationPropertiesText("{}");
    setRelationInverseEnabled(false);
    setRelationInverseType("related_to");
    setRelationInverseLabel("");
    setRelationOpen(true);
  };

  const openRelationEditor = (edge: KnowledgeEdge) => {
    if (!selected) return;
    const otherId =
      edge.source_node_id === selected.id
        ? edge.target_node_id
        : edge.source_node_id;
    setRelationEditing(edge);
    setRelationTargetId(otherId);
    setRelationType(edge.relation_type);
    setRelationLabel(edge.label);
    setRelationDirection(edge.direction);
    setRelationVisibility(edge.visibility);
    setRelationPropertiesText(JSON.stringify(edge.properties ?? {}, null, 2));
    setRelationInverseEnabled(false);
    setRelationInverseType(DEFAULT_INVERSE_RELATION[edge.relation_type]);
    setRelationInverseLabel("");
    setRelationOpen(true);
  };

  const saveRelation = async () => {
    if (!selected || !relationTargetId || relationTargetId === selected.id) {
      return;
    }

    let properties: Json;
    try {
      properties = parseRelationProperties(relationPropertiesText);
    } catch {
      toast.error("As propriedades devem formar um objeto JSON válido.");
      return;
    }

    setRelationSaving(true);
    try {
      if (relationEditing) {
        await knowledgeService.updateEdge(relationEditing, {
          relationType,
          label: relationLabel,
          direction: relationDirection,
          visibility: relationVisibility,
          properties,
        });
      } else {
        await knowledgeService.createEdge({
          sourceNodeId: selected.id,
          targetNodeId: relationTargetId,
          relationType,
          label: relationLabel,
          direction: relationDirection,
          visibility: relationVisibility,
          properties,
          inverse:
            relationInverseEnabled && relationDirection === "directed"
              ? {
                  relationType: relationInverseType,
                  label: relationInverseLabel,
                  properties,
                }
              : undefined,
        });
      }
      setEdges(await knowledgeService.listEdges(selected.id));
      setRelationOpen(false);
      setRelationEditing(null);
      setRelationTargetId("");
      toast.success(
        relationEditing ? "Relação atualizada." : "Relação criada.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRelationSaving(false);
    }
  };

  const restoreVersion = async (version: KnowledgeVersion) => {
    if (!selected) return;
    try {
      const result = await knowledgeService.restoreVersion(selected, version);
      await openNode(result.node);
      toast.success(`Versão ${version.version_number} restaurada.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const filteredEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          (relationFilterType === "all" ||
            edge.relation_type === relationFilterType) &&
          (relationFilterDirection === "all" ||
            edge.direction === relationFilterDirection) &&
          (relationFilterVisibility === "all" ||
            edge.visibility === relationFilterVisibility),
      ),
    [
      edges,
      relationFilterDirection,
      relationFilterType,
      relationFilterVisibility,
    ],
  );

  const filteredCommandNodes = useMemo(() => {
    const term = commandSearch.trim().toLocaleLowerCase("pt-BR");
    if (!term) return nodes.slice(0, 12);
    return nodes
      .filter(
        (node) =>
          node.title.toLocaleLowerCase("pt-BR").includes(term) ||
          TYPE_LABELS[node.node_type].toLocaleLowerCase("pt-BR").includes(term),
      )
      .slice(0, 16);
  }, [commandSearch, nodes]);

  const headings = useMemo(
    () =>
      draftContent
        .split("\n")
        .flatMap((line) => {
          const match = line.match(/^(#{1,4})\s+(.+)$/);
          return match
            ? [{ level: match[1].length, title: match[2].trim() }]
            : [];
        })
        .slice(0, 24),
    [draftContent],
  );

  const applyEditorSyntax = (before: string, after = before) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const { next, cursor } = insertAroundSelection(textarea, before, after);
    setDraftContent(next);
    markDirty(draftTitle, next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workspaces.length) {
    return (
      <div className="tadeon-page">
        <Card className="p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-cinzel text-2xl font-semibold">
            Nenhum workspace acessível
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O Nexus aparecerá quando você for associado a um workspace.
          </p>
        </Card>
      </div>
    );
  }

  const saveLabel =
    saveState === "saving"
      ? "Salvando…"
      : saveState === "dirty"
        ? "Alterações pendentes"
        : saveState === "conflict"
          ? "Conflito detectado"
          : saveState === "error"
            ? "Falha ao salvar"
            : `Salvo${lastSavedAt ? ` às ${formatTime(lastSavedAt)}` : ""}`;

  return (
    <div
      className={
        focusMode
          ? "min-h-[calc(100dvh-4rem)] bg-background"
          : "tadeon-page max-w-[112rem]"
      }
    >
      <section className="tadeon-nexus-header mb-4 flex flex-col justify-between gap-4 rounded-2xl border bg-card/60 p-4 backdrop-blur md:flex-row md:items-center">
        <div>
          <p className="tadeon-eyebrow">Arquivo vivo de continuidade</p>
          <h1 className="font-cinzel text-2xl font-semibold md:text-3xl">
            O Nexus
          </h1>
        </div>
        <div className="tadeon-nexus-actions grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Select
            value={workspaceId}
            onValueChange={(value) => {
              setWorkspaceId(value);
              setCampaignId("workspace");
              setSearchPage(0);
            }}
          >
            <SelectTrigger
              className="col-span-2 w-full sm:col-span-1 sm:w-[190px]"
              aria-label="Workspace"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={campaignId}
            onValueChange={(value) => {
              setCampaignId(value);
              setSearchPage(0);
            }}
          >
            <SelectTrigger
              className="col-span-2 w-full sm:col-span-1 sm:w-[190px]"
              aria-label="Campanha"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="workspace">Todo o workspace</SelectItem>
              {campaigns
                .filter((campaign) => campaign.workspace_id === workspaceId)
                .map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLibraryOpen(true)}
          >
            <BookMarked className="h-4 w-4" />
            Bibliotecas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPortabilityOpen(true)}
          >
            <Archive className="h-4 w-4" />
            Importar / exportar
          </Button>
          {graphEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGraphOpen(true)}
              disabled={!selected}
              title={
                selected
                  ? "Abrir grafo local desta página"
                  : "Abra uma página para iniciar o grafo"
              }
            >
              <GitBranch className="h-4 w-4" />
              Grafo local
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandOpen(true)}
            title="Ctrl + Shift + P"
          >
            <Command className="h-4 w-4" />
            Comandos
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCreateVisibility(campaignScope ? "campaign" : "author");
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova página
          </Button>
        </div>
      </section>

      <div
        className={
          focusMode
            ? "mx-auto max-w-5xl p-3 md:p-6"
            : "grid min-h-[72vh] gap-3 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_310px]"
        }
      >
        {!focusMode && (
          <aside
            className={`${selected ? "order-2" : "order-1"} min-h-0 rounded-2xl border bg-card/55 p-3 lg:order-1`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar no Nexus…"
                className="pl-9"
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as KnowledgeNodeType | "all");
                  setSearchPage(0);
                }}
              >
                <SelectTrigger aria-label="Filtrar tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {KNOWLEDGE_NODE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as KnowledgeNodeStatus | "all");
                  setSearchPage(0);
                }}
              >
                <SelectTrigger aria-label="Filtrar status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {KNOWLEDGE_NODE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={visibilityFilter}
                onValueChange={(value) => {
                  setVisibilityFilter(value as KnowledgeVisibility | "all");
                  setSearchPage(0);
                }}
              >
                <SelectTrigger aria-label="Filtrar visibilidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda visibilidade</SelectItem>
                  {KNOWLEDGE_VISIBILITIES.map((visibility) => (
                    <SelectItem key={visibility} value={visibility}>
                      {VISIBILITY_LABELS[visibility]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={searchRelationFilter}
                onValueChange={(value) => {
                  setSearchRelationFilter(value as RelationType | "all");
                  setSearchPage(0);
                }}
              >
                <SelectTrigger aria-label="Filtrar relação">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda relação</SelectItem>
                  {RELATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {RELATION_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={searchOrder}
                onValueChange={(value) => {
                  setSearchOrder(value as KnowledgeSearchOrder);
                  setSearchPage(0);
                }}
              >
                <SelectTrigger
                  className="col-span-2"
                  aria-label="Ordenar pesquisa"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Mais relevantes</SelectItem>
                  <SelectItem value="updated">
                    Atualizados recentemente
                  </SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={onlyCanonical}
                onChange={(event) => {
                  setOnlyCanonical(event.target.checked);
                  setSearchPage(0);
                }}
                className="accent-[var(--tadeon-flow)]"
              />
              Somente conteúdo canônico
            </label>

            <div className="mt-4 flex items-center justify-between">
              <p className="tadeon-eyebrow">Páginas</p>
              <Badge variant="outline">{searchCount}</Badge>
            </div>
            <div className="mt-2 max-h-[44vh] space-y-1 overflow-y-auto pr-1">
              {nodeLoading ? (
                <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-primary" />
              ) : nodes.length ? (
                nodes.map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    onClick={() => void openNode(node)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      selected?.id === node.id
                        ? "bg-primary/12 text-primary"
                        : "hover:bg-muted/55"
                    }`}
                  >
                    <span className="block truncate text-sm font-medium">
                      {node.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[node.node_type]} ·{" "}
                      {STATUS_LABELS[node.status]}
                    </span>
                    {searchSnippets[node.id] && (
                      <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                        {renderSearchSnippet(searchSnippets[node.id])}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                  Nenhuma página neste escopo.
                </p>
              )}
            </div>
            {searchCount > 0 && (
              <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSearchPage((current) => Math.max(0, current - 1))
                  }
                  disabled={searchPage === 0 || nodeLoading}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {searchPage + 1} de {Math.max(1, Math.ceil(searchCount / 30))}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchPage((current) => current + 1)}
                  disabled={!searchHasMore || nodeLoading}
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="mt-4 border-t pt-3">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Clock3 className="h-3.5 w-3.5 text-primary" />
                Recentes
              </p>
              <div className="mt-2 space-y-1">
                {recent.slice(0, 4).map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    onClick={() => void openNode(node.id)}
                    className="block min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:min-h-0 sm:py-1"
                  >
                    {node.title}
                  </button>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 text-primary" />
                Favoritos
              </p>
              <div className="mt-2 space-y-1">
                {favorites.slice(0, 4).map((node) => (
                  <button
                    type="button"
                    key={node.id}
                    onClick={() => void openNode(node.id)}
                    className="block min-h-11 w-full truncate rounded-lg px-2 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:min-h-0 sm:py-1"
                  >
                    {node.title}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <main
          className={`${selected ? "order-1" : "order-2"} min-w-0 overflow-hidden rounded-2xl border bg-card/55 lg:order-2`}
        >
          {openNodes.length > 0 && (
            <div className="flex min-w-0 gap-1 overflow-x-auto border-b bg-muted/20 px-2 pt-2">
              {openNodes.map((node) => (
                <div
                  key={node.id}
                  className={`flex max-w-56 shrink-0 items-stretch rounded-t-lg border border-b-0 text-xs ${
                    selected?.id === node.id
                      ? "bg-card text-primary"
                      : "border-transparent text-muted-foreground hover:bg-card/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void openNode(node)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                  >
                    <BookMarked className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{node.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => closeNode(node.id)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:h-9 sm:w-9"
                    aria-label={`Fechar ${node.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selected ? (
            <>
              <div className="flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                    {currentCampaign?.name ?? "Workspace"}{" "}
                    <ChevronRight className="inline h-3 w-3" />{" "}
                    {TYPE_LABELS[selected.node_type]}
                  </p>
                  <p
                    className={`mt-1 flex items-center gap-1.5 text-xs ${
                      saveState === "conflict" || saveState === "error"
                        ? "text-destructive"
                        : saveState === "saved"
                          ? "text-[var(--tadeon-flow)]"
                          : "text-muted-foreground"
                    }`}
                  >
                    {saveState === "saving" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : saveState === "saved" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saveLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void toggleFavorite()}
                    aria-label="Alternar favorito"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        favorites.some((node) => node.id === selected.id)
                          ? "fill-primary text-primary"
                          : ""
                      }`}
                    />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode((current) => !current)}
                  >
                    {editMode ? (
                      <BookOpen className="h-4 w-4" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    {editMode ? "Leitura" : "Editar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFocusMode((current) => !current)}
                  >
                    <Maximize2 className="h-4 w-4" />
                    Foco
                  </Button>
                  {!focusMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRightOpen((current) => !current)}
                      className="xl:hidden"
                    >
                      <PanelRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <article className="min-h-[62vh] px-5 py-6 md:px-8 md:py-8">
                {editMode ? (
                  <div>
                    <Input
                      value={draftTitle}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraftTitle(value);
                        markDirty(value, draftContent);
                      }}
                      className="h-auto border-0 bg-transparent px-0 font-cinzel text-3xl font-semibold shadow-none focus-visible:ring-0 md:text-4xl"
                      aria-label="Título da página"
                      maxLength={200}
                    />
                    <div className="my-4 flex flex-wrap gap-1 rounded-lg border bg-muted/20 p-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEditorSyntax("**")}
                      >
                        <strong>B</strong>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEditorSyntax("*")}
                      >
                        <em>I</em>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEditorSyntax("[[", "]]")}
                      >
                        <Link2 className="h-4 w-4" />
                        Wikilink
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEditorSyntax("> [!NOTE] ", "")}
                      >
                        <TextQuote className="h-4 w-4" />
                        Callout
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEditorSyntax("- [ ] ", "")}
                      >
                        <Check className="h-4 w-4" />
                        Tarefa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => applyEditorSyntax("```\n", "\n```")}
                      >
                        Código
                      </Button>
                    </div>
                    <Textarea
                      ref={editorRef}
                      value={draftContent}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraftContent(value);
                        markDirty(draftTitle, value);
                      }}
                      className="min-h-[48vh] resize-y border-0 bg-transparent px-0 font-mono text-sm leading-7 shadow-none focus-visible:ring-0"
                      spellCheck
                      aria-label="Conteúdo Markdown"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <span>
                        {wordCount(draftContent)} palavras ·{" "}
                        {draftContent.length} caracteres
                      </span>
                      <span>Ctrl + S salva · Ctrl + E alterna o modo</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="font-cinzel text-3xl font-semibold md:text-5xl">
                      {draftTitle}
                    </h1>
                    {selected.summary && (
                      <p className="mt-3 max-w-3xl text-base italic text-muted-foreground">
                        {selected.summary}
                      </p>
                    )}
                    <div className="tadeon-rule my-6" />
                    <SafeMarkdown
                      markdown={draftContent}
                      previews={previews}
                      onOpenNode={(nodeId, headingSlug) =>
                        void openNode(nodeId, headingSlug)
                      }
                      onCreateMissing={(title) => void createNode(title)}
                    />
                  </div>
                )}
              </article>
            </>
          ) : (
            <div className="flex min-h-[65vh] flex-col items-center justify-center p-8 text-center">
              <BookOpen className="h-12 w-12 text-primary/70" />
              <h2 className="mt-4 font-cinzel text-2xl font-semibold">
                Abra uma página do Nexus
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Pesquise na lateral ou crie a primeira página deste escopo.
              </p>
            </div>
          )}
        </main>

        {!focusMode && rightOpen && selected && (
          <aside className="order-3 min-h-0 rounded-2xl border bg-card/55 p-3 lg:col-span-2 xl:col-span-1">
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-muted/30 p-1">
              {(
                [
                  ["properties", ListTree],
                  ["relations", Link2],
                  ["history", History],
                  ["assets", ImagePlus],
                ] as const
              ).map(([panel, Icon]) => (
                <button
                  key={panel}
                  type="button"
                  onClick={() => setRightPanel(panel)}
                  className={`flex justify-center rounded-md p-2 ${
                    rightPanel === panel
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label={panel}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>

            {rightPanel === "properties" && (
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={selected.node_type}
                    onValueChange={(value) =>
                      void updateMetadata({
                        nodeType: value as KnowledgeNodeType,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_NODE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={selected.status}
                    onValueChange={(value) =>
                      void updateMetadata({
                        status: value as KnowledgeNodeStatus,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_NODE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Visibilidade</Label>
                  <Select
                    value={selected.visibility}
                    onValueChange={(value) =>
                      void updateMetadata({
                        visibility: value as KnowledgeVisibility,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KNOWLEDGE_VISIBILITIES.filter(
                        (visibility) =>
                          visibility !== "campaign" ||
                          Boolean(selected.campaign_id),
                      ).map((visibility) => (
                        <SelectItem key={visibility} value={visibility}>
                          {VISIBILITY_LABELS[visibility]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    Navegação por títulos
                  </p>
                  <div className="mt-2 space-y-1">
                    {headings.length ? (
                      headings.map((heading, index) => (
                        <p
                          key={`${heading.title}-${index}`}
                          className="truncate text-xs text-muted-foreground"
                          style={{
                            paddingLeft: `${(heading.level - 1) * 8}px`,
                          }}
                        >
                          {heading.title}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhum título Markdown.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    Aliases
                  </p>
                  <div className="mt-2 flex gap-1">
                    <Input
                      value={aliasValue}
                      onChange={(event) => setAliasValue(event.target.value)}
                      placeholder="Novo alias"
                      className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={() => void addAlias()}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {aliases.map((alias) => (
                      <Badge
                        key={String(alias.id)}
                        variant="outline"
                        className="gap-1 pr-1"
                      >
                        {String(alias.alias)}
                        <button
                          type="button"
                          onClick={() => void removeAlias(String(alias.id))}
                          className="rounded p-0.5 hover:bg-muted"
                          aria-label={`Remover alias ${String(alias.alias)}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border p-3 text-[11px] text-muted-foreground">
                  <p>ID: {selected.id}</p>
                  <p className="mt-1">Slug: {selected.slug}</p>
                  <p className="mt-1">
                    Atualizado:{" "}
                    {new Date(selected.updated_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            )}

            {rightPanel === "relations" && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="tadeon-eyebrow">Relações e backlinks</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openRelationCreator}
                    disabled={nodes.every((node) => node.id === selected.id)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Relacionar
                  </Button>
                </div>

                <div className="mt-3 grid gap-2">
                  <Select
                    value={relationFilterType}
                    onValueChange={(value) =>
                      setRelationFilterType(value as RelationType | "all")
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {RELATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {RELATION_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={relationFilterDirection}
                      onValueChange={(value) =>
                        setRelationFilterDirection(
                          value as KnowledgeRelationDirection | "all",
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toda direção</SelectItem>
                        {KNOWLEDGE_RELATION_DIRECTIONS.map((direction) => (
                          <SelectItem key={direction} value={direction}>
                            {RELATION_DIRECTION_LABELS[direction]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={relationFilterVisibility}
                      onValueChange={(value) =>
                        setRelationFilterVisibility(
                          value as KnowledgeVisibility | "all",
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toda visibilidade</SelectItem>
                        {KNOWLEDGE_VISIBILITIES.map((visibility) => (
                          <SelectItem key={visibility} value={visibility}>
                            {VISIBILITY_LABELS[visibility]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {filteredEdges.length ? (
                    filteredEdges.map((edge) => {
                      const outgoing = edge.source_node_id === selected.id;
                      const otherId = outgoing
                        ? edge.target_node_id
                        : edge.source_node_id;
                      const other = nodes.find((node) => node.id === otherId);
                      const directionSymbol =
                        edge.direction === "bidirectional"
                          ? "↔"
                          : outgoing
                            ? "→"
                            : "←";
                      return (
                        <div
                          key={edge.id}
                          className="rounded-lg border p-3 hover:border-primary/40"
                        >
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => void openNode(otherId)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p className="text-[10px] uppercase tracking-wide text-primary">
                                {directionSymbol}{" "}
                                {edge.label ||
                                  RELATION_LABELS[edge.relation_type]}
                              </p>
                              <p className="mt-1 truncate text-sm">
                                {other?.title ?? "Página relacionada"}
                              </p>
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRelationEditor(edge)}
                              aria-label="Editar relação"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await knowledgeService.removeEdge(edge.id);
                                  setEdges((current) =>
                                    current.filter(
                                      (item) => item.id !== edge.id,
                                    ),
                                  );
                                } catch (error) {
                                  toast.error(errorMessage(error));
                                }
                              }}
                              aria-label="Remover relação"
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline">
                              {RELATION_LABELS[edge.relation_type]}
                            </Badge>
                            <Badge variant="outline">
                              {RELATION_DIRECTION_LABELS[edge.direction]}
                            </Badge>
                            <Badge variant="outline">
                              {VISIBILITY_LABELS[edge.visibility]}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                      {edges.length
                        ? "Nenhuma relação corresponde aos filtros."
                        : "Nenhuma relação visível."}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <p className="tadeon-eyebrow">Backlinks</p>
                  <div className="mt-3 space-y-2">
                    {backlinks.length ? (
                      backlinks.map((backlink) => (
                        <button
                          key={backlink.id}
                          type="button"
                          onClick={() => void openNode(backlink.source_node_id)}
                          className="w-full rounded-lg border p-3 text-left hover:border-primary/40"
                        >
                          <p className="truncate text-sm font-medium">
                            {backlink.source?.title ?? "Página de origem"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                            {backlink.raw_text}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        Nenhuma página aponta para esta página.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="tadeon-eyebrow">Links quebrados</p>
                  <div className="mt-3 space-y-2">
                    {brokenLinks.length ? (
                      brokenLinks.map((link) => (
                        <div
                          key={link.id}
                          className="rounded-lg border border-destructive/30 bg-destructive/[0.04] p-3"
                        >
                          <p className="truncate text-sm font-medium text-destructive">
                            {link.target_text}
                            {link.target_heading
                              ? `#${link.target_heading}`
                              : ""}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {link.reason === "missing_heading"
                              ? "A página existe, mas a seção não foi encontrada."
                              : "A página de destino não foi encontrada."}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        Nenhum link quebrado nesta página.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {rightPanel === "history" && (
              <div className="mt-4">
                <p className="tadeon-eyebrow">Histórico de versões</p>
                <div className="mt-3 max-h-[58vh] space-y-2 overflow-y-auto">
                  {versions.length ? (
                    versions.map((version) => (
                      <div key={version.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              Versão {version.version_number}
                            </p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {new Date(version.created_at).toLocaleString(
                                "pt-BR",
                              )}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void restoreVersion(version)}
                            title="Restaurar versão"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {version.title_snapshot}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                      O histórico começa após a primeira alteração.
                    </p>
                  )}
                </div>
              </div>
            )}

            {rightPanel === "assets" && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="tadeon-eyebrow">Anexos</p>
                  {assetsEnabled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssetPickerOpen(true)}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Adicionar
                    </Button>
                  )}
                </div>
                <div className="mt-3 space-y-2">
                  {assetLinks.length ? (
                    assetLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between gap-2 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">
                            {link.caption || link.asset_role}
                          </p>
                          <p className="mt-1 truncate text-[10px] text-muted-foreground">
                            {link.asset_id}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await knowledgeService.detachAsset(link.id);
                              setAssetLinks((current) =>
                                current.filter((item) => item.id !== link.id),
                              );
                            } catch (error) {
                              toast.error(errorMessage(error));
                            }
                          }}
                        >
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">
                      Nenhum arquivo anexado.
                    </p>
                  )}
                </div>
                {!assetsEnabled && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    O seletor aparecerá quando Nexus Assets estiver ativo.
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground"
                onClick={async () => {
                  try {
                    const archived = await knowledgeService.archive(selected);
                    await openNode(archived.node);
                    toast.success("Página arquivada.");
                  } catch (error) {
                    toast.error(errorMessage(error));
                  }
                }}
              >
                <Archive className="h-4 w-4" />
                Arquivar página
              </Button>
            </div>
          </aside>
        )}
      </div>

      <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
        <DialogContent className="h-[92vh] max-h-[92vh] overflow-hidden p-4 sm:max-w-[96vw]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="font-cinzel">
              Teia local de O Nexus
            </DialogTitle>
            <DialogDescription>
              Vizinhança limitada, filtrável e carregada apenas com metadados
              visíveis.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            {selected && (
              <KnowledgeGraph
                workspaceId={workspaceId}
                campaignId={campaignScope}
                focusNodeId={selected.id}
                onOpenNode={(nodeId) => {
                  setGraphOpen(false);
                  void openNode(nodeId);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cinzel">Nova página</DialogTitle>
            <DialogDescription>
              Comece com Markdown portável e refine as propriedades depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                className="mt-1"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                autoFocus
                maxLength={200}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={createType}
                  onValueChange={(value) =>
                    setCreateType(value as KnowledgeNodeType)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_NODE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibilidade</Label>
                <Select
                  value={createVisibility}
                  onValueChange={(value) =>
                    setCreateVisibility(value as KnowledgeVisibility)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_VISIBILITIES.filter(
                      (visibility) =>
                        visibility !== "campaign" || Boolean(campaignScope),
                    ).map((visibility) => (
                      <SelectItem key={visibility} value={visibility}>
                        {VISIBILITY_LABELS[visibility]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void createNode()}
              disabled={creating || !createTitle.trim()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus2 className="h-4 w-4" />
              )}
              Criar página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-4">
            <DialogTitle className="font-cinzel">
              Paleta de comandos
            </DialogTitle>
            <DialogDescription>Ctrl + Shift + P</DialogDescription>
          </DialogHeader>
          <div className="relative border-b">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={commandSearch}
              onChange={(event) => setCommandSearch(event.target.value)}
              placeholder="Abrir página ou executar ação…"
              className="h-12 rounded-none border-0 pl-11 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <button
              type="button"
              onClick={() => {
                setCommandOpen(false);
                setCreateVisibility(campaignScope ? "campaign" : "author");
                setCreateOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
            >
              <FilePlus2 className="h-4 w-4 text-primary" />
              <span className="text-sm">Criar nova página</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCommandOpen(false);
                setFocusMode((current) => !current);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
            >
              <Maximize2 className="h-4 w-4 text-primary" />
              <span className="text-sm">Alternar foco de escrita</span>
            </button>
            <p className="tadeon-eyebrow mt-3 px-3">Páginas</p>
            {filteredCommandNodes.map((node) => (
              <button
                type="button"
                key={node.id}
                onClick={() => {
                  setCommandOpen(false);
                  void openNode(node);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted"
              >
                <span className="truncate text-sm">{node.title}</span>
                <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                  {TYPE_LABELS[node.node_type]}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={relationOpen}
        onOpenChange={(open) => {
          setRelationOpen(open);
          if (!open) setRelationEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel">
              {relationEditing ? "Editar relação" : "Criar relação"}
            </DialogTitle>
            <DialogDescription>
              Defina direção, visibilidade, propriedades e uma inversa opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Página relacionada</Label>
              <Select
                value={relationTargetId}
                onValueChange={setRelationTargetId}
                disabled={Boolean(relationEditing)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione uma página" />
                </SelectTrigger>
                <SelectContent>
                  {nodes
                    .filter((node) => node.id !== selected?.id)
                    .map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tipo de relação</Label>
                <Select
                  value={relationType}
                  onValueChange={(value) => {
                    const nextType = value as RelationType;
                    setRelationType(nextType);
                    if (!relationEditing) {
                      setRelationInverseType(
                        DEFAULT_INVERSE_RELATION[nextType],
                      );
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {RELATION_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rótulo</Label>
                <Input
                  value={relationLabel}
                  onChange={(event) => setRelationLabel(event.target.value)}
                  placeholder={RELATION_LABELS[relationType]}
                  maxLength={160}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Direção</Label>
                <Select
                  value={relationDirection}
                  onValueChange={(value) => {
                    const direction = value as KnowledgeRelationDirection;
                    setRelationDirection(direction);
                    if (direction === "bidirectional") {
                      setRelationInverseEnabled(false);
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_RELATION_DIRECTIONS.map((direction) => (
                      <SelectItem key={direction} value={direction}>
                        {RELATION_DIRECTION_LABELS[direction]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibilidade</Label>
                <Select
                  value={relationVisibility}
                  onValueChange={(value) =>
                    setRelationVisibility(value as KnowledgeVisibility)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWLEDGE_VISIBILITIES.filter(
                      (visibility) =>
                        visibility !== "campaign" ||
                        Boolean(selected?.campaign_id),
                    ).map((visibility) => (
                      <SelectItem key={visibility} value={visibility}>
                        {VISIBILITY_LABELS[visibility]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Propriedades (JSON)</Label>
              <Textarea
                value={relationPropertiesText}
                onChange={(event) =>
                  setRelationPropertiesText(event.target.value)
                }
                rows={5}
                spellCheck={false}
                className="mt-1 font-mono text-xs"
                placeholder='{"período":"Era do Véu","peso":2}'
              />
            </div>

            {!relationEditing && (
              <label className="flex items-start gap-3 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={relationInverseEnabled}
                  onChange={(event) =>
                    setRelationInverseEnabled(event.target.checked)
                  }
                  disabled={relationDirection === "bidirectional"}
                  className="mt-1 accent-[var(--tadeon-flow)]"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Criar relação inversa
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    A relação inversa é criada na mesma transação. Relações
                    bidirecionais já funcionam nos dois sentidos.
                  </span>
                </span>
              </label>
            )}

            {!relationEditing &&
              relationInverseEnabled &&
              relationDirection === "directed" && (
                <div className="grid gap-4 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2">
                  <div>
                    <Label>Tipo inverso</Label>
                    <Select
                      value={relationInverseType}
                      onValueChange={(value) =>
                        setRelationInverseType(value as RelationType)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {RELATION_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rótulo inverso</Label>
                    <Input
                      value={relationInverseLabel}
                      onChange={(event) =>
                        setRelationInverseLabel(event.target.value)
                      }
                      placeholder={RELATION_LABELS[relationInverseType]}
                      maxLength={160}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRelationOpen(false)}
              disabled={relationSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void saveRelation()}
              disabled={
                relationSaving ||
                !relationTargetId ||
                relationTargetId === selected?.id
              }
            >
              {relationSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {relationEditing ? "Salvar relação" : "Criar relação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KnowledgeLibrary
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        workspaceId={workspaceId}
        campaignId={campaignScope}
        campaigns={campaigns}
        onOpenNode={(node) => void openNode(node)}
        onChanged={() => void loadNodes()}
      />

      <KnowledgePortabilityDialog
        open={portabilityOpen}
        onOpenChange={setPortabilityOpen}
        workspaceId={workspaceId}
        campaignId={campaignScope}
        assetsEnabled={assetsEnabled}
        onImported={() => loadNodes()}
      />

      {selected && assetsEnabled && (
        <AssetPickerDialog
          open={assetPickerOpen}
          onOpenChange={setAssetPickerOpen}
          workspaceId={selected.workspace_id}
          campaignId={selected.campaign_id}
          title="Anexar arquivo à página"
          onSelect={async (asset) => {
            try {
              await knowledgeService.attachAsset(selected.id, asset.id);
              setAssetLinks(await knowledgeService.listNodeAssets(selected.id));
              toast.success("Arquivo anexado.");
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
        />
      )}
    </div>
  );
}
