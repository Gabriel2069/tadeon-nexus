import { useState, type CSSProperties } from "react";
import {
  Activity,
  BookOpenText,
  ExternalLink,
  EyeOff,
  FileSearch,
  Layers3,
  Loader2,
  Lock,
  Maximize2,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TabletopParticipantHandout } from "@/lib/tabletop/tabletop-participant-service";
import type { TabletopSheetSummary } from "@/lib/tabletop/tabletop-entity-insight";
import type { TabletopEntity } from "@/lib/tabletop/types";
import "@/styles/tabletop-entity-dossier.css";

const ENTITY_LABELS: Record<TabletopEntity["type"], string> = {
  token: "Token",
  creature: "Criatura",
  npc: "NPC",
  character: "Personagem",
  object: "Objeto",
  tile: "Elemento de cenário",
  drawing: "Desenho",
  text: "Texto",
  marker: "Marcador",
  note: "Nota",
  area: "Área",
  light: "Luz",
  handout_pin: "Handout",
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown, max = 400) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, max = 12) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, max)
    : [];
}

function resourceLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function TabletopEntityDossier({
  entity,
  sheetSummary,
  handout,
  loading = false,
  open,
  onOpenChange,
  onOpenHandout,
}: {
  entity: TabletopEntity | null;
  sheetSummary?: TabletopSheetSummary | null;
  handout?: TabletopParticipantHandout | null;
  loading?: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenHandout?: (handout: TabletopParticipantHandout) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  if (!entity) return null;
  const properties = objectValue(entity.properties);
  const status = textValue(properties.status, 80);
  const notes = textValue(properties.notes, 700);
  const icons = stringList(properties.icons, 4);
  const visualConditions = stringList(properties.visual_conditions, 20);
  const barCurrent = Number(properties.bar_current) || 0;
  const barMax = Math.max(0, Number(properties.bar_max) || 0);
  const barPercent =
    barMax > 0 ? Math.max(0, Math.min(100, (barCurrent / barMax) * 100)) : 0;
  const identity = sheetSummary
    ? [sheetSummary.occupation, sheetSummary.brand, sheetSummary.origin]
        .filter(Boolean)
        .join(" · ")
    : "";
  const accent = `#${entity.color.toString(16).padStart(6, "0")}`;
  const sheetId = sheetSummary?.sheetId ?? entity.linkedSheetId ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="tadeon-entity-dossier max-h-[92dvh] max-w-[min(94vw,980px)] overflow-hidden border-0 p-0"
          style={{ "--dossier-accent": accent } as CSSProperties}
        >
          <div className="tadeon-entity-dossier__aura" aria-hidden="true" />
          <div className="tadeon-entity-dossier__layout">
            <section className="tadeon-entity-dossier__visual">
              {entity.assetUrl ? (
                <img src={entity.assetUrl} alt={entity.label} />
              ) : (
                <div className="tadeon-entity-dossier__placeholder">
                  <FileSearch aria-hidden="true" />
                  <span>Sem imagem vinculada</span>
                </div>
              )}
              <div className="tadeon-entity-dossier__visual-shade" />
              <div className="tadeon-entity-dossier__visual-meta">
                <span>{ENTITY_LABELS[entity.type]}</span>
                <div>
                  {entity.hidden && <EyeOff aria-label="Oculto" />}
                  {entity.locked && <Lock aria-label="Bloqueado" />}
                  <span>
                    <Layers3 aria-hidden="true" /> {entity.elevation ?? 0}
                  </span>
                </div>
              </div>
            </section>

            <section className="tadeon-entity-dossier__content">
              <DialogHeader className="text-left">
                <span className="tadeon-entity-dossier__eyebrow">
                  <Sparkles aria-hidden="true" /> Cartão da Mesa
                </span>
                <DialogTitle>{sheetSummary?.name || entity.label}</DialogTitle>
                <DialogDescription>{identity || entity.label}</DialogDescription>
              </DialogHeader>

              {loading && (
                <div className="tadeon-entity-dossier__loading" role="status">
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Sincronizando a ficha vinculada…
                </div>
              )}

              {sheetSummary && (
                <div className="tadeon-entity-dossier__sheet">
                  <div className="tadeon-entity-dossier__resources">
                    {Object.entries(sheetSummary.resources).map(([key, value]) => (
                      <div key={key} data-resource={key}>
                        <small>{key.toUpperCase()}</small>
                        <strong>{resourceLabel(value)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="tadeon-entity-dossier__indices">
                    <span>
                      <Shield aria-hidden="true" /> Equilíbrio
                      <strong>{resourceLabel(sheetSummary.equilibrium)}</strong>
                    </span>
                    <span>
                      <Activity aria-hidden="true" /> Exposição
                      <strong>{resourceLabel(sheetSummary.exposure)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {(status || sheetSummary?.condition) && (
                <div className="tadeon-entity-dossier__status">
                  <small>Estado atual</small>
                  <strong>{sheetSummary?.condition || status}</strong>
                </div>
              )}

              {barMax > 0 && (
                <div className="tadeon-entity-dossier__bar">
                  <div>
                    <span>Recurso visual</span>
                    <strong>{barCurrent} / {barMax}</strong>
                  </div>
                  <span><i style={{ width: `${barPercent}%` }} /></span>
                </div>
              )}

              {(visualConditions.length > 0 || sheetSummary?.activeConditions.length) && (
                <div className="tadeon-entity-dossier__conditions">
                  {[...new Set([...visualConditions, ...(sheetSummary?.activeConditions ?? [])])].map(
                    (condition) => <span key={condition}>{condition}</span>,
                  )}
                </div>
              )}

              {icons.length > 0 && (
                <div className="tadeon-entity-dossier__icons">
                  {icons.map((icon) => <span key={icon}>{icon}</span>)}
                </div>
              )}

              {handout?.summary && <blockquote>{handout.summary}</blockquote>}
              {notes && <p className="tadeon-entity-dossier__notes">{notes}</p>}

              <div className="tadeon-entity-dossier__actions">
                {handout && onOpenHandout && (
                  <Button onClick={() => onOpenHandout(handout)}>
                    <BookOpenText aria-hidden="true" />
                    Abrir arquivo / handout
                  </Button>
                )}
                {sheetId && (
                  <Button variant="outline" onClick={() => setSheetOpen(true)}>
                    <Maximize2 aria-hidden="true" /> Ampliar ficha na Mesa
                  </Button>
                )}
                {sheetId && (
                  <Button variant="ghost" asChild>
                    <a href={`/sheet/${sheetId}`} target="_blank" rel="noreferrer">
                      <ExternalLink aria-hidden="true" /> Nova janela
                    </a>
                  </Button>
                )}
                {entity.linkedKnowledgeNodeId && (
                  <Button variant="outline" asChild>
                    <a href={`/nexus?node=${encodeURIComponent(entity.linkedKnowledgeNodeId)}`}>
                      <ExternalLink aria-hidden="true" /> Abrir no Nexus
                    </a>
                  </Button>
                )}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {sheetId && (
        <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
          <DialogContent className="tadeon-tabletop-sheet-dialog h-[min(94dvh,980px)] w-[min(96dvw,1440px)] max-w-none overflow-hidden p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Ficha ampliada de {sheetSummary?.name || entity.label}</DialogTitle>
              <DialogDescription>
                A mesma ficha vinculada ao token, aberta em versão de jogo dentro da Mesa.
              </DialogDescription>
            </DialogHeader>
            <iframe
              className="tadeon-tabletop-sheet-frame"
              src={`/sheet/${sheetId}?embed=1&mode=game`}
              title={`Ficha de ${sheetSummary?.name || entity.label}`}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
