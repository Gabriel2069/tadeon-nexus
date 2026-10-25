import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/components/brand-mark";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useId, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type LifeCycleTrait, type LinkState, genId } from "@/lib/sheet-types";
import { ChevronDown, Link2, Plus, Trash } from "lucide-react";

import { type SheetData, type SheetUpdate } from "./sheet-model";
import { Field, Section } from "./sheet-ui";

const LIFE_CYCLE_TRAITS: LifeCycleTrait[] = [
  "Formação recente",
  "Corpo habituado",
  "Nome reconhecido",
  "Experiência acumulada",
  "Responsabilidades",
  "Cicatriz antiga",
];
const LINK_STATES: LinkState[] = ["Presente", "Tensionado", "Ferido", "Rompido", "Costurado"];

export function SheetIdentitySection({
  sheet,
  canEdit,
  update,
}: {
  sheet: SheetData;
  canEdit: boolean;
  update: SheetUpdate;
}) {
  const [linksOpen, setLinksOpen] = useState(true);
  const linksId = useId();
  const narrativeId = useId();
  const [compact, setCompact] = useState(false);
  const [narrativeChoice, setNarrativeOpen] = useState<boolean>();
  const narrativeOpen = narrativeChoice ?? !compact;
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 767px)");
    if (!media) return;
    const updateCompact = () => setCompact(media.matches);
    updateCompact();
    media.addEventListener("change", updateCompact);
    return () => media.removeEventListener("change", updateCompact);
  }, []);
  return (
    <Section id="sec-info" title="Identidade" className="tadeon-identity-section">
      <div className="tadeon-identity-lead">
        <div className="tadeon-identity-sigil" aria-hidden="true">
          <BrandMark />
        </div>
        <div className="min-w-0 flex-1">
          <p className="tadeon-eyebrow">Dossiê de continuidade</p>
          <p className="tadeon-identity-lead__detail">
            Origem, marcas e relações que dão forma à personagem.
          </p>
        </div>
        <div className="tadeon-identity-link-count">
          <Link2 aria-hidden="true" />
          <span>{sheet.identity_data.links.length}</span>
          <small>vínculos</small>
        </div>
      </div>

      <div className="tadeon-identity-foundation">
        <Field
          className="tadeon-identity-field--name"
          multiline
          label="Nome"
          value={sheet.name}
          onChange={(v) => update("name", v)}
          disabled={!canEdit}
        />
        <Field
          className="tadeon-identity-field--occupation"
          multiline
          label="Ocupação"
          value={sheet.occupation}
          onChange={(v) => update("occupation", v)}
          disabled={!canEdit}
        />
        <Field
          multiline
          label="Origem"
          value={sheet.origin}
          onChange={(v) => update("origin", v)}
          disabled={!canEdit}
        />
        <Field
          multiline
          label="Marca"
          value={sheet.brand}
          onChange={(v) => update("brand", v)}
          disabled={!canEdit}
        />
      </div>

      <div className="tadeon-identity-register">
        <Collapsible
          open={narrativeOpen}
          onOpenChange={setNarrativeOpen}
          className="tadeon-identity-narrative"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="tadeon-identity-narrative__trigger"
              data-sheet-fold-trigger=""
              aria-controls={narrativeId}
            >
              <span>
                Convicções e pergunta <small>O que move esta personagem</small>
              </span>
              <span className="tadeon-sheet-fold-chevron">
                <ChevronDown aria-hidden="true" />
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent id={narrativeId}>
            <div className="tadeon-identity-axis" aria-label="Núcleo narrativo">
              <Field
                className="tadeon-identity-axis__field"
                multiline
                label="Convicção"
                value={sheet.identity_data.conviction}
                onChange={(value) =>
                  update("identity_data", {
                    ...sheet.identity_data,
                    conviction: value,
                  })
                }
                disabled={!canEdit}
              />
              <Field
                className="tadeon-identity-axis__field"
                multiline
                label="Limite"
                value={sheet.identity_data.limit}
                onChange={(value) =>
                  update("identity_data", {
                    ...sheet.identity_data,
                    limit: value,
                  })
                }
                disabled={!canEdit}
              />
              <Field
                className="tadeon-identity-axis__field"
                multiline
                label="Ferida"
                value={sheet.identity_data.wound}
                onChange={(value) =>
                  update("identity_data", {
                    ...sheet.identity_data,
                    wound: value,
                  })
                }
                disabled={!canEdit}
              />
            </div>

            <div className="tadeon-identity-details">
              <div className="tadeon-identity-question-panel">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider">
                    Traço do ciclo de vida
                  </Label>
                  <Select
                    value={sheet.identity_data.lifeCycleTrait || undefined}
                    disabled={!canEdit}
                    onValueChange={(value) =>
                      update("identity_data", {
                        ...sheet.identity_data,
                        lifeCycleTrait: value as LifeCycleTrait,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1" aria-label="Traço do ciclo de vida">
                      <SelectValue placeholder="Escolha um traço" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIFE_CYCLE_TRAITS.map((trait) => (
                        <SelectItem key={trait} value={trait}>
                          {trait}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider">Pergunta</Label>
                  <Textarea
                    aria-label="Pergunta da personagem"
                    rows={3}
                    disabled={!canEdit}
                    value={sheet.identity_data.question}
                    onChange={(event) =>
                      update("identity_data", {
                        ...sheet.identity_data,
                        question: event.target.value,
                      })
                    }
                    placeholder="Que pergunta ainda organiza esta personagem?"
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Collapsible open={linksOpen} onOpenChange={setLinksOpen} className="tadeon-link-panel">
          <div className="tadeon-link-panel__heading">
            <div>
              <p className="tadeon-eyebrow">Vínculos</p>
              <p className="text-xs text-muted-foreground">
                Relações que sustentam, tensionam ou transformam a personagem.
              </p>
            </div>
            <div className="tadeon-link-panel__actions">
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="tadeon-link-add gap-1.5"
                  onClick={() => {
                    setLinksOpen(true);
                    update("identity_data", {
                      ...sheet.identity_data,
                      links: [
                        ...sheet.identity_data.links,
                        {
                          id: genId(),
                          name: "",
                          relation: "",
                          state: "Presente",
                        },
                      ],
                    });
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo vínculo
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  data-sheet-fold-trigger=""
                  aria-label={`${linksOpen ? "Recolher" : "Expandir"} vínculos`}
                  aria-controls={linksId}
                >
                  <span className="tadeon-sheet-fold-chevron">
                    <ChevronDown aria-hidden="true" />
                  </span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent id={linksId}>
            <div className="tadeon-link-list">
              {sheet.identity_data.links.map((link, index) => (
                <div
                  key={link.id}
                  className="tadeon-link-row"
                  role="group"
                  aria-label={`Vínculo ${index + 1}`}
                  data-link-state={link.state}
                >
                  <span className="tadeon-link-row__number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <label className="tadeon-link-row__name">
                    <span>Nome do vínculo</span>
                    <Textarea
                      rows={1}
                      className="tadeon-dossier-field"
                      disabled={!canEdit}
                      value={link.name}
                      placeholder={`Vínculo ${index + 1}`}
                      aria-label={`Nome do vínculo ${index + 1}`}
                      onChange={(event) => {
                        const links = [...sheet.identity_data.links];
                        links[index] = {
                          ...link,
                          name: event.target.value,
                        };
                        update("identity_data", {
                          ...sheet.identity_data,
                          links,
                        });
                      }}
                    />
                  </label>
                  <label className="tadeon-link-row__relation">
                    <span>Relação</span>
                    <Textarea
                      rows={1}
                      className="tadeon-dossier-field"
                      disabled={!canEdit}
                      value={link.relation}
                      placeholder="Natureza da relação"
                      aria-label={`Relação do vínculo ${index + 1}`}
                      onChange={(event) => {
                        const links = [...sheet.identity_data.links];
                        links[index] = {
                          ...link,
                          relation: event.target.value,
                        };
                        update("identity_data", {
                          ...sheet.identity_data,
                          links,
                        });
                      }}
                    />
                  </label>
                  <label className="tadeon-link-row__status">
                    <span>Estado do vínculo</span>
                    <Select
                      value={link.state}
                      disabled={!canEdit}
                      onValueChange={(value) => {
                        const links = [...sheet.identity_data.links];
                        links[index] = {
                          ...link,
                          state: value as LinkState,
                        };
                        update("identity_data", {
                          ...sheet.identity_data,
                          links,
                        });
                      }}
                    >
                      <SelectTrigger
                        className="tadeon-link-row__state"
                        aria-label={`Estado do vínculo ${index + 1}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINK_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {canEdit && sheet.identity_data.links.length > 2 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="tadeon-link-row__remove text-muted-foreground hover:text-destructive"
                      aria-label={`Remover vínculo ${index + 1}`}
                      onClick={() =>
                        update("identity_data", {
                          ...sheet.identity_data,
                          links: sheet.identity_data.links.filter((item) => item.id !== link.id),
                        })
                      }
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Section>
  );
}
