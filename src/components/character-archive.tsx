import { useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Search, SlidersHorizontal, Trash, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { MaterialSurface } from "@/components/material-surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ArchiveSheet {
  id: string;
  name: string;
  occupation: string | null;
  owner_id: string;
  owner_label?: string | null;
  exposure: number;
  rules_version?: number;
  development?: number;
}

const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

/** Local discovery over the already-authorized rows; never fetches or persists data. */
export function CharacterArchive({
  sheets,
  userId,
  busy,
  canDelete,
  onDelete,
}: {
  sheets: ArchiveSheet[];
  userId: string | undefined;
  busy: boolean;
  canDelete: (sheet: ArchiveSheet) => boolean;
  onDelete: (sheet: ArchiveSheet) => void;
}) {
  const searchId = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [order, setOrder] = useState("recent");
  const terms = searchable(query).trim().split(/\s+/).filter(Boolean);
  const records = sheets
    .map((sheet, index) => ({ sheet, number: index + 1 }))
    .filter(({ sheet }) => {
      const text = searchable(
        [sheet.name, sheet.occupation, sheet.owner_label].filter(Boolean).join(" "),
      );
      return (!mine || sheet.owner_id === userId) && terms.every((term) => text.includes(term));
    });
  if (order === "name") records.sort((a, b) => a.sheet.name.localeCompare(b.sheet.name, "pt-BR"));
  if (order === "exposure")
    records.sort(
      (a, b) =>
        (b.sheet.development??b.sheet.exposure) - (a.sheet.development??a.sheet.exposure) || a.sheet.name.localeCompare(b.sheet.name, "pt-BR"),
    );

  return (
    <>
      <div className="tadeon-archive-tools" role="group" aria-label="Organizar fichas">
        <div className="tadeon-archive-search">
          <label htmlFor={searchId} className="sr-only">
            Buscar fichas
          </label>
          <Search aria-hidden="true" className="tadeon-archive-search__icon" />
          <Input
            ref={searchInput}
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, ocupação ou responsável"
            autoComplete="off"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Limpar busca de fichas"
              onClick={() => {
                setQuery("");
                searchInput.current?.focus();
              }}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          variant={mine ? "secondary" : "outline"}
          aria-pressed={mine}
          onClick={() => setMine((value) => !value)}
          className="tadeon-archive-mine"
        >
          Minhas fichas
        </Button>
        <Select value={order} onValueChange={setOrder}>
          <SelectTrigger className="tadeon-archive-order" aria-label="Ordenar fichas">
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="name">Nome: A–Z</SelectItem>
            <SelectItem value="exposure">Maior progresso</SelectItem>
          </SelectContent>
        </Select>
        <p className="tadeon-archive-count" role="status">
          {records.length} de {sheets.length} {sheets.length === 1 ? "ficha" : "fichas"}
        </p>
      </div>
      {records.length ? (
        <div className="tadeon-character-gallery">
          {records.map(({ sheet, number }) => (
            <MaterialSurface as="article" key={sheet.id} className="tadeon-character-card">
              <div className="tadeon-character-card__spine" aria-hidden="true">
                <span>{String(number).padStart(2, "0")}</span>
              </div>
              <div className="tadeon-character-card__header">
                <span className="tadeon-mono">Fio {String(number).padStart(2, "0")}</span>
                {sheet.owner_id === userId && (
                  <span className="tadeon-character-card__ownership">Seu fio</span>
                )}
                {canDelete(sheet) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    onClick={() => onDelete(sheet)}
                    className="tadeon-character-card__delete"
                    aria-label={`Excluir ficha ${sheet.name}`}
                  >
                    <Trash aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="tadeon-character-card__identity">
                <h3>{sheet.name}</h3>
                <p>{sheet.occupation || "Ocupação ainda não definida"}</p>
              </div>
              <div className="tadeon-character-card__record">
                <p>
                  {sheet.owner_label ||
                    (sheet.owner_id === userId ? "Sua personagem" : "Ficha compartilhada")}
                </p>
                <span>
                  {sheet.rules_version===2?"Desenvolvimento":"Exposição"} <strong>{sheet.rules_version===2?sheet.development??0:sheet.exposure||0}</strong>
                </span>
              </div>
              <Link
                to="/sheet/$id"
                params={{ id: sheet.id }}
                className="tadeon-character-card__open"
                aria-label={`Abrir ficha de ${sheet.name}`}
              >
                Abrir ficha <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </MaterialSurface>
          ))}
        </div>
      ) : (
        <div className="tadeon-archive-state">
          <BrandMark className="h-10 w-10" aria-hidden="true" />
          <h3>Nenhum fio nesta busca.</h3>
          <p>Tente outro nome, ocupação ou responsável, ou retire o filtro de suas fichas.</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setMine(false);
              searchInput.current?.focus();
            }}
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </>
  );
}
