import { Link } from "@tanstack/react-router";
import {
  BookOpenText,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Paperclip,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  TabletopParticipantHandout,
  TabletopParticipantHandoutAttachment,
} from "@/lib/tabletop/tabletop-participant-service";

const SAFE_INLINE_IMAGES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function canPreview(attachment: TabletopParticipantHandoutAttachment) {
  return SAFE_INLINE_IMAGES.has(attachment.mimeType) ||
    attachment.mimeType === "application/pdf";
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function downloadUrl(attachment: TabletopParticipantHandoutAttachment) {
  const separator = attachment.url.includes("?") ? "&" : "?";
  return `${attachment.url}${separator}download=${encodeURIComponent(attachment.name)}`;
}

export function TabletopHandoutViewer({
  handout,
  open,
  onOpenChange,
}: {
  handout: TabletopParticipantHandout | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const previewable = useMemo(
    () => handout?.attachments.filter(canPreview) ?? [],
    [handout],
  );
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  useEffect(() => {
    setActiveAssetId(previewable[0]?.assetId ?? null);
  }, [handout?.nodeId, previewable]);

  const activeAttachment =
    handout?.attachments.find((attachment) => attachment.assetId === activeAssetId) ??
    null;

  if (!handout) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tadeon-handout-viewer">
        <DialogHeader className="tadeon-handout-viewer__header">
          <span className="tadeon-handout-viewer__eyebrow">
            <BookOpenText aria-hidden="true" /> Handout autorizado
          </span>
          <DialogTitle>{handout.title}</DialogTitle>
          <DialogDescription>
            {handout.summary || "Material compartilhado pelo mestre para esta cena."}
          </DialogDescription>
        </DialogHeader>

        <div className="tadeon-handout-viewer__layout">
          <section className="tadeon-handout-viewer__preview" aria-live="polite">
            {activeAttachment && SAFE_INLINE_IMAGES.has(activeAttachment.mimeType) ? (
              <figure>
                <img
                  src={activeAttachment.url}
                  alt={activeAttachment.caption || activeAttachment.name}
                  referrerPolicy="no-referrer"
                />
                {(activeAttachment.caption || activeAttachment.name) && (
                  <figcaption>
                    {activeAttachment.caption || activeAttachment.name}
                  </figcaption>
                )}
              </figure>
            ) : activeAttachment?.mimeType === "application/pdf" ? (
              <iframe
                src={activeAttachment.url}
                title={`Visualização de ${activeAttachment.name}`}
                referrerPolicy="no-referrer"
              />
            ) : handout.coverUrl ? (
              <figure>
                <img
                  src={handout.coverUrl}
                  alt={`Capa de ${handout.title}`}
                  referrerPolicy="no-referrer"
                />
              </figure>
            ) : (
              <div className="tadeon-handout-viewer__placeholder">
                <FileText aria-hidden="true" />
                <strong>Documento do Nexus</strong>
                <span>Selecione um anexo para visualizar.</span>
              </div>
            )}
          </section>

          <aside className="tadeon-handout-viewer__assets" aria-label="Arquivos do handout">
            <div>
              <span><Paperclip aria-hidden="true" /> Arquivos</span>
              <small>{handout.attachments.length}</small>
            </div>
            {handout.attachments.length === 0 ? (
              <p>Este handout não possui anexos.</p>
            ) : (
              <ul>
                {handout.attachments.map((attachment) => {
                  const image = SAFE_INLINE_IMAGES.has(attachment.mimeType);
                  const preview = canPreview(attachment);
                  return (
                    <li
                      key={attachment.assetId}
                      className={activeAssetId === attachment.assetId ? "is-active" : undefined}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          preview
                            ? setActiveAssetId(attachment.assetId)
                            : undefined
                        }
                        disabled={!preview}
                        aria-label={
                          preview
                            ? `Visualizar ${attachment.name}`
                            : `${attachment.name} disponível para download`
                        }
                      >
                        <span>{image ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}</span>
                        <span>
                          <strong>{attachment.name}</strong>
                          <small>{formatBytes(attachment.sizeBytes)}</small>
                        </span>
                      </button>
                      <a
                        href={downloadUrl(attachment)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Baixar ${attachment.name}`}
                      >
                        <Download aria-hidden="true" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>

        <footer className="tadeon-handout-viewer__footer">
          {activeAttachment && (
            <a
              href={activeAttachment.url}
              target="_blank"
              rel="noreferrer"
              className="tadeon-handout-viewer__external"
            >
              Abrir arquivo <ExternalLink aria-hidden="true" />
            </a>
          )}
          <Button asChild>
            <Link to="/nexus" search={{ node: handout.nodeId }}>
              Ver página completa no Nexus
            </Link>
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
