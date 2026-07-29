import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
  BookOpenText,
  Orbit,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { BrandMark, ThreadField } from "@/components/brand-mark";
import { cacheSheetSummaries } from "@/lib/offline-cache";
import { can, isApplicationAdministrator } from "@/lib/permissions";

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
      { property: "og:url", content: "https://tadeon-nexus.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://tadeon-nexus.lovable.app/" }],
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

function HomePage() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [startTutorial, setStartTutorial] = useState(true);
  const [toDelete, setToDelete] = useState<SheetRow | null>(null);

  const permissionContext = { appRole: role };
  const isMestre = isApplicationAdministrator(permissionContext);
  const canCreate = can("character:create", permissionContext);
  const canDelete = can("character:create", permissionContext);

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from("character_sheets")
      .select("id,name,occupation,owner_id,exposure")
      .order("created_at", { ascending: false });
    const { data, error } = isMestre ? await query : await query.eq("owner_id", user!.id);
    if (error) toast.error("Não foi possível carregar as fichas.");
    const rows = (data ?? []) as SheetRow[];
    let labeled = rows;
    if (isMestre && rows.length > 0) {
      const ids = Array.from(new Set(rows.map((row) => row.owner_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", ids);
      const names = new Map(
        (profiles ?? []).map((item) => [item.id, item.full_name || item.email || ""]),
      );
      labeled = rows.map((row) => ({ ...row, owner_label: names.get(row.owner_id) ?? null }));
    }
    setSheets(labeled);
    cacheSheetSummaries(labeled);
    setLoading(false);
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  useEffect(() => {
    if (!user) return;
    if (!isMestre) {
      setOwners([]);
      setOwnerId(user.id);
      return;
    }

    setOwnersLoading(true);
    void supabase
      .from("profiles")
      .select("id,email,full_name")
      .order("full_name")
      .then(({ data, error }) => {
        setOwnersLoading(false);
        if (error) {
          toast.error("Não foi possível carregar os donos disponíveis.");
          return;
        }
        const options = (data ?? []).filter(
          (row): row is OwnerOption => typeof row.email === "string" && row.email.length > 0,
        );
        setOwners(options);
        setOwnerId((current) =>
          options.some((option) => option.id === current)
            ? current
            : (options.find((option) => option.id === user.id)?.id ?? options[0]?.id ?? ""),
        );
      });
  }, [isMestre, user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const selectedOwner = isMestre
      ? owners.find((owner) => owner.id === ownerId)
      : { id: user.id, email: user.email ?? "", full_name: profile?.full_name ?? null };
    if (!selectedOwner?.email) {
      toast.error("Selecione um dono válido para a ficha.");
      return;
    }
    setCreating(true);
    // Rank 0 final: PV 15, PS 13, PE 5, PA 0, DEF 10; all attributes begin at 1.
    const { data, error } = await supabase
      .from("character_sheets")
      .insert({
        owner_id: selectedOwner.id,
        name: name.trim() || "Novo Personagem",
        weapon_proficiency: "operador",
        weapon_proficiency_family: "",
        initial_skill_degrees: {},
        stats: {
          pv_current: 18,
          pv_mod: 0,
          ps_current: 16,
          ps_mod: 0,
          pe_current: 7,
          pe_mod: 0,
          pa_current: 1,
          pa_mod: 0,
          pm_current: 0,
          pm_mod: 0,
          def_equip: 0,
          def_mod: 0,
        },
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error("Não foi possível criar a ficha.");
      return;
    }
    setCreateOpen(false);
    setName("");
    if (startTutorial && typeof window !== "undefined") {
      window.sessionStorage.setItem(`tadeon-sheet-tutorial:${data.id}`, "1");
    }
    toast.success("Ficha criada!");
    void navigate({ to: "/sheet/$id", params: { id: data.id } });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("character_sheets").delete().eq("id", toDelete.id);
    if (error) toast.error("Não foi possível excluir a ficha.");
    else {
      toast.success("Ficha excluída.");
      setSheets((prev) => prev.filter((s) => s.id !== toDelete.id));
    }
    setToDelete(null);
  };

  return (
    <div className="tadeon-page space-y-8">
      <section className="tadeon-surface relative min-h-64 rounded-2xl px-6 py-7 md:px-9 md:py-9">
        <ThreadField className="text-primary" />
        <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <BrandMark className="h-12 w-12 text-primary" />
              <div>
                <p className="tadeon-eyebrow">Arquivo de continuidade</p>
                <p className="tadeon-mono text-[10px] uppercase text-muted-foreground">
                  Sessão autenticada · {role ?? "carregando"}
                </p>
              </div>
            </div>
            <h1 className="font-cinzel text-3xl font-semibold leading-[1.04] md:text-5xl">
              {profile?.full_name ? `Olá, ${profile.full_name}.` : "Tadeon Nexus"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {isMestre
                ? "Organize personagens, cenas e pressões da campanha a partir de um único arquivo."
                : role === "espectador"
                  ? "Consulte fichas e acompanhe a continuidade da campanha em modo de leitura."
                  : "Acesse suas personagens, acompanhe a progressão e preserve o que mudou em cada fio."}
            </p>
          </div>
          {isMestre && (
            <Button asChild size="lg" className="group gap-2 self-start lg:self-auto">
              <Link to="/master-panel" search={{ tab: undefined }}>
                <Lightbulb className="h-4 w-4" />
                Abrir painel do mestre
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          )}
        </div>
        <div className="relative z-10 mt-8 grid gap-3 border-t border-border/60 pt-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <BookOpenText className="h-4 w-4 text-primary" />
            <div>
              <p className="text-lg font-semibold">{sheets.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fichas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Orbit className="h-4 w-4 text-[var(--tadeon-flow)]" />
            <div>
              <p className="text-lg font-semibold">Final</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Regras ativas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BrandMark className="h-5 w-5 text-[var(--tadeon-veil)]" />
            <div>
              <p className="text-lg font-semibold">Fio-Mestre</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Identidade visual
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="tadeon-eyebrow">Personagens</p>
            <h2 className="tadeon-section-title">
              {isMestre ? "Arquivo da campanha" : "Suas fichas"}
            </h2>
          </div>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
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
                    <Button type="submit" disabled={creating || (isMestre && !ownerId)}>
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
          <div className="tadeon-surface flex justify-center rounded-2xl py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sheets.length === 0 ? (
          <div className="tadeon-surface rounded-2xl px-6 py-16 text-center">
            <BrandMark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-cinzel text-xl">O arquivo ainda está vazio.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate ? "Crie uma ficha para iniciar este fio." : "Nenhuma ficha disponível."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sheets.map((sheet, index) => (
              <Card
                key={sheet.id}
                className="tadeon-surface group relative min-h-52 rounded-2xl p-5 hover:-translate-y-1 hover:border-primary/35"
              >
                <div className="mb-8 flex items-start justify-between gap-4">
                  <span className="tadeon-mono text-[9px] uppercase text-muted-foreground">
                    Fio {String(index + 1).padStart(2, "0")} · Rank {sheet.exposure || 0}
                  </span>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToDelete(sheet)}
                      className="-mr-2 -mt-2 h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Excluir ficha ${sheet.name}`}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <h3 className="font-cinzel text-2xl font-semibold leading-tight">{sheet.name}</h3>
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
                  className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-primary"
                >
                  Abrir ficha
                  <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Card>
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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
