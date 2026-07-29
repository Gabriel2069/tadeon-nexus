import { useMemo, useState } from "react";
import { BookOpen, Check, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RULEBOOK_CATALOG, type CatalogCategory, type CatalogEntry } from "@/lib/rulebook-catalog";
import type { MasterNpc } from "@/lib/master-data";
import type { Ability, FragmentItem, Plot, Weapon } from "@/lib/sheet-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CatalogSheet {
  id: string;
  name: string;
  owner_email: string;
}

const labels: Record<CatalogCategory, string> = {
  trama: "Tramas",
  transcendente: "Transcendentes",
  fragmento: "Fragmentos",
  arma: "Armas",
};

export function MasterCatalog({
  sheets,
  npcs,
  onNpcsChange,
}: {
  sheets: CatalogSheet[];
  npcs: MasterNpc[];
  onNpcsChange: (value: MasterNpc[]) => void;
}) {
  const [category, setCategory] = useState<CatalogCategory>("trama");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return RULEBOOK_CATALOG.filter(
      (entry) =>
        entry.category === category &&
        (!normalized ||
          `${entry.name} ${entry.subtitle} ${entry.summary} ${entry.tags.join(" ")}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized)),
    );
  }, [category, query]);

  const addToSheet = async (sheetId: string) => {
    if (!selected) return;
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("character_sheets")
        .select("weapons,abilities,plots,fragments_items")
        .eq("id", sheetId)
        .single();
      if (error || !data) throw error;
      const source = data as unknown as Record<string, unknown>;
      const field =
        selected.category === "arma"
          ? "weapons"
          : selected.category === "trama"
            ? "plots"
            : selected.category === "fragmento"
              ? "fragments_items"
              : "abilities";
      const previous = Array.isArray(source[field]) ? source[field] : [];
      const payload = {
        ...(selected.payload as unknown as Record<string, unknown>),
        id: crypto.randomUUID(),
      };
      const { error: updateError } = await supabase
        .from("character_sheets")
        .update({ [field]: [...previous, payload] } as never)
        .eq("id", sheetId);
      if (updateError) throw updateError;
      toast.success(`${selected.name} adicionado à ficha.`);
      setSelected(null);
    } catch {
      toast.error("Não foi possível adicionar este item à ficha.");
    } finally {
      setAdding(false);
    }
  };

  const addToNpc = (npcId: string) => {
    if (!selected) return;
    const detail = `${selected.name} — ${selected.summary}`;
    onNpcsChange(
      npcs.map((npc) => {
        if (npc.id !== npcId) return npc;
        if (selected.category === "arma" || selected.category === "fragmento") {
          return { ...npc, inventory: [npc.inventory, detail].filter(Boolean).join("\n") };
        }
        return { ...npc, abilities: [npc.abilities, detail].filter(Boolean).join("\n") };
      }),
    );
    toast.success(`${selected.name} adicionado ao NPC. Salve o painel para confirmar.`);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <Card className="tadeon-surface overflow-hidden rounded-2xl p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="tadeon-eyebrow">Livro de Regras · TdV</p>
            <h2 className="font-cinzel text-2xl font-semibold">Acervo rápido do Mestre</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Encontre um modelo, confira seu resumo e envie-o diretamente para uma ficha ou NPC.
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Buscar por nome, Natureza, efeito…"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {(Object.keys(labels) as CatalogCategory[]).map((value) => (
            <Button
              key={value}
              size="sm"
              variant={category === value ? "default" : "outline"}
              onClick={() => setCategory(value)}
            >
              {labels[value]}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <Card
            key={entry.id}
            className="tadeon-surface group flex min-h-52 flex-col rounded-2xl p-4 transition-transform hover:-translate-y-0.5 hover:border-primary/45"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-cinzel text-lg font-semibold">{entry.name}</p>
                <p className="mt-1 text-[11px] text-primary">{entry.subtitle}</p>
              </div>
              {entry.category === "transcendente" ? (
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <BookOpen className="h-5 w-5 shrink-0 text-primary" />
              )}
            </div>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground">
              {entry.summary}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {entry.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[9px]">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button className="mt-4 gap-2" size="sm" onClick={() => setSelected(entry)}>
              <Check className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="rounded-2xl border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum item corresponde a essa busca.
        </Card>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-cinzel">Adicionar {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-2">
            <TargetList
              title="Fichas de personagem"
              empty="Nenhuma ficha disponível."
              items={sheets.map((sheet) => ({
                id: sheet.id,
                name: sheet.name || sheet.owner_email,
                detail: sheet.owner_email,
              }))}
              disabled={adding}
              onSelect={(id) => void addToSheet(id)}
            />
            <TargetList
              title="NPCs"
              empty="Nenhum NPC criado."
              items={npcs.map((npc) => ({
                id: npc.id,
                name: npc.name,
                detail: `${npc.classification} · ${npc.occupation || "sem ocupação"}`,
              }))}
              disabled={adding}
              onSelect={addToNpc}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TargetList({
  title,
  empty,
  items,
  disabled,
  onSelect,
}: {
  title: string;
  empty: string;
  items: { id: string; name: string; detail: string }[];
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(item.id)}
              className="w-full rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
            >
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {item.detail}
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}
