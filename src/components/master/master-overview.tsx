import { campaignSheetReading } from "@/lib/master-sheet-reading";
import { useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CircleDot,
  Gauge,
  Map,
  Pin,
  Radio,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaterialSurface } from "@/components/material-surface";
import { FabricFilaments } from "@/components/fabric-filaments";
import type { MasterSheetOverview } from "./master-hub";
import type { MasterTab } from "./master-panel-navigation";
import type {
  MasterClue,
  MasterFold,
  MasterInterlude,
  MasterNpc,
  MasterScene,
  MasterThreat,
} from "@/lib/master-data";

/** Overview uses the route's draft; it owns only search and progressive display. */
export function DashboardHub({
  campaignTitle,
  campaignPhase,
  scenes,
  npcs,
  clues,
  threats,
  interludes,
  folds,
  sheets,
  onCampaignTitle,
  onCampaignPhase,
  onNavigate,
  onOpenSheet,
}: {
  campaignTitle: string;
  campaignPhase: string;
  scenes: MasterScene[];
  npcs: MasterNpc[];
  clues: MasterClue[];
  threats: MasterThreat[];
  interludes: MasterInterlude[];
  folds: MasterFold[];
  sheets: MasterSheetOverview[];
  onCampaignTitle: (value: string) => void;
  onCampaignPhase: (value: string) => void;
  onNavigate: (tab: MasterTab) => void;
  onOpenSheet: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(6);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const filtered = sheets.filter((sheet) =>
    normalize(sheet.name || "Sem nome").includes(normalize(query.trim())),
  );
  const openScenes = scenes.filter((scene) => scene.status !== "Concluída");
  const activeScenes = scenes.filter((scene) => scene.status === "Em curso");
  const metrics = [
    {
      label: "Cenas em curso",
      value: activeScenes.length,
      detail: `${scenes.length} no roteiro`,
      icon: Map,
      tab: "scenes",
    },
    {
      label: "Pistas ocultas",
      value: clues.filter((clue) => !clue.discovered).length,
      detail: `${clues.length} no arquivo`,
      icon: BrainCircuit,
      tab: "investigation",
    },
    {
      label: "Ameaças",
      value: threats.length,
      detail: "Consultar o repertório",
      icon: ShieldAlert,
      tab: "threats",
    },
    {
      label: "Dobras abertas",
      value: folds.filter((fold) => !fold.sealed).length,
      detail: `${folds.length} registradas`,
      icon: CircleDot,
      tab: "folds",
    },
    {
      label: "Personagens",
      value: sheets.length,
      detail: "Abrir leitura conjunta",
      icon: Users,
      tab: "pinned",
    },
    {
      label: "Desenvolvimento médio",
      value: sheets.some((sheet) => sheet.rules_version === 2)
        ? `${Math.round(sheets.filter((sheet) => sheet.rules_version === 2).reduce((sum, sheet) => sum + sheet.exposure, 0) / sheets.filter((sheet) => sheet.rules_version === 2).length)}%`
        : "Em revisão",
      detail: "Avaliar o encontro",
      icon: Gauge,
      tab: "balance",
    },
  ] as const;
  return (
    <div className="tadeon-master-overview">
      <MaterialSurface
        as="section"
        className="tadeon-master-overview__campaign"
        aria-label="Central da campanha"
      >
        <FabricFilaments className="tadeon-master-overview__fabric" />
        <div className="tadeon-master-overview__campaign-fields">
          <div>
            <Label htmlFor="master-campaign-title">Campanha</Label>
            <Input
              id="master-campaign-title"
              value={campaignTitle}
              onChange={(event) => onCampaignTitle(event.target.value)}
              placeholder="Nome da campanha"
            />
          </div>
          <div>
            <Label htmlFor="master-campaign-phase">Fase / objetivo atual</Label>
            <Input
              id="master-campaign-phase"
              value={campaignPhase}
              onChange={(event) => onCampaignPhase(event.target.value)}
              placeholder="O que move a próxima sessão?"
            />
          </div>
        </div>
        <div className="tadeon-master-overview__resume">
          <p>
            <span className="tadeon-eyebrow">À frente da trama</span>
            {activeScenes.length
              ? `${activeScenes.length} cena(s) em curso para retomar.`
              : "Prepare o próximo movimento da campanha."}
          </p>
          <Button onClick={() => onNavigate("session")}>
            <Radio aria-hidden="true" />
            Abrir sessão
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </MaterialSurface>

      <section aria-label="Estado da campanha" className="tadeon-master-overview__metrics">
        {metrics.map(({ label, value, detail, icon: Icon, tab }) => (
          <Button
            key={label}
            variant="outline"
            className="tadeon-master-overview__metric"
            onClick={() => onNavigate(tab)}
            aria-label={`${label}: ${value}. ${detail}`}
          >
            <span className="tadeon-master-overview__metric-label">
              <Icon aria-hidden="true" />
              {label}
            </span>
            <strong>{value}</strong>
            <span className="tadeon-master-overview__metric-detail">
              {detail}
              <ArrowRight aria-hidden="true" />
            </span>
          </Button>
        ))}
      </section>

      <div className="tadeon-master-overview__columns">
        <MaterialSurface
          as="section"
          className="tadeon-master-overview__panel"
          aria-labelledby="master-roster-heading"
        >
          <div className="tadeon-master-overview__section-head">
            <div>
              <p className="tadeon-eyebrow">Elenco da campanha</p>
              <h2 id="master-roster-heading">Personagens em perspectiva</h2>
              <p>Recursos atuais, exposição e equilíbrio.</p>
            </div>
            <Button variant="outline" onClick={() => onNavigate("pinned")}>
              <Pin aria-hidden="true" />
              Comparar fichas
            </Button>
          </div>
          {sheets.length > 0 && (
            <div className="tadeon-master-overview__search">
              <Label htmlFor="master-roster-search">
                <Search className="h-4 w-4" aria-hidden="true" />
                Buscar personagem
              </Label>
              <Input
                type="search"
                id="master-roster-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(6);
                }}
                placeholder="Nome do personagem"
              />
              <p role="status">
                {Math.min(limit, filtered.length)} de {filtered.length}{" "}
                {query ? "encontrados" : "personagens"}
              </p>
            </div>
          )}
          <div className="tadeon-master-overview__roster">
            {filtered.slice(0, limit).map((sheet) => (
              <Button
                variant="outline"
                key={sheet.id}
                className="tadeon-master-overview__character"
                onClick={() => onOpenSheet(sheet.id)}
                aria-label={`Abrir ficha de ${sheet.name || "Sem nome"}`}
              >
                <span className="tadeon-master-overview__character-head">
                  <strong>{sheet.name || "Sem nome"}</strong>
                  <ArrowRight aria-hidden="true" />
                </span>
                <span className="tadeon-master-overview__character-meta">
                  {campaignSheetReading(sheet).progress}
                  <span>
                    Equilíbrio {sheet.equilibrium > 0 ? "+" : ""}
                    {sheet.equilibrium}
                  </span>
                </span>
                <span
                  className="tadeon-master-overview__resources"
                  data-resource-count={campaignSheetReading(sheet).resources.length}
                >
                  {campaignSheetReading(sheet).resources.map(([label, value]) => (
                    <span key={label}>
                      <small>{label}</small>
                      <strong>{value ?? 0}</strong>
                    </span>
                  ))}
                </span>
              </Button>
            ))}
          </div>
          {!filtered.length && (
            <div className="tadeon-master-overview__empty">
              <Users aria-hidden="true" className="h-6 w-6" />
              <h3>
                {sheets.length ? "Nenhum personagem encontrado" : "O elenco ainda está vazio"}
              </h3>
              <p>
                {sheets.length
                  ? "Tente outro nome ou limpe a busca para ver o grupo."
                  : "As fichas disponíveis aparecerão aqui quando os personagens forem criados."}
              </p>
              {query && (
                <Button variant="outline" onClick={() => setQuery("")}>
                  Limpar busca
                </Button>
              )}
            </div>
          )}
          {filtered.length > limit && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setLimit((current) => current + 6)}
            >
              Mostrar mais personagens ({filtered.length - limit})
            </Button>
          )}
        </MaterialSurface>

        <div className="tadeon-master-overview__aside">
          <MaterialSurface
            as="section"
            className="tadeon-master-overview__panel"
            aria-labelledby="master-scenes-heading"
          >
            <p className="tadeon-eyebrow">Roteiro da campanha</p>
            <h2 id="master-scenes-heading">Cenas em aberto</h2>
            {openScenes.length ? (
              <ul className="tadeon-master-overview__scenes">
                {openScenes.slice(0, 4).map((scene) => (
                  <li key={scene.id}>
                    <Map aria-hidden="true" className="h-4 w-4" />
                    <span>
                      <strong>{scene.title || "Cena sem título"}</strong>
                      <small>{scene.status}</small>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="tadeon-master-overview__empty">
                Nenhuma cena pendente. Organize o próximo encontro em Cenas.
              </p>
            )}
            <Button variant="outline" onClick={() => onNavigate("scenes")} className="w-full mt-3">
              Organizar cenas{openScenes.length > 4 ? ` (${openScenes.length})` : ""}
              <ArrowRight aria-hidden="true" />
            </Button>
          </MaterialSurface>
          <MaterialSurface
            as="section"
            className="tadeon-master-overview__panel"
            aria-labelledby="master-prep-heading"
          >
            <p className="tadeon-eyebrow">Fios a acompanhar</p>
            <h2 id="master-prep-heading">Preparação</h2>
            <div className="tadeon-master-overview__preparation">
              {(
                [
                  [
                    "interludes",
                    interludes.filter((item) => item.status !== "Concluída").length,
                    "Interlúdios abertos",
                  ],
                  [
                    "npcs-v2",
                    npcs.filter((npc) => npc.state === "Pleno").length,
                    "NPCs em condição plena",
                  ],
                  [
                    "investigation",
                    clues.filter((clue) => clue.guaranteed && !clue.discovered).length,
                    "Pistas garantidas pendentes",
                  ],
                ] as const
              ).map(([tab, count, label]) => (
                <Button key={tab} variant="ghost" onClick={() => onNavigate(tab)}>
                  <strong>{count}</strong>
                  <span>{label}</span>
                  <ArrowRight aria-hidden="true" />
                </Button>
              ))}
            </div>
            <p className="tadeon-master-overview__footnote">
              Dados e cálculos apoiam a condução. As rolagens continuam na mesa.
            </p>
          </MaterialSurface>
        </div>
      </div>
    </div>
  );
}
