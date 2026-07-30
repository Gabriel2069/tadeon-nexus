import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookCopy,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Grid2X2,
  LibraryBig,
  List,
  Loader2,
  Pencil,
  Plus,
  Rows3,
  Search,
  Star,
  Table2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { SafeMarkdown } from "@/components/knowledge/safe-markdown";
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
import type { Json } from "@/integrations/supabase/types";
import {
  knowledgeLibraryService,
  type KnowledgeSheetOption,
  type KnowledgeSheetSlot,
  type KnowledgeTemplate,
  type KnowledgeTemplateRelation,
} from "@/lib/knowledge/knowledge-library-service";
import {
  knowledgeService,
  type KnowledgeNode,
  type KnowledgeSearchOrder,
} from "@/lib/knowledge/knowledge-service";
import { KnowledgeServiceError } from "@/lib/knowledge/knowledge-errors";
import {
  KNOWLEDGE_NODE_TYPES,
  RELATION_TYPES,
  type KnowledgeNodeType,
  type RelationType,
} from "@/lib/nexus-contracts";

type LibraryView = "cards" | "table" | "compact";

interface CampaignOption {
  id: string;
  workspace_id: string;
  name: string;
}

const LIBRARY_TYPES = [
  "plot",
  "transcendental_ability",
  "fragment",
  "weapon",
  "creature",
  "npc",
  "character",
  "object",
  "culture",
  "location",
  "map",
  "document",
  "historical_event",
  "clue",
] as const satisfies readonly KnowledgeNodeType[];

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
  terrain: "Terreno",
  tectonic_plate: "Placa tectônica",
  historical_event: "Evento",
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

const SLOT_LABELS: Record<KnowledgeSheetSlot, string> = {
  reference: "Referência",
  plot: "Trama",
  ability: "Habilidade",
  fragment: "Fragmento",
  weapon: "Arma",
  inventory: "Inventário",
  note: "Nota",
};

function messageFor(error: unknown) {
  return error instanceof KnowledgeServiceError
    ? error.userMessage
    : "Não foi possível concluir a operação na biblioteca.";
}

function parseObject(value: string): Json {
  const parsed = JSON.parse(value) as Json;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("As propriedades devem ser um objeto JSON.");
  }
  return parsed;
}

function parseRelations(value: string): KnowledgeTemplateRelation[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("As relações sugeridas devem ser uma lista JSON.");
  }
  return parsed.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("relation_type" in entry) ||
      !RELATION_TYPES.includes(String(entry.relation_type) as RelationType)
    ) {
      throw new Error("Há uma relação sugerida inválida.");
    }
    return {
      relation_type: String(entry.relation_type) as RelationType,
      label:
        "label" in entry && typeof entry.label === "string" ? entry.label : "",
    };
  });
}

