import type { ReactNode } from "react";
import { File, FileAudio, FileImage, FileText, FileVideo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NexusAsset } from "@/lib/assets/asset-service";
import { formatAssetBytes } from "@/lib/assets/file-validation";
import { TADEON_UNIFIED_DRAG_MIME, encodeTadeonUnifiedItem } from "@/lib/tabletop/tabletop-asset-flow";

function AssetTypeIcon({ mimeType }: { mimeType: string }) {
  const className = "h-9 w-9";
  if (mimeType.startsWith("image/")) return <FileImage className={className} />;
  if (mimeType.startsWith("audio/")) return <FileAudio className={className} />;
  if (mimeType.startsWith("video/")) return <FileVideo className={className} />;
  if (mimeType.startsWith("text/") || mimeType === "application/pdf") return <FileText className={className} />;
  return <File className={className} />;
}

export function AssetTile({
  asset,
  previewUrl,
  selected = false,
  onSelect,
  actions,
}: {
  asset: NexusAsset;
  previewUrl?: string;
  selected?: boolean;
  onSelect?: (asset: NexusAsset) => void;
  actions?: ReactNode;
}) {
  const selectable = Boolean(onSelect);
  const select = () => onSelect?.(asset);
  const draggable = Boolean(previewUrl || asset.mime_type);

  return (
    <article
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? selected : undefined}
      draggable={draggable}
      title={draggable ? "Arraste para a Mesa Nexus mantendo o vínculo com este asset" : undefined}
      onDragStart={(event) => {
        const entityType = asset.mime_type.startsWith("image/") ? "object" : "object";
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(
          TADEON_UNIFIED_DRAG_MIME,
          encodeTadeonUnifiedItem({
            kind: "asset",
            assetId: asset.id,
            assetUrl: previewUrl,
            label: asset.display_name,
            mimeType: asset.mime_type,
            entityType,
          }),
        );
        event.dataTransfer.setData("text/plain", asset.display_name);
      }}
      onClick={selectable ? select : undefined}
      onKeyDown={selectable ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      } : undefined}
      className={cn(
        "group relative overflow-hidden rounded-[1rem_.4rem_1rem_.4rem] border bg-card/65 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)]",
        selectable && "cursor-pointer hover:border-primary/45 active:scale-[.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        draggable && "cursor-grab active:cursor-grabbing",
        selected && "border-primary ring-1 ring-primary",
      )}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/35 text-muted-foreground">
        {previewUrl ? <img src={previewUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-[1.015]" /> : <AssetTypeIcon mimeType={asset.mime_type} />}
        <Badge variant="secondary" className="absolute left-2 top-2 bg-background/80 text-[10px] uppercase backdrop-blur">{asset.provider}</Badge>
        {actions && <div className="absolute right-2 top-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>{actions}</div>}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="truncate text-sm font-semibold" title={asset.display_name}>{asset.display_name}</h3>
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="truncate">{asset.extension}</span>
          <span>{formatAssetBytes(asset.size_bytes)}</span>
        </div>
      </div>
    </article>
  );
}
