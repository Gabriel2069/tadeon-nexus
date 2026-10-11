import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash,
  ExternalLink,
  Loader2,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand-mark";
import { ContinuityHero } from "@/components/continuity-hero";
import { createLatestRequestGate } from "@/lib/latest-request";
import { cacheSheetSummaries, type OfflineCacheScope } from "@/lib/offline-cache";
import { can, isApplicationAdministrator } from "@/lib/permissions";
import { CANONICAL_RANK_TABLE } from "@/lib/sheet-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Tadeon Nexus" },
      {
        name: "description",
        content:
          "Painel principal do Tadeon Nexus: veja e gerencie suas fichas de personagem, atributos, perícias e progresso de RPG.",
      },
      { property: "og:title", content: "Dashboard · Tadeon Nexus" },
      {
        property: "og:description",
        content:
          "Painel principal do Tadeon Nexus: veja e gerencie suas fichas de personagem, atributos, perícias e progresso de RPG.",
      },
      {
        property: "og:url",
        content: "https://tadeon-nexus.gtadeusz.workers.dev/",
      },
    ],
    links: [{ rel: "canonical", href: "https://tadeon-nexus.gtadeusz.workers.dev/" }],
  }),
  component: () => (
    <ProtectedShell>
      <HomePage />
    </ProtectedShell>
  ),
});

interface SheetRow {
  id: string;
  name: string;
  occupation: string | null;
  owner_id: string;
  owner_label?: string | null;
  exposure: number;
}

interface OwnerOption {
  id: string;
  email: string;
  full_name: string | null;
}

