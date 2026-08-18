import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArchiveRestore,
  BookOpenText,
  CloudOff,
  LayoutDashboard,
  LibraryBig,
  Loader2,
  MapPinned,
  Search,
  ShieldCheck,
  Users,
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
import "@/styles/final-nav-search-polish-196.css";

type SearchGroup = "Áreas" | "Fichas" | "Campanha";
type SearchIconName =
  | "dashboard"
  | "sheet"
  | "master"
  | "tools"
  | "offline"
  | "knowledge"
  | "tabletop"
  | "users";

interface SearchItem {
  id: string;
  label: string;
  detail: string;
  group: SearchGroup;
  icon: SearchIconName;
  sheetId?: string;
  masterTab?:
    | "session"
    | "scenes"
    | "npcs-v2"
    | "investigation"
    | "threats"
    | "interludes"
    | "folds";
  route?:
    | "/"
    | "/nexus"
    | "/tabletop"
    | "/nexus-tools"
    | "/manage-users"
    | "/offline";
}

const masterCollections = [
  ["scenes_detailed", "scenes", "Cena"],
  ["master_npcs", "npcs-v2", "NPC"],
  ["investigation_clues", "investigation", "Pista"],
  ["threats", "threats", "Ameaça"],
  ["interludes", "interludes", "Interlúdio"],
  ["folds", "folds", "Dobra"],
] as const;

function syncSearchVisualViewport() {
  if (typeof window === "undefined") return;
  const viewport = window.visualViewport;
  const root = document.documentElement;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  root.style.setProperty("--tadeon-search-vv-width", `${Math.max(0, width)}px`);
  root.style.setProperty("--tadeon-search-vv-height", `${Math.max(0, height)}px`);
  root.style.setProperty("--tadeon-search-vv-left", `${Math.max(0, left)}px`);
  root.style.setProperty("--tadeon-search-vv-top", `${Math.max(0, top)}px`);
}

