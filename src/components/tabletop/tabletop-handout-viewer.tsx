import { Link } from "@tanstack/react-router";
import {
  BookOpenText,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Paperclip,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

function normalizedMime(attachment: TabletopParticipantHandoutAttachment) {
  return attachment.mimeType.trim().toLowerCase();
}

function canPreview(attachment: TabletopParticipantHandoutAttachment) {
  const mimeType = normalizedMime(attachment);
  return SAFE_INLINE_IMAGES.has(mimeType) || mimeType === "application/pdf";
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
  const previewable = useMemo(() => handout?.attachments.filter(canPreview) ?? [], [handout]);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  useEffect(() => {
    setActiveAssetId(previewable[0]?.assetId ?? null);
  }, [handout?.nodeId, previewable]);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    dragRef.current = null;
  }, [activeAssetId]);

  const activeAttachment =
    handout?.attachments.find((attachment) => attachment.assetId === activeAssetId) ?? null;
  const activeIsImage = Boolean(
    activeAttachment && SAFE_INLINE_IMAGES.has(normalizedMime(activeAttachment)),
  );

  const changeZoom = (delta: number) => {
    setZoom((value) => {
      const next = Math.min(4, Math.max(1, Number((value + delta).toFixed(2))));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await previewRef.current?.requestFullscreen();
    } catch {
      // O arquivo continua acessível no diálogo quando o navegador bloqueia tela cheia.
    }
  };

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
          <section ref={previewRef} className="tadeon-handout-viewer__preview" aria-live="polite">
            {activeAttachment && (
              <div className="tadeon-handout-viewer__toolbar" aria-label="Controles do arquivo">
                {activeIsImage && (
                  <>
                    <button
                      type="button"
                      onClick={() => changeZoom(-0.25)}
                      disabled={zoom <= 1}
                      aria-label="Diminuir zoom"
                      title="Diminuir zoom"
                    >
                      <ZoomOut aria-hidden="true" />
                    </button>
                    <span aria-live="polite">{Math.round(zoom * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => changeZoom(0.25)}
                      disabled={zoom >= 4}
                      aria-label="Aumentar zoom"
                      title="Aumentar zoom"
                    >
                      <ZoomIn aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((value) => (value + 90) % 360)}
                      aria-label="Girar imagem"
                      title="Girar imagem"
                    >
                      <RotateCw aria-hidden="true" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  aria-label="Alternar tela cheia"
                  title="Tela cheia"
                >
                  <Maximize2 aria-hidden="true" />
                </button>
              </div>
            )}
            {activeAttachment && activeIsImage ? (
              <figure>
                <img
                  src={activeAttachment.url}
                  alt={activeAttachment.caption || activeAttachment.name}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className={zoom > 1 ? "is-zoomed" : undefined}
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                  onPointerDown={(event) => {
                    if (zoom <= 1) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragRef.current = {
                      pointerId: event.pointerId,
                      x: event.clientX,
                      y: event.clientY,
                      panX: pan.x,
                      panY: pan.y,
                    };
                  }}
                  onPointerMove={(event) => {
                    const drag = dragRef.current;
                    if (!drag || drag.pointerId !== event.pointerId) return;
                    setPan({
                      x: drag.panX + event.clientX - drag.x,
                      y: drag.panY + event.clientY - drag.y,
                    });
                  }}
                  onPointerUp={(event) => {
                    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
                  }}
                  onPointerCancel={() => {
                    dragRef.current = null;
                  }}
                />
                {(activeAttachment.caption || activeAttachment.name) && (
                  <figcaption>{activeAttachment.caption || activeAttachment.name}</figcaption>
                )}
              </figure>
            ) : activeAttachment && normalizedMime(activeAttachment) === "application/pdf" ? (
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
              <span>
                <Paperclip aria-hidden="true" /> Arquivos
              </span>
              <small>{handout.attachments.length}</small>
            </div>
            {handout.attachments.length === 0 ? (
              <p>Este handout não possui anexos.</p>
            ) : (
              <ul>
                {handout.attachments.map((attachment) => {
                  const image = SAFE_INLINE_IMAGES.has(normalizedMime(attachment));
                  const preview = canPreview(attachment);
                  return (
                    <li
                      key={attachment.assetId}
                      className={activeAssetId === attachment.assetId ? "is-active" : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => (preview ? setActiveAssetId(attachment.assetId) : undefined)}
                        disabled={!preview}
                        aria-label={
                          preview
                            ? `Visualizar ${attachment.name}`
                            : `${attachment.name} disponível para download`
                        }
                      >
                        <span>
                          {image ? (
                            <ImageIcon aria-hidden="true" />
                          ) : (
                            <FileText aria-hidden="true" />
                          )}
                        </span>
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
