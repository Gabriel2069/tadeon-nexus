import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSearch,
  Link2,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AssetTile } from "@/components/assets/asset-tile";
import { useAssetPreviewUrls } from "@/components/assets/asset-preview";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  assetService,
  type AssetUploadTask,
  type AssetUsageLink,
  type AssetUsageSummary,
  type NexusAsset,
  type OrphanedAssetObject,
} from "@/lib/assets/asset-service";
import { AssetServiceError } from "@/lib/assets/asset-errors";
import {
  ASSET_MIME_EXTENSIONS,
  formatAssetBytes,
} from "@/lib/assets/file-validation";
import type { AssetProvider } from "@/lib/nexus-contracts";

type MimeFilter =
  | "all"
  | "image/"
  | "audio/"
  | "video/"
  | "application/"
  | "text/";

function messageFor(error: unknown) {
  return error instanceof AssetServiceError
    ? error.message
    : "Não foi possível concluir a operação com o arquivo.";
}

function quotaPercent(summary: AssetUsageSummary) {
  if (summary.maxTotalBytes <= 0) return 0;
  return Math.min(100, (summary.activeBytes / summary.maxTotalBytes) * 100);
}

export function AssetLibraryPanel({
  campaignId,
}: {
  campaignId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTask = useRef<AssetUploadTask | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [scopeLoading, setScopeLoading] = useState(Boolean(campaignId));
  const [assets, setAssets] = useState<NexusAsset[]>([]);
  const [usage, setUsage] = useState<AssetUsageSummary[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [provider, setProvider] = useState<"all" | AssetProvider>("all");
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>("all");
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<{
    name: string;
    index: number;
    total: number;
    percent: number;
  } | null>(null);
  const [renameAsset, setRenameAsset] = useState<NexusAsset | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteAsset, setDeleteAsset] = useState<NexusAsset | null>(null);
  const [deleteUsages, setDeleteUsages] = useState<AssetUsageLink[]>([]);
  const [usageAsset, setUsageAsset] = useState<NexusAsset | null>(null);
  const [usageLinks, setUsageLinks] = useState<AssetUsageLink[]>([]);
  const [orphans, setOrphans] = useState<OrphanedAssetObject[] | null>(null);
  const [orphanLoading, setOrphanLoading] = useState(false);
  const previews = useAssetPreviewUrls(assets);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    if (!campaignId) {
      setWorkspaceId(null);
      setScopeLoading(false);
      return () => {
        active = false;
      };
    }

    setScopeLoading(true);
    void supabase
      .from("campaigns")
      .select("workspace_id")
      .eq("id", campaignId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setScopeLoading(false);
        if (error || !data?.workspace_id) {
          setWorkspaceId(null);
          toast.error("Não foi possível localizar o workspace desta campanha.");
          return;
        }
        setWorkspaceId(data.workspace_id);
      });

    return () => {
      active = false;
    };
  }, [campaignId]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [result, currentUsage] = await Promise.all([
        assetService.list({
          workspaceId,
          campaignId,
          provider: provider === "all" ? undefined : provider,
          mimePrefix: mimeFilter === "all" ? undefined : mimeFilter,
          search: debouncedSearch,
          page,
          pageSize: 12,
        }),
        assetService.getUsage(workspaceId),
      ]);
      setAssets(result.assets);
      setCount(result.count);
      setHasMore(result.hasMore);
      setUsage(currentUsage);
    } catch (error) {
      toast.error(messageFor(error));
      setAssets([]);
      setCount(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [campaignId, debouncedSearch, mimeFilter, page, provider, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      activeTask.current?.cancel();
    },
    [],
  );

  const usageByProvider = useMemo(
    () => new Map(usage.map((summary) => [summary.provider, summary])),
    [usage],
  );

  const uploadFiles = async (files: FileList | File[]) => {
    if (!workspaceId || !files.length) return;
    const queue = Array.from(files);

    for (const [index, file] of queue.entries()) {
      const task = assetService.createUploadTask({
        workspaceId,
        campaignId,
        file,
        provider: "supabase",
        onProgress: (progress) =>
          setUploading({
            name: file.name,
            index: index + 1,
            total: queue.length,
            percent: progress.percent,
          }),
      });
      activeTask.current = task;
      setUploading({
        name: file.name,
        index: index + 1,
        total: queue.length,
        percent: 0,
      });

      try {
        await task.promise;
      } catch (error) {
        if (
          error instanceof AssetServiceError &&
          error.code === "ASSET_ABORTED"
        )
          break;
        toast.error(`${file.name}: ${messageFor(error)}`);
      }
    }

    activeTask.current = null;
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
    await load();
    toast.success(
      queue.length === 1 ? "Arquivo enviado." : "Fila de arquivos concluída.",
    );
  };

  const openDownload = async (asset: NexusAsset) => {
    try {
      const url = await assetService.createTemporaryAccess(asset, 300);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const inspectUsages = async (asset: NexusAsset) => {
    try {
      const links = await assetService.listUsages(asset.id);
      setUsageAsset(asset);
      setUsageLinks(links);
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const requestDelete = async (asset: NexusAsset) => {
    try {
      setDeleteUsages(await assetService.listUsages(asset.id));
      setDeleteAsset(asset);
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleteAsset) return;
    try {
      await assetService.softDelete(deleteAsset.id, deleteUsages.length > 0);
      toast.success(
        "Arquivo excluído da biblioteca ativa. A recuperação continua disponível no catálogo.",
      );
      setDeleteAsset(null);
      setDeleteUsages([]);
      await load();
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const confirmRename = async () => {
    if (!renameAsset) return;
    try {
      await assetService.rename(renameAsset.id, renameValue);
      setRenameAsset(null);
      setRenameValue("");
      toast.success("Nome atualizado.");
      await load();
    } catch (error) {
      toast.error(messageFor(error));
    }
  };

  const findOrphans = async () => {
    if (!workspaceId) return;
    setOrphanLoading(true);
    try {
      setOrphans(await assetService.findSupabaseOrphans(workspaceId));
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setOrphanLoading(false);
    }
  };

  if (scopeLoading) {
    return (
      <Card className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </Card>
    );
  }

  if (!campaignId || !workspaceId) {
    return (
      <Card className="p-8 text-center">
        <FileSearch className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-3 font-cinzel text-xl">
          Campanha sem workspace ativo
        </h2>
        <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
          Associe as configurações globais a uma campanha antes de ativar o
          Nexus Assets.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <section className="tadeon-surface relative overflow-hidden rounded-2xl p-5 md:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="tadeon-eyebrow">Nexus Assets</p>
            <h2 className="font-cinzel text-2xl font-semibold md:text-3xl">
              Biblioteca da campanha
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Arquivos privados, reutilizáveis e rastreados sem guardar binários
              no banco.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void findOrphans()}
              disabled={orphanLoading}
            >
              {orphanLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSearch className="h-4 w-4" />
              )}
              Verificar órfãos
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="sr-only"
              accept={Object.keys(ASSET_MIME_EXTENSIONS).join(",")}
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files);
              }}
            />
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={Boolean(uploading)}
            >
              <Upload className="h-4 w-4" />
              Enviar arquivos
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {(["supabase", "r2"] as const).map((itemProvider) => {
          const summary = usageByProvider.get(itemProvider);
          const activeBytes = summary?.activeBytes ?? 0;
          const maxBytes = summary?.maxTotalBytes ?? 0;
          return (
            <Card key={itemProvider} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider">
                    {itemProvider === "supabase"
                      ? "Supabase Storage"
                      : "Cloudflare R2"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatAssetBytes(activeBytes)} de{" "}
                    {formatAssetBytes(maxBytes)}
                  </p>
                </div>
                <Badge
                  variant={itemProvider === "r2" ? "outline" : "secondary"}
                >
                  {itemProvider === "r2" ? "preparado" : "ativo"}
                </Badge>
              </div>
              <Progress value={summary ? quotaPercent(summary) : 0} />
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                {summary?.activeFileCount ?? 0} arquivos ativos
              </p>
            </Card>
          );
        })}
      </section>

      {uploading && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <div className="min-w-0">
              <p className="truncate font-medium">{uploading.name}</p>
              <p className="text-muted-foreground">
                Arquivo {uploading.index} de {uploading.total}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeTask.current?.cancel()}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
          <Progress value={uploading.percent} />
        </Card>
      )}

      <section>
        <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Buscar arquivo…"
              aria-label="Buscar arquivos"
            />
          </div>
          <Select
            value={mimeFilter}
            onValueChange={(value) => {
              setMimeFilter(value as MimeFilter);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Filtrar por formato">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os formatos</SelectItem>
              <SelectItem value="image/">Imagens</SelectItem>
              <SelectItem value="application/">Documentos</SelectItem>
              <SelectItem value="text/">Textos</SelectItem>
              <SelectItem value="audio/">Áudios</SelectItem>
              <SelectItem value="video/">Vídeos</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={provider}
            onValueChange={(value) => {
              setProvider(value as "all" | AssetProvider);
              setPage(0);
            }}
          >
            <SelectTrigger aria-label="Filtrar por provedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os provedores</SelectItem>
              <SelectItem value="supabase">Supabase</SelectItem>
              <SelectItem value="r2">Cloudflare R2</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Atualizar
          </Button>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{count} arquivos encontrados</span>
          <span>Página {page + 1}</span>
        </div>

        {loading ? (
          <Card className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </Card>
        ) : assets.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetTile
                key={asset.id}
                asset={asset}
                previewUrl={previews[asset.id]}
                actions={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 bg-background/85 backdrop-blur"
                        aria-label={`Ações de ${asset.display_name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => void openDownload(asset)}
                      >
                        <Download className="h-4 w-4" />
                        Abrir temporariamente
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => void inspectUsages(asset)}
                      >
                        <Link2 className="h-4 w-4" />
                        Ver utilizações
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setRenameAsset(asset);
                          setRenameValue(asset.display_name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Renomear
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => void requestDelete(asset)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir arquivo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}
          </div>
        ) : (
          <Card className="flex min-h-72 flex-col items-center justify-center border-dashed text-center">
            <FileSearch className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-cinzel text-lg">
              Nenhum arquivo neste recorte.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste os filtros ou envie o primeiro arquivo.
            </p>
          </Card>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <Dialog
        open={Boolean(renameAsset)}
        onOpenChange={(open) => {
          if (!open) setRenameAsset(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear arquivo</DialogTitle>
            <DialogDescription>
              O nome interno e o objeto armazenado não serão alterados.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            maxLength={255}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameAsset(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmRename()}
              disabled={!renameValue.trim()}
            >
              Salvar nome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(usageAsset)}
        onOpenChange={(open) => {
          if (!open) setUsageAsset(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utilizações de {usageAsset?.display_name}</DialogTitle>
            <DialogDescription>
              Vínculos registrados no catálogo unificado.
            </DialogDescription>
          </DialogHeader>
          {usageLinks.length ? (
            <div className="space-y-2">
              {usageLinks.map((link) => (
                <div key={link.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{link.entity_type}</span>
                    <Badge variant="outline">{link.role}</Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                    {link.entity_id}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Este arquivo ainda não possui vínculos.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={orphans !== null}
        onOpenChange={(open) => !open && setOrphans(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Objetos sem registro</DialogTitle>
            <DialogDescription>
              Objetos encontrados no bucket privado que não aparecem no
              catálogo.
            </DialogDescription>
          </DialogHeader>
          {orphans?.length ? (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {orphans.map((orphan) => (
                <div key={orphan.objectKey} className="rounded-lg border p-3">
                  <p className="truncate font-mono text-xs">
                    {orphan.objectKey}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {orphan.sizeBytes === null
                      ? "Tamanho indisponível"
                      : formatAssetBytes(orphan.sizeBytes)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum objeto órfão foi encontrado.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteAsset)}
        onOpenChange={(open) => {
          if (!open) setDeleteAsset(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {deleteAsset?.display_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUsages.length
                ? `O arquivo possui ${deleteUsages.length} vínculo(s). A confirmação preservará o histórico e o binário para recuperação.`
                : "O arquivo sairá da biblioteca ativa, mas continuará recuperável."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
