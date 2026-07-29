import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AssetTile } from "@/components/assets/asset-tile";
import { useAssetPreviewUrls } from "@/components/assets/asset-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  assetService,
  type AssetUploadTask,
  type NexusAsset,
} from "@/lib/assets/asset-service";
import { AssetServiceError } from "@/lib/assets/asset-errors";
import { ASSET_MIME_EXTENSIONS } from "@/lib/assets/file-validation";

function messageFor(error: unknown) {
  return error instanceof AssetServiceError
    ? error.message
    : "Não foi possível concluir a operação com o arquivo.";
}

export function AssetPickerDialog({
  open,
  onOpenChange,
  workspaceId,
  campaignId,
  selectedAssetId,
  onSelect,
  allowUpload = true,
  mimePrefix,
  title = "Selecionar arquivo",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  campaignId?: string | null;
  selectedAssetId?: string | null;
  onSelect: (asset: NexusAsset) => void;
  allowUpload?: boolean;
  mimePrefix?: string;
  title?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTask = useRef<AssetUploadTask | null>(null);
  const [assets, setAssets] = useState<NexusAsset[]>([]);
  const [selected, setSelected] = useState<NexusAsset | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<{
    name: string;
    percent: number;
  } | null>(null);
  const previews = useAssetPreviewUrls(assets);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await assetService.list({
        workspaceId,
        campaignId,
        search,
        mimePrefix,
        page,
        pageSize: 12,
      });
      setAssets(result.assets);
      setHasMore(result.hasMore);
      setSelected((current) => {
        const wantedId = current?.id ?? selectedAssetId;
        return (
          result.assets.find((asset) => asset.id === wantedId) ??
          current ??
          null
        );
      });
    } catch (error) {
      toast.error(messageFor(error));
      setAssets([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [campaignId, mimePrefix, page, search, selectedAssetId, workspaceId]);

  useEffect(() => {
    if (!open) {
      activeTask.current?.cancel();
      activeTask.current = null;
      setUploading(null);
      return;
    }
    void load();
  }, [load, open]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const task = assetService.createUploadTask({
      workspaceId,
      campaignId,
      file,
      onProgress: (progress) =>
        setUploading({ name: file.name, percent: progress.percent }),
    });
    activeTask.current = task;
    setUploading({ name: file.name, percent: 0 });

    try {
      const asset = await task.promise;
      setSelected(asset);
      setPage(0);
      await load();
      toast.success("Arquivo enviado e selecionado.");
    } catch (error) {
      if (
        !(error instanceof AssetServiceError) ||
        error.code !== "ASSET_ABORTED"
      ) {
        toast.error(messageFor(error));
      }
    } finally {
      activeTask.current = null;
      setUploading(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-cinzel">{title}</DialogTitle>
          <DialogDescription>
            Escolha um arquivo já registrado no Nexus Assets ou envie um novo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                className="pl-9"
                placeholder="Buscar por nome…"
                aria-label="Buscar arquivos"
              />
            </div>
            {allowUpload && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  accept={Object.keys(ASSET_MIME_EXTENSIONS).join(",")}
                  onChange={(event) => void upload(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  disabled={Boolean(uploading)}
                >
                  <Upload className="h-4 w-4" />
                  Enviar arquivo
                </Button>
              </>
            )}
          </div>

          {uploading && (
            <div className="rounded-xl border bg-muted/25 p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="truncate">{uploading.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => activeTask.current?.cancel()}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </div>
              <Progress value={uploading.percent} />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex min-h-64 items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : assets.length ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {assets.map((asset) => (
                  <AssetTile
                    key={asset.id}
                    asset={asset}
                    previewUrl={previews[asset.id]}
                    selected={selected?.id === asset.id}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                <p className="font-cinzel text-lg">
                  Nenhum arquivo encontrado.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste a busca ou envie o primeiro arquivo.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page + 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasMore || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onSelect(selected);
              onOpenChange(false);
            }}
          >
            Usar arquivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