export function GlobalSearch({
  compact = false,
  mobile = false,
  enableShortcut = false,
  knowledgeEnabled = false,
  tabletopEnabled = false,
}: {
  compact?: boolean;
  mobile?: boolean;
  enableShortcut?: boolean;
  knowledgeEnabled?: boolean;
  tabletopEnabled?: boolean;
}) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadNotice, setLoadNotice] = useState<string | null>(null);
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
    if (!open || typeof window === "undefined") return;
    syncSearchVisualViewport();
    const viewport = window.visualViewport;
    const sync = () => syncSearchVisualViewport();
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setLoadNotice(null);

    void (async () => {
      const nextItems: SearchItem[] = [
        {
          id: "dashboard",
          label: "Dashboard",
          detail: "Arquivo de personagens e visão geral",
          group: "Áreas",
          icon: "dashboard",
          route: "/",
        },
        {
          id: "offline",
          label: "Consulta offline",
          detail: "Cópia local protegida para leitura",
          group: "Áreas",
          icon: "offline",
          route: "/offline",
        },
      ];

      if (knowledgeEnabled) {
        nextItems.splice(1, 0, {
          id: "knowledge",
          label: "O Nexus",
          detail: "Conhecimento, continuidade e referências",
          group: "Áreas",
          icon: "knowledge",
          route: "/nexus",
        });
      }

      if (tabletopEnabled) {
        nextItems.splice(knowledgeEnabled ? 2 : 1, 0, {
          id: "tabletop",
          label: "Mesa Nexus",
          detail: "Cenas, mapas, tokens e transmissão",
          group: "Áreas",
          icon: "tabletop",
          route: "/tabletop",
        });
      }

      if (isMestre) {
        nextItems.push(
          {
            id: "session",
            label: "Painel do Mestre",
            detail: "Condução, ritmo e estado da campanha",
            group: "Áreas",
            icon: "master",
            masterTab: "session",
          },
          {
            id: "users",
            label: "Usuários e acessos",
            detail: "Papéis, convites e permissões",
            group: "Áreas",
            icon: "users",
            route: "/manage-users",
          },
          {
            id: "tools",
            label: "Backup & Diagnóstico",
            detail: "Integridade, versões e restauração",
            group: "Áreas",
            icon: "tools",
            route: "/nexus-tools",
          },
        );
      }

      const failures: string[] = [];
      try {
        const sheetRequest = supabase
          .from("character_sheets")
          .select("id,name,occupation,exposure")
          .order("name");
        const settingsRequest = isMestre
          ? supabase
              .from("game_settings")
              .select(
                "scenes_detailed,master_npcs,investigation_clues,threats,interludes,folds",
              )
              .eq("key", "global")
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });
        const [sheetResult, settingsResult] = await Promise.all([
          sheetRequest,
          settingsRequest,
        ]);

        if (sheetResult.error) {
          failures.push("fichas");
        } else {
          for (const sheet of sheetResult.data ?? []) {
            nextItems.push({
              id: `sheet:${sheet.id}`,
              label: sheet.name,
              detail: `${sheet.occupation || "Ocupação não definida"} · Rank ${sheet.exposure || 0}`,
              group: "Fichas",
              icon: "sheet",
              sheetId: sheet.id,
            });
          }
        }

        if (settingsResult.error) {
          failures.push("campanha");
        } else if (isMestre) {
          const source = (settingsResult.data ?? {}) as unknown as Record<
            string,
            unknown
          >;
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
        failures.push("conteúdo dinâmico");
      }

      if (!active) return;
      setItems(nextItems);
      setLoadNotice(
        failures.length
          ? `Navegação disponível; não foi possível indexar ${failures.join(" e ")}.`
          : null,
      );
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [isMestre, knowledgeEnabled, open, tabletopEnabled]);

  const groups = useMemo(
    () =>
      (["Áreas", "Fichas", "Campanha"] as const).map((group) => ({
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
        aria-label="Abrir busca global"
        title={compact ? "Busca global" : undefined}
        className={
          mobile
            ? "tadeon-mobile-header__control h-11 w-11 p-0"
            : `tadeon-global-search-trigger w-full gap-2.5 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                compact ? "justify-center px-2" : "justify-start px-3"
              }`
        }
      >
        <Search aria-hidden className="h-4 w-4" />
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

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        contentClassName="tadeon-global-search-dialog"
        commandClassName="tadeon-global-search-command"
      >
        <CommandInput placeholder="Buscar áreas, fichas, cenas, NPCs e ferramentas…" />
        <CommandList className="tadeon-command-list">
          {loading ? (
            <div
              className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
              role="status"
            >
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Indexando o arquivo…
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
                          className="tadeon-command-item"
                        >
                          <SearchIcon type={item.icon} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{item.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {item.detail}
                            </p>
                          </div>
                          <CommandShortcut>
                            {item.masterTab ? "Painel" : "Abrir"}
                          </CommandShortcut>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                ) : null,
              )}
            </>
          )}
        </CommandList>
        {!loading && (
          <div className="tadeon-command-footer" role="status">
            <span>
              {items.length} {items.length === 1 ? "resultado" : "resultados"}
            </span>
            <span className={loadNotice ? "text-destructive" : undefined}>
              {loadNotice ?? "↑↓ navegar · Enter abrir · Esc fechar"}
            </span>
          </div>
        )}
      </CommandDialog>
    </>
  );
}

function SearchIcon({ type }: { type: SearchIconName }) {
  const className = "h-4 w-4 text-primary";
  if (type === "master")
    return <ShieldCheck aria-hidden className={className} />;
  if (type === "tools")
    return <ArchiveRestore aria-hidden className={className} />;
  if (type === "offline") return <CloudOff aria-hidden className={className} />;
  if (type === "sheet")
    return <BookOpenText aria-hidden className={className} />;
  if (type === "knowledge")
    return <LibraryBig aria-hidden className={className} />;
  if (type === "tabletop")
    return <MapPinned aria-hidden className={className} />;
  if (type === "users") return <Users aria-hidden className={className} />;
  return <LayoutDashboard aria-hidden className={className} />;
}
