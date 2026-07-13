import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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
import { Plus, Trash, ExternalLink, Loader2, Lightbulb } from "lucide-react";
import { toast } from "sonner";

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
  owner_email: string;
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
  const [toDelete, setToDelete] = useState<SheetRow | null>(null);

  const isMestre = role === "mestre";
  const canCreate = role === "mestre" || role === "jogador";
  const canDelete = role === "mestre" || role === "jogador";

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from("character_sheets")
      .select("id,name,occupation,owner_email,exposure")
      .order("created_at", { ascending: false });
    const { data, error } = isMestre ? await query : await query.eq("owner_id", user!.id);
    if (error) toast.error("Não foi possível carregar as fichas.");
    setSheets(data ?? []);
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
    // Defaults: rank 0 base (pv 10, ps 10, pe 5, def 10, pa 0, pm 0) + COR/MEN/ERU = 1
    // pv_max = 10 + 3*1 = 13; ps_max = 13; pe_max = 5 + 3*1 = 8
    const { data, error } = await supabase
      .from("character_sheets")
      .insert({
        owner_id: selectedOwner.id,
        owner_email: selectedOwner.email,
        name: name.trim() || "Novo Personagem",
        stats: {
          pv_current: 13,
          pv_mod: 0,
          ps_current: 13,
          ps_mod: 0,
          pe_current: 8,
          pe_mod: 0,
          pa_current: 0,
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-cinzel text-2xl md:text-3xl font-bold">
            Bem-vindo, {profile?.full_name || user?.email}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isMestre
              ? "Você é o Mestre. Gerencie todas as fichas e configurações."
              : role === "espectador"
                ? "Modo espectador: apenas visualização."
                : "Suas fichas de personagem"}
          </p>
        </div>
        {isMestre && (
          <Button asChild size="lg" className="gap-2">
            <Link to="/master-panel">
              <Lightbulb className="w-5 h-5" />
              Painel do Mestre
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-cinzel text-xl font-bold">
          {isMestre ? "Todas as Fichas" : "Suas Fichas"}
        </h2>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Ficha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-cinzel">Criar Ficha</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="sheet-name">Nome do Personagem</Label>
                  <Input
                    id="sheet-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Caelum, o Errante"
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
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sheets.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          Nenhuma ficha encontrada. {canCreate && "Crie uma nova para começar!"}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((s) => (
            <Card key={s.id} className="relative p-4 hover:border-primary/50 transition-colors">
              <h3 className="font-cinzel font-bold text-lg pr-8">{s.name}</h3>
              {s.occupation && <p className="text-sm text-muted-foreground">{s.occupation}</p>}
              <p className="text-xs text-muted-foreground mt-1 truncate">{s.owner_email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Rank {s.exposure || 0}</p>
              <Link
                to="/sheet/$id"
                params={{ id: s.id }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-3 h-3" />
                Ver Ficha
              </Link>
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setToDelete(s)}
                  className="absolute top-2 right-2 h-7 w-7 p-0"
                  aria-label={`Excluir ficha ${s.name}`}
                >
                  <Trash className="w-3.5 h-3.5" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

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
