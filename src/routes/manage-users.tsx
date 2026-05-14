import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Crown, Swords, Eye } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";

export const Route = createFileRoute("/manage-users")({
  head: () => ({ meta: [{ title: "Gerenciar Usuários — Tadeon Nexus" }] }),
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
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const roleStyles: Record<AppRole, { icon: typeof Crown; color: string }> = {
    mestre: { icon: Crown, color: "text-yellow-500" },
    jogador: { icon: Swords, color: "text-blue-500" },
    espectador: { icon: Eye, color: "text-gray-500" },
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="font-cinzel text-2xl md:text-3xl font-bold">Gerenciar Usuários</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Gerencie os cargos dos usuários para controlar o acesso às funcionalidades.
      </p>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((u) => {
            const Icon = roleStyles[u.role].icon;
            return (
              <Card key={u.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.full_name || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${roleStyles[u.role].color}`} />
                  <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as AppRole)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mestre">Mestre</SelectItem>
                      <SelectItem value="jogador">Jogador</SelectItem>
                      <SelectItem value="espectador">Espectador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
