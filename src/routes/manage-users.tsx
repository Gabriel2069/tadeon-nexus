import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Crown, Swords, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";
import { deleteUserFn } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/manage-users")({
  head: () => ({
    meta: [
      { title: "Gerenciar Usuários · Tadeon Nexus" },
      { name: "description", content: "Painel do mestre para gerenciar contas, papéis e permissões dos jogadores do Tadeon Nexus." },
      { property: "og:title", content: "Gerenciar Usuários · Tadeon Nexus" },
      { property: "og:description", content: "Painel do mestre para gerenciar contas, papéis e permissões dos jogadores do Tadeon Nexus." },
      { property: "og:url", content: "https://tadeon-nexus.lovable.app/manage-users" },
    ],
    links: [
      { rel: "canonical", href: "https://tadeon-nexus.lovable.app/manage-users" },
    ],
  }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <ManageUsersPage />
    </ProtectedShell>
  ),
});

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
}

function ManageUsersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,email,full_name"),
      supabase.from("user_roles").select("user_id,role,id"),
    ]);
    const merged: UserRow[] = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      role: ((roles ?? []).find((r) => r.user_id === p.id)?.role as AppRole) ?? "jogador",
    }));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const changeRole = async (userId: string, role: AppRole) => {
    const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delError) { toast.error(delError.message); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message);
    else {
      toast.success("Cargo atualizado!");
      setRows((p) => p.map((r) => r.id === userId ? { ...r, role } : r));
    }
  };

  const removeUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      await deleteUserFn({ data: { userId } });
      toast.success("Usuário e fichas removidos.");
      setRows((p) => p.filter((r) => r.id !== userId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const roleStyles: Record<AppRole, { icon: typeof Crown; color: string }> = {
    mestre: { icon: Crown, color: "text-yellow-500" },
    jogador: { icon: Swords, color: "text-blue-500" },
    espectador: { icon: Eye, color: "text-gray-500" },
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="font-cinzel text-2xl md:text-3xl font-bold">Gerenciar Usuários</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Gerencie cargos e remova contas. A exclusão remove o usuário, suas fichas e seu acesso.
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => {
            const Icon = roleStyles[u.role].icon;
            const isSelf = u.id === user?.id;
            return (
              <Card key={u.id} className="p-3 flex items-center justify-between gap-3 transition-all hover:border-primary/40 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.full_name || "Sem nome"}{isSelf && <span className="ml-2 text-[10px] text-primary">(você)</span>}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${roleStyles[u.role].color}`} />
                  <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as AppRole)}>
                    <SelectTrigger className="w-32 md:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mestre">Mestre</SelectItem>
                      <SelectItem value="jogador">Jogador</SelectItem>
                      <SelectItem value="espectador">Espectador</SelectItem>
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isSelf || deletingId === u.id}
                        title={isSelf ? "Você não pode excluir sua própria conta aqui" : "Excluir usuário"}
                        className="h-8 w-8 text-destructive hover:bg-destructive/15 disabled:opacity-40"
                      >
                        {deletingId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação remove permanentemente <b>{u.full_name || u.email}</b>, todas as fichas e o acesso à plataforma. Não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void removeUser(u.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