export function HomePage() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;
  const activeIdentity = useRef<OfflineCacheScope | null>(null);
  const pendingWrite = useRef<OfflineCacheScope | null>(null);
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const reads = useRef(createLatestRequestGate());
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [startTutorial, setStartTutorial] = useState(true);
  const [toDelete, setToDelete] = useState<SheetRow | null>(null);

  const permissionContext = { appRole: role };
  const isMestre = isApplicationAdministrator(permissionContext);
  const canCreate = can("character:create", permissionContext);
  const canDeleteSheet = (sheet: SheetRow) =>
    can("character:delete", {
      appRole: role,
      currentUserId: user?.id,
      resourceOwnerId: sheet.owner_id,
    });

  const load = useCallback(async () => {
    const identity = activeIdentity.current;
    if (!identity || identity.userId !== userId || identity.role !== role) return;
    const ticket = reads.current.begin();
    setLoading(true);
    setLoadError(false);
    try {
      const query = supabase
        .from("character_sheets")
        .select("id,name,occupation,owner_id,exposure")
        .order("created_at", { ascending: false });
      const { data, error } = isMestre ? await query : await query.eq("owner_id", identity.userId);
      if (!reads.current.isCurrent(ticket)) return;
      if (error) throw error;
      const rows = (data ?? []) as SheetRow[];
      let labeled = rows;
      if (isMestre && rows.length > 0) {
        const ids = Array.from(new Set(rows.map((row) => row.owner_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,email,full_name")
          .in("id", ids);
        if (!reads.current.isCurrent(ticket)) return;
        const names = new Map(
          (profiles ?? []).map((item) => [item.id, item.full_name || item.email || ""]),
        );
        labeled = rows.map((row) => ({ ...row, owner_label: names.get(row.owner_id) ?? null }));
      }
      setSheets(labeled);
      cacheSheetSummaries(labeled, identity);
    } catch {
      if (reads.current.isCurrent(ticket)) setLoadError(true);
    } finally {
      if (reads.current.isCurrent(ticket)) setLoading(false);
    }
  }, [userId, role, isMestre]);

  useEffect(() => {
    const gate = reads.current;
    activeIdentity.current = userId && role ? { userId, role } : null;
    pendingWrite.current = null;
    setCreateOpen(false);
    setName("");
    setToDelete(null);
    setCreating(false);
    setDeleting(false);
    setSheets([]);
    setLoadError(false);
    if (userId && role) void load();
    else setLoading(false);
    return () => {
      gate.invalidate();
      activeIdentity.current = null;
    };
  }, [load, userId, role]);

  useEffect(() => {
    if (!user) return;
    if (!isMestre) {
      setOwners([]);
      setOwnerId(user.id);
      setOwnersLoading(false);
      return;
    }

    let cancelled = false;
    setOwners([]);
    setOwnersLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,full_name")
          .order("full_name");
        if (cancelled) return;
        if (error) throw error;
        const options = (data ?? []).filter(
          (row): row is OwnerOption => typeof row.email === "string" && row.email.length > 0,
        );
        setOwners(options);
        setOwnerId((current) =>
          options.some((option) => option.id === current)
            ? current
            : (options.find((option) => option.id === user.id)?.id ?? options[0]?.id ?? ""),
        );
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar os donos disponíveis.");
      } finally {
        if (!cancelled) setOwnersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMestre, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const identity = activeIdentity.current;
    if (
      !user ||
      !identity ||
      identity.userId !== user.id ||
      identity.role !== role ||
      !canCreate ||
      pendingWrite.current === identity
    )
      return;
    const selectedOwner = isMestre
      ? owners.find((owner) => owner.id === ownerId)
      : {
          id: user.id,
          email: user.email ?? "",
          full_name: profile?.full_name ?? null,
        };
    if (!selectedOwner?.email) {
      toast.error("Selecione um dono válido para a ficha.");
      return;
    }
    pendingWrite.current = identity;
    setCreating(true);
    try {
      const initialRank = CANONICAL_RANK_TABLE[0];
      const { data, error } = await supabase
        .from("character_sheets")
        .insert({
          owner_id: selectedOwner.id,
          name: name.trim() || "Novo Personagem",
          weapon_proficiency: "operador",
          weapon_proficiency_family: "",
          initial_skill_degrees: {},
          stats: {
            pv_current: initialRank.pv,
            pv_mod: 0,
            ps_current: initialRank.ps,
            ps_mod: 0,
            pe_current: initialRank.pe,
            pe_mod: 0,
            pa_current: initialRank.pa,
            pa_mod: 0,
            pm_current: initialRank.pm,
            pm_mod: 0,
            def_equip: 0,
            def_mod: 0,
          },
        })
        .select("id")
        .single();
      if (activeIdentity.current !== identity) return;
      if (error || !data?.id) throw error ?? new Error("Creation was not confirmed");
      setCreateOpen(false);
      setName("");
      if (startTutorial && typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(`tadeon-sheet-tutorial:${data.id}`, "1");
        } catch {
          /* Optional tutorial storage must not turn a persisted creation into a failure. */
        }
      }
      toast.success("Ficha criada!");
      void navigate({ to: "/sheet/$id", params: { id: data.id } });
    } catch {
      if (activeIdentity.current === identity) toast.error("Não foi possível criar a ficha.");
    } finally {
      if (pendingWrite.current === identity) pendingWrite.current = null;
      if (activeIdentity.current === identity) setCreating(false);
    }
  };

  const handleDelete = async () => {
    const target = toDelete;
    const identity = activeIdentity.current;
    if (
      !target ||
      !identity ||
      identity.userId !== userId ||
      identity.role !== role ||
      pendingWrite.current === identity
    )
      return;
    if (!canDeleteSheet(target)) {
      toast.error("Você não tem permissão para excluir esta ficha.");
      setToDelete(null);
      return;
    }
    pendingWrite.current = identity;
    setDeleting(true);
    try {
      const { data, error } = await supabase
        .from("character_sheets")
        .delete()
        .eq("id", target.id)
        .select("id");
      if (activeIdentity.current !== identity) return;
      if (error || !data?.some((row) => row.id === target.id))
        throw error ?? new Error("Deletion was not confirmed");
      setToDelete(null);
      toast.success("Ficha excluída.");
      // A fresh read wins over requests begun before the deletion and refreshes the offline cache.
      await load();
    } catch {
      if (activeIdentity.current === identity) toast.error("Não foi possível excluir a ficha.");
    } finally {
      if (pendingWrite.current === identity) pendingWrite.current = null;
      if (activeIdentity.current === identity) setDeleting(false);
    }
  };

  return (
    <div className="tadeon-page tadeon-dashboard tadeon-route-dashboard space-y-8">
      <ContinuityHero
        greeting={profile?.full_name ? `Olá, ${profile.full_name}.` : "Seu arquivo de continuidade"}
        description={
          isMestre
            ? "Personagens, encontros e vestígios. Reúna o que a campanha deixou e prepare o que ainda está por vir."
            : role === "espectador"
              ? "Acompanhe personagens e consulte os registros da campanha em modo de leitura."
              : "Retome suas personagens, acompanhe a progressão e preserve o que mudou em cada fio."
        }
        action={
          isMestre ? (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/master-panel" search={{ tab: undefined }}>
                <Lightbulb className="h-4 w-4" /> Painel do mestre{" "}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="gap-2">
              <a href="#character-archive">
                Explorar suas fichas <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          )
        }
        facts={[
          {
            label: "Fichas disponíveis",
            value: loading || loadError ? "--" : String(sheets.length).padStart(2, "0"),
            detail: isMestre ? "Visíveis à sua conta mestre" : "Visíveis à sua conta",
          },
          {
            label: "Seus personagens",
            value:
              loading || loadError
                ? "--"
                : String(sheets.filter((sheet) => sheet.owner_id === user?.id).length).padStart(
                    2,
                    "0",
                  ),
            detail: "Fichas que pertencem a você",
          },
          {
            label: "Maior exposição",
            value:
              loading || loadError
                ? "--"
                : String(Math.max(0, ...sheets.map((sheet) => sheet.exposure || 0))).padStart(
                    2,
                    "0",
                  ),
            detail: "Entre as fichas disponíveis",
          },
        ]}
      />

      <section
        id="character-archive"
        className="tadeon-character-archive"
        aria-labelledby="archive-title"
      >
        <div className="tadeon-character-archive__heading mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tadeon-eyebrow">Personagens</p>
            <h2 id="archive-title" className="tadeon-section-title">
              {isMestre ? "Arquivo da campanha" : "Suas fichas"}
            </h2>
          </div>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button disabled={creating || deleting} className="min-h-11 w-full gap-2 sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Nova ficha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-cinzel">Criar ficha</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="sheet-name">Nome da personagem</Label>
                    <Input
                      id="sheet-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Caelum, o Errante"
                      required
                    />
                  </div>
                  {isMestre && (
                    <div>
                      <Label htmlFor="owner-id">Dono da ficha</Label>
                      <Select value={ownerId} onValueChange={setOwnerId} disabled={ownersLoading}>
                        <SelectTrigger id="owner-id">
                          <SelectValue
                            placeholder={
                              ownersLoading ? "Carregando usuários…" : "Selecione um usuário"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {owners.map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>
                              {owner.full_name || owner.email} · {owner.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <label
                    htmlFor="start-sheet-tutorial"
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-secondary/25 p-3"
                  >
                    <Checkbox
                      id="start-sheet-tutorial"
                      checked={startTutorial}
                      onCheckedChange={(checked) => setStartTutorial(checked === true)}
                    />
                    <span>
                      <strong className="block text-sm">Abrir guia da primeira ficha</strong>
                      <span className="text-xs text-muted-foreground">
                        Um roteiro curto e dispensável apresenta as áreas da ficha após a criação.
                      </span>
                    </span>
                  </label>
                  <DialogFooter>
                    <Button type="submit" disabled={creating || deleting || (isMestre && !ownerId)}>
                      {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Criar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="tadeon-archive-state" role="status">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p>Reunindo os fios do arquivo…</p>
          </div>
        ) : loadError ? (
          <div className="tadeon-archive-state" role="alert">
            <AlertCircle className="h-7 w-7" aria-hidden="true" />
            <h3>O arquivo não pôde ser carregado.</h3>
            <p>Suas fichas não foram alteradas. Tente consultar novamente.</p>
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          </div>
        ) : sheets.length === 0 ? (
          <div className="tadeon-archive-state">
            <BrandMark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-cinzel text-xl">O arquivo ainda está vazio.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate ? "Crie uma ficha para iniciar este fio." : "Nenhuma ficha disponível."}
            </p>
          </div>
        ) : (
          <div className="tadeon-character-gallery">
            {sheets.map((sheet, index) => (
              <article key={sheet.id} className="tadeon-character-card">
                <div className="mb-4 flex items-start justify-between gap-4 sm:mb-6">
                  <span className="tadeon-mono text-[10px] uppercase text-muted-foreground">
                    Fio {String(index + 1).padStart(2, "0")} · Exposição {sheet.exposure || 0}
                  </span>
                  {canDeleteSheet(sheet) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={creating || deleting}
                      onClick={() => setToDelete(sheet)}
                      className="relative z-10 -mr-1 -mt-1 h-11 w-11 rounded-xl p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive-foreground"
                      aria-label={`Excluir ficha ${sheet.name}`}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <h3 className="font-cinzel text-xl font-semibold leading-tight sm:text-2xl">
                  {sheet.name}
                </h3>
                <p className="mt-1 min-h-5 text-sm text-muted-foreground">
                  {sheet.occupation || "Ocupação ainda não definida"}
                </p>
                {sheet.owner_label && (
                  <p className="mt-3 truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                    {sheet.owner_label}
                  </p>
                )}
                <Link
                  to="/sheet/$id"
                  params={{ id: sheet.id }}
                  className="tadeon-character-card__open mt-auto inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:border-primary/45 hover:bg-primary/10 active:scale-[.985]"
                >
                  Abrir ficha
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ficha "{toDelete?.name}"? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
