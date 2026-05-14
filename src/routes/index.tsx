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
      { title: "Dashboard — Tadeon Nexus" },
      { name: "description", content: "Suas fichas de personagem no Tadeon Nexus." },
    ],
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

function HomePage() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<SheetRow | null>(null);

  const isMestre = role === "mestre";
  const canCreate = role !== "espectador";

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from("character_sheets")
      .select("id,name,occupation,owner_email,exposure")
      .order("created_at", { ascending: false });
    const { data, error } = isMestre ? await query : await query.eq("owner_id", user!.id);
    if (error) toast.error(error.message);
    setSheets(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    const finalEmail = ownerEmail.trim() || user.email!;
    const { data, error } = await supabase
      .from("character_sheets")
      .insert({
        owner_id: user.id,
        owner_email: finalEmail,
        name: name.trim() || "Novo Personagem",
      })
      .select("id")
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCreateOpen(false);
    setName("");
    setOwnerEmail("");
    toast.success("Ficha criada!");
    void navigate({ to: "/sheet/$id", params: { id: data.id } });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("character_sheets").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message);
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
                    <Label htmlFor="owner-email">E-mail do Dono (opcional)</Label>
                    <Input
                      id="owner-email"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder={user?.email ?? ""}
                    />
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
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
              {s.occupation && (
                <p className="text-sm text-muted-foreground">{s.occupation}</p>
              )}
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
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setToDelete(s)}
                className="absolute top-2 right-2 h-7 w-7 p-0"
              >
                <Trash className="w-3.5 h-3.5" />
              </Button>
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
