import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArchiveRestore,
  BookOpenText,
  CloudOff,
  FileSearch,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { isApplicationAdministrator } from "@/lib/permissions";

interface SearchItem {
  id: string;
  label: string;
  detail: string;
  group: "Ações" | "Fichas" | "Campanha";
  icon: "sheet" | "master" | "tools" | "offline";
  sheetId?: string;
  masterTab?:
    | "session"
    | "scenes"
    | "npcs-v2"
    | "investigation"
    | "threats"
    | "interludes"
    | "folds";
  route?: "/" | "/nexus-tools" | "/offline";
}

const masterCollections = [
  ["scenes_detailed", "scenes", "Cena"],
  ["master_npcs", "npcs-v2", "NPC"],
  ["investigation_clues", "investigation", "Pista"],
  ["threats", "threats", "Ameaça"],
  ["interludes", "interludes", "Interlúdio"],
  ["folds", "folds", "Dobra"],
] as const;

export function GlobalSearch({
  compact = false,
  mobile = false,
  enableShortcut = false,
}: {
  compact?: boolean;
  mobile?: boolean;
  enableShortcut?: boolean;
}) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const isMestre = isApplicationAdministrator({ appRole: role });

  useEffect(() => {
    if (!enableShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enableShortcut]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const nextItems: SearchItem[] = [
        {
          id: "dashboard",
          label: "Dashboard",
          detail: "Abrir o arquivo de personagens",
          group: "Ações",
          icon: "sheet",
          route: "/",
        },
        {
          id: "offline",
          label: "Consulta offline",
          detail: "Abrir a cópia local somente leitura",
          group: "Ações",
          icon: "offline",
          route: "/offline",
        },
      ];
      if (isMestre) {
        nextItems.push(
          {
            id: "session",
            label: "Sessão ativa",
            detail: "Abrir o espaço operacional do mestre",
            group: "Ações",
            icon: "master",
            masterTab: "session",
          },
          {
            id: "tools",
            label: "Backup & Diagnóstico",
            detail: "Ver integridade, versões e restauração",
            group: "Ações",
            icon: "tools",
            route: "/nexus-tools",
          },
        );
      }

      try {
        const { data: sheets } = await supabase
          .from("character_sheets")
          .select("id,name,occupation,exposure")
          .order("name");
        for (const sheet of sheets ?? []) {
          nextItems.push({
            id: `sheet:${sheet.id}`,
            label: sheet.name,
            detail: `${sheet.occupation || "Ocupação não definida"} · Rank ${sheet.exposure || 0}`,
            group: "Fichas",
            icon: "sheet",
            sheetId: sheet.id,
          });
        }

        if (isMestre) {
          const { data: settings } = await supabase
            .from("game_settings")
            .select(
              "scenes_detailed,master_npcs,investigation_clues,threats,interludes,folds",
            )
            .eq("key", "global")
            .maybeSingle();
          const source = (settings ?? {}) as unknown as Record<string, unknown>;
          for (const [field, tab, type] of masterCollections) {
            const records = Array.isArray(source[field])
              ? (source[field] as Array<Record<string, unknown>>)
              : [];
            for (const record of records) {
              const name = String(
                record.name ?? record.title ?? `${type} sem nome`,
              );
              const status = String(
                record.status ?? record.stage ?? record.classification ?? "",
              );
              nextItems.push({
                id: `${field}:${String(record.id ?? name)}`,
                label: name,
                detail: status ? `${type} · ${status}` : type,
                group: "Campanha",
                icon: "master",
                masterTab: tab,
              });
            }
          }
        }
      } catch {
        // Static navigation remains usable while the data source is temporarily offline.
      } finally {
        setItems(nextItems);
        setLoading(false);
      }
    })();
  }, [isMestre, open]);

  const groups = useMemo(
    () =>
      (["Ações", "Fichas", "Campanha"] as const).map((group) => ({
        group,
        items: items.filter((item) => item.group === group),
      })),
    [items],
  );

  const selectItem = (item: SearchItem) => {
    setOpen(false);
    if (item.sheetId) {
      void navigate({ to: "/sheet/$id", params: { id: item.sheetId } });
      return;
    }
    if (item.masterTab) {
      void navigate({ to: "/master-panel", search: { tab: item.masterTab } });
      return;
    }
    if (item.route) void navigate({ to: item.route });
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="Busca global"
        title={compact ? "Busca global" : undefined}
        className={
          mobile
            ? "h-8 w-8 p-0"
            : `w-full gap-2.5 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                compact ? "justify-center px-2" : "justify-start px-3"
              }`
        }
      >
        <Search className="h-4 w-4" />
        {!compact && !mobile && (
          <>
            <span>Busca global</span>
            {enableShortcut && (
              <kbd className="ml-auto hidden rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] lg:inline">
                Ctrl K
              </kbd>
            )}
          </>
        )}
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar fichas, cenas, NPCs, ameaças e ferramentas…" />
        <CommandList>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Indexando o Nexus…
            </div>
          ) : (
            <>
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              {groups.map(({ group, items: groupItems }, index) =>
                groupItems.length ? (
                  <div key={group}>
                    {index > 0 && <CommandSeparator />}
                    <CommandGroup heading={group}>
                      {groupItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.label} ${item.detail}`}
                          onSelect={() => selectItem(item)}
                        >
                          <SearchIcon type={item.icon} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{item.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.detail}
                            </p>
                          </div>
                          {item.masterTab && (
                            <CommandShortcut>Painel</CommandShortcut>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                ) : null,
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function SearchIcon({ type }: { type: SearchItem["icon"] }) {
  if (type === "master")
    return <ShieldCheck className="h-4 w-4 text-primary" />;
  if (type === "tools")
    return <ArchiveRestore className="h-4 w-4 text-primary" />;
  if (type === "offline") return <CloudOff className="h-4 w-4 text-primary" />;
  if (type === "sheet")
    return <BookOpenText className="h-4 w-4 text-primary" />;
  return <FileSearch className="h-4 w-4 text-primary" />;
}