function toggleId(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function KnowledgeLibrary({
  open,
  onOpenChange,
  workspaceId,
  campaignId,
  campaigns,
  onOpenNode,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  campaignId: string | null;
  campaigns: CampaignOption[];
  onOpenNode: (node: KnowledgeNode) => void;
  onChanged: () => void;
}) {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [nodeType, setNodeType] = useState<
    (typeof LIBRARY_TYPES)[number] | "all"
  >("all");
  const [order, setOrder] = useState<KnowledgeSearchOrder>("updated");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<LibraryView>("cards");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<KnowledgeNode | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<KnowledgeTemplate[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [canManageTemplates, setCanManageTemplates] = useState(false);
  const [sheets, setSheets] = useState<KnowledgeSheetOption[]>([]);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [sheetId, setSheetId] = useState("");
  const [sheetSlot, setSheetSlot] = useState<KnowledgeSheetSlot>("reference");
  const [targetCampaignId, setTargetCampaignId] = useState(campaignId ?? "");
  const [actionBusy, setActionBusy] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<KnowledgeTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] =
    useState<KnowledgeNodeType>("free_note");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateIcon, setTemplateIcon] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templateProperties, setTemplateProperties] = useState("{}");
  const [templateRequired, setTemplateRequired] = useState("");
  const [templateRelations, setTemplateRelations] = useState("[]");
  const [templateUseOpen, setTemplateUseOpen] = useState(false);
  const [templateToUse, setTemplateToUse] = useState<KnowledgeTemplate | null>(
    null,
  );
  const [templateNodeTitle, setTemplateNodeTitle] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadNodes = useCallback(async () => {
    if (!open || !workspaceId) return;
    setLoading(true);
    try {
      const [result, favorites] = await Promise.all([
        knowledgeService.search({
          workspaceId,
          query: debouncedQuery,
          campaignId,
          includeWorkspace: true,
          nodeTypes: nodeType === "all" ? [...LIBRARY_TYPES] : [nodeType],
          order,
          page,
          pageSize: 48,
        }),
        knowledgeService.listFavoriteNodes(100),
      ]);
      setNodes(result.hits.map((hit) => hit.node));
      setCount(result.count);
      setHasMore(result.hasMore);
      setFavoriteIds(new Set(favorites.map((node) => node.id)));
      setPreview((current) => {
        if (current && result.hits.some((hit) => hit.node.id === current.id)) {
          return current;
        }
        return result.hits[0]?.node ?? null;
      });
      setSelectedIds((current) => {
        const visible = new Set(result.hits.map((hit) => hit.node.id));
        return new Set([...current].filter((id) => visible.has(id)));
      });
    } catch (error) {
      toast.error(messageFor(error));
      setNodes([]);
      setCount(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [campaignId, debouncedQuery, nodeType, open, order, page, workspaceId]);

  const loadTemplates = useCallback(async () => {
    if (!open || !workspaceId) return;
    try {
      const canManage =
        await knowledgeLibraryService.canManageWorkspace(workspaceId);
      setCanManageTemplates(canManage);
      if (canManage) {
        await knowledgeLibraryService.ensureDefaultTemplates(workspaceId);
      }
      setTemplates(await knowledgeLibraryService.listTemplates(workspaceId));
    } catch (error) {
      toast.error(messageFor(error));
      setTemplates([]);
    }
  }, [open, workspaceId]);

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  useEffect(() => {
    if (!open || !workspaceId) return;
    setTargetCampaignId(campaignId ?? "");
    void loadTemplates();
    void knowledgeLibraryService
      .listSheets(workspaceId)
      .then((nextSheets) => {
        setSheets(nextSheets);
        setSheetId((current) =>
          nextSheets.some((sheet) => sheet.id === current)
            ? current
            : (nextSheets[0]?.id ?? ""),
        );
      })
      .catch((error) => toast.error(messageFor(error)));
  }, [campaignId, loadTemplates, open, workspaceId]);

  const selectedNodes = useMemo(
    () => nodes.filter((node) => selectedIds.has(node.id)),
    [nodes, selectedIds],
  );

  const runBulkFavorite = async () => {
    if (!selectedIds.size) return;
    setActionBusy(true);
    try {
      await knowledgeLibraryService.setFavoriteBulk([...selectedIds], true);
      setFavoriteIds((current) => new Set([...current, ...selectedIds]));
      toast.success(
        `${selectedIds.size} item(ns) adicionado(s) aos favoritos.`,
      );
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const runCampaignLink = async () => {
    if (!selectedIds.size || !targetCampaignId) return;
    setActionBusy(true);
    try {
      await knowledgeLibraryService.linkNodesToCampaign(
        [...selectedIds],
        targetCampaignId,
      );
      toast.success(
        `${selectedIds.size} item(ns) vinculado(s) à campanha sem duplicação.`,
      );
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const runSheetLink = async () => {
    if (!selectedIds.size || !sheetId) return;
    setActionBusy(true);
    try {
      await knowledgeLibraryService.linkNodesToSheet(
        [...selectedIds],
        sheetId,
        sheetSlot,
      );
      setSheetDialogOpen(false);
      toast.success(
        `${selectedIds.size} item(ns) vinculado(s) à ficha com origem preservada.`,
      );
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const toggleFavorite = async (node: KnowledgeNode) => {
    const favorite = favoriteIds.has(node.id);
    try {
      await knowledgeService.setFavorite(node.id, !favorite);
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (favorite) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const openTemplateEditor = (template?: KnowledgeTemplate) => {
    setEditingTemplate(template ?? null);
    setTemplateName(template?.name ?? "");
    setTemplateType(template?.node_type ?? "free_note");
    setTemplateDescription(template?.description ?? "");
    setTemplateIcon(template?.icon ?? "");
    setTemplateContent(template?.default_content ?? "# {{title}}\n\n");
    setTemplateProperties(
      JSON.stringify(template?.default_properties ?? {}, null, 2),
    );
    setTemplateRequired(template?.required_fields.join(", ") ?? "");
    setTemplateRelations(
      JSON.stringify(template?.suggested_relations ?? [], null, 2),
    );
    setTemplateEditorOpen(true);
  };

  const saveTemplate = async () => {
    setActionBusy(true);
    try {
      const input = {
        nodeType: templateType,
        name: templateName,
        description: templateDescription,
        icon: templateIcon || null,
        defaultContent: templateContent,
        defaultProperties: parseObject(templateProperties),
        requiredFields: templateRequired.split(","),
        suggestedRelations: parseRelations(templateRelations),
      };
      if (editingTemplate) {
        await knowledgeLibraryService.updateTemplate(editingTemplate, input);
      } else {
        await knowledgeLibraryService.createTemplate({
          workspaceId,
          ...input,
        });
      }
      setTemplateEditorOpen(false);
      await loadTemplates();
      toast.success(
        editingTemplate ? "Template atualizado." : "Template criado.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const duplicateTemplate = async (template: KnowledgeTemplate) => {
    setActionBusy(true);
    try {
      await knowledgeLibraryService.duplicateTemplate(template);
      await loadTemplates();
      toast.success("Template duplicado.");
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const deleteTemplate = async (template: KnowledgeTemplate) => {
    if (!window.confirm(`Arquivar o template “${template.name}”?`)) return;
    setActionBusy(true);
    try {
      await knowledgeLibraryService.softDeleteTemplate(template);
      await loadTemplates();
      toast.success("Template arquivado de forma reversível.");
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const createFromTemplate = async () => {
    if (!templateToUse || !templateNodeTitle.trim()) return;
    setActionBusy(true);
    try {
      const result = await knowledgeLibraryService.createNodeFromTemplate({
        template: templateToUse,
        title: templateNodeTitle,
        campaignId,
      });
      setTemplateUseOpen(false);
      setTemplatesOpen(false);
      onChanged();
      onOpenNode(result.node);
      toast.success("Página criada a partir do template.");
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setActionBusy(false);
    }
  };

  const nodeCard = (node: KnowledgeNode, compact = false) => {
    const selected = selectedIds.has(node.id);
    return (
      <Card
        key={node.id}
        className={`group relative cursor-pointer p-3 transition-colors ${
          selected ? "border-primary/60 bg-primary/[0.06]" : "hover:bg-muted/35"
        }`}
        onClick={() => setPreview(node)}
      >
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() =>
              setSelectedIds((current) => toggleId(current, node.id))
            }
            onClick={(event) => event.stopPropagation()}
            className="mt-1 accent-[var(--tadeon-flow)]"
            aria-label={`Selecionar ${node.title}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold">{node.title}</p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void toggleFavorite(node);
                }}
                className="rounded p-1 hover:bg-muted"
                aria-label="Alternar favorito"
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    favoriteIds.has(node.id)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {TYPE_LABELS[node.node_type]} · {node.status}
            </p>
            {!compact && (
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                {node.summary || node.plain_text || "Sem resumo."}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-[94vh] max-w-[96vw] overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 font-cinzel">
                  <LibraryBig className="h-5 w-5 text-primary" />
                  Bibliotecas de O Nexus
                </DialogTitle>
                <DialogDescription>
                  Visões estruturadas sobre as mesmas páginas, sem duplicar a
                  fonte canônica.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatesOpen(true)}
                >
                  <BookCopy className="h-4 w-4" />
                  Templates
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView("cards")}
                  aria-label="Visualização em cartões"
                >
                  <Grid2X2
                    className={`h-4 w-4 ${view === "cards" ? "text-primary" : ""}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView("table")}
                  aria-label="Visualização em tabela"
                >
                  <Table2
                    className={`h-4 w-4 ${view === "table" ? "text-primary" : ""}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView("compact")}
                  aria-label="Visualização compacta"
                >
                  <Rows3
                    className={`h-4 w-4 ${view === "compact" ? "text-primary" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
            <aside className="min-h-0 overflow-y-auto border-r p-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar na biblioteca…"
                  className="pl-9"
                />
              </div>
              <Select
                value={order}
                onValueChange={(value) => {
                  setOrder(value as KnowledgeSearchOrder);
                  setPage(0);
                }}
              >
                <SelectTrigger className="mt-2" aria-label="Ordenar biblioteca">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Atualizados</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="relevance">Relevância</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Visões
              </p>
              <button
                type="button"
                onClick={() => {
                  setNodeType("all");
                  setPage(0);
                }}
                className={`mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs ${
                  nodeType === "all"
                    ? "bg-primary/12 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                Todas as bibliotecas
                <List className="h-3.5 w-3.5" />
              </button>
              {LIBRARY_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    setNodeType(type);
                    setPage(0);
                  }}
                  className={`mt-0.5 block w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                    nodeType === type
                      ? "bg-primary/12 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {TYPE_LABELS[type]}
                </button>
              ))}
            </aside>

            <section className="min-h-0 overflow-y-auto p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      nodes.length > 0 && selectedIds.size === nodes.length
                    }
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked
                          ? new Set(nodes.map((node) => node.id))
                          : new Set(),
                      )
                    }
                    className="accent-[var(--tadeon-flow)]"
                    aria-label="Selecionar página atual"
                  />
                  <Badge variant="outline">{count} item(ns)</Badge>
                  {selectedIds.size > 0 && (
                    <Badge>{selectedIds.size} selecionado(s)</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void runBulkFavorite()}
                    disabled={!selectedIds.size || actionBusy}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Favoritar
                  </Button>
                  <Select
                    value={targetCampaignId}
                    onValueChange={setTargetCampaignId}
                  >
                    <SelectTrigger
                      className="h-9 w-[170px]"
                      aria-label="Campanha de destino"
                    >
                      <SelectValue placeholder="Campanha" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns
                        .filter(
                          (campaign) => campaign.workspace_id === workspaceId,
                        )
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
                    onClick={() => void runCampaignLink()}
                    disabled={
                      !selectedIds.size || !targetCampaignId || actionBusy
                    }
                  >
                    Vincular campanha
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSheetDialogOpen(true)}
                    disabled={!selectedIds.size || !sheets.length || actionBusy}
                  >
                    Vincular à ficha
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-72 items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : !nodes.length ? (
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  Nenhum item corresponde à visão e aos filtros.
                </div>
              ) : view === "table" ? (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/45 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="w-10 px-3 py-2">Sel.</th>
                        <th className="px-3 py-2">Título</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map((node) => (
                        <tr
                          key={node.id}
                          onClick={() => setPreview(node)}
                          className="cursor-pointer border-t hover:bg-muted/35"
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(node.id)}
                              onChange={() =>
                                setSelectedIds((current) =>
                                  toggleId(current, node.id),
                                )
                              }
                              onClick={(event) => event.stopPropagation()}
                              className="accent-[var(--tadeon-flow)]"
                            />
                          </td>
                          <td className="max-w-80 truncate px-3 py-2 font-medium">
                            {node.title}
                          </td>
                          <td className="px-3 py-2">
                            {TYPE_LABELS[node.node_type]}
                          </td>
                          <td className="px-3 py-2">{node.status}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {new Date(node.updated_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className={
                    view === "compact"
                      ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
                      : "grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                  }
                >
                  {nodes.map((node) => nodeCard(node, view === "compact"))}
                </div>
              )}

              {count > 0 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.max(0, current - 1))
                    }
                    disabled={page === 0 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {page + 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={!hasMore || loading}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </section>

            <aside className="hidden min-h-0 overflow-y-auto border-l p-4 lg:block">
              {preview ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline">
                        {TYPE_LABELS[preview.node_type]}
                      </Badge>
                      <h3 className="mt-3 font-cinzel text-xl font-semibold">
                        {preview.title}
                      </h3>
                    </div>
                    {favoriteIds.has(preview.id) && (
                      <Star className="h-4 w-4 fill-primary text-primary" />
                    )}
                  </div>
                  {preview.summary && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {preview.summary}
                    </p>
                  )}
                  <div className="mt-4 max-h-[55vh] overflow-y-auto border-t pt-1 text-sm">
                    <SafeMarkdown
                      markdown={preview.content_markdown}
                      previews={{}}
                      onOpenNode={() => undefined}
                      onCreateMissing={() => undefined}
                    />
                  </div>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => {
                      onOpenNode(preview);
                      onOpenChange(false);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir página
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Selecione um item para visualizar.
                </p>
              )}
            </aside>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel">
              Templates de página
            </DialogTitle>
            <DialogDescription>
              Defaults por tipo, propriedades e relações sugeridas. Campos não
              listados continuam opcionais.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            {canManageTemplates && (
              <Button size="sm" onClick={() => openTemplateEditor()}>
                <Plus className="h-4 w-4" />
                Novo template
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{template.name}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {TYPE_LABELS[template.node_type]}
                      {template.is_default ? " · inicial" : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {template.required_fields.length} obrigatório(s)
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
                  {template.description || "Sem descrição."}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setTemplateToUse(template);
                      setTemplateNodeTitle("");
                      setTemplateUseOpen(true);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Usar
                  </Button>
                  {canManageTemplates && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTemplateEditor(template)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void duplicateTemplate(template)}
                        aria-label="Duplicar template"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void deleteTemplate(template)}
                        aria-label="Arquivar template"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateEditorOpen} onOpenChange={setTemplateEditorOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel">
              {editingTemplate ? "Editar template" : "Novo template"}
            </DialogTitle>
            <DialogDescription>
              Defina apenas os campos úteis ao tipo. Relações sugeridas não são
              criadas automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                maxLength={120}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={templateType}
                onValueChange={(value) =>
                  setTemplateType(value as KnowledgeNodeType)
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
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={templateDescription}
                onChange={(event) => setTemplateDescription(event.target.value)}
                rows={2}
                maxLength={600}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Ícone</Label>
              <Input
                value={templateIcon}
                onChange={(event) => setTemplateIcon(event.target.value)}
                placeholder="route"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Campos obrigatórios</Label>
              <Input
                value={templateRequired}
                onChange={(event) => setTemplateRequired(event.target.value)}
                placeholder="status, prioridade"
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Conteúdo inicial em Markdown</Label>
              <Textarea
                value={templateContent}
                onChange={(event) => setTemplateContent(event.target.value)}
                rows={9}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label>Propriedades (JSON)</Label>
              <Textarea
                value={templateProperties}
                onChange={(event) => setTemplateProperties(event.target.value)}
                rows={7}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label>Relações sugeridas (JSON)</Label>
              <Textarea
                value={templateRelations}
                onChange={(event) => setTemplateRelations(event.target.value)}
                rows={7}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateEditorOpen(false)}
              disabled={actionBusy}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void saveTemplate()}
              disabled={actionBusy || !templateName.trim()}
            >
              {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateUseOpen} onOpenChange={setTemplateUseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cinzel">
              Criar pelo template
            </DialogTitle>
            <DialogDescription>
              {templateToUse?.name} ·{" "}
              {templateToUse ? TYPE_LABELS[templateToUse.node_type] : "Página"}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Título da página</Label>
            <Input
              value={templateNodeTitle}
              onChange={(event) => setTemplateNodeTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void createFromTemplate();
              }}
              autoFocus
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateUseOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void createFromTemplate()}
              disabled={actionBusy || !templateNodeTitle.trim()}
            >
              {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sheetDialogOpen} onOpenChange={setSheetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-cinzel">Vincular à ficha</DialogTitle>
            <DialogDescription>
              Cria uma referência com origem rastreável; a ficha não é reescrita
              nem recebe uma cópia silenciosa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Ficha</Label>
              <Select value={sheetId} onValueChange={setSheetId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((sheet) => (
                    <SelectItem key={sheet.id} value={sheet.id}>
                      {sheet.name} · {sheet.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destino lógico</Label>
              <Select
                value={sheetSlot}
                onValueChange={(value) =>
                  setSheetSlot(value as KnowledgeSheetSlot)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SLOT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSheetDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void runSheetLink()}
              disabled={!sheetId || actionBusy}
            >
              {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Vincular {selectedNodes.length} item(ns)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
