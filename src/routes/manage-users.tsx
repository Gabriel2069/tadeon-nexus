import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Crown,
  Swords,
  Eye,
  Trash2,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";
import {
  changeUserRoleFn,
  deleteUserFn,
  listUsersFn,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/manage-users")({
  head: () => ({
    meta: [
      { title: "Gerenciar Usuários · Tadeon Nexus" },
      {
        name: "description",
        content:
          "Painel do mestre para gerenciar contas, papéis e permissões dos jogadores do Tadeon Nexus.",
      },
      { property: "og:title", content: "Gerenciar Usuários · Tadeon Nexus" },
      {
        property: "og:description",
        content:
          "Painel do mestre para gerenciar contas, papéis e permissões dos jogadores do Tadeon Nexus.",
      },
      {
        property: "og:url",
        content: "https://tadeon-nexus.gtadeusz.workers.dev/manage-users",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://tadeon-nexus.gtadeusz.workers.dev/manage-users",
      },
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
  const [loadError, setLoadError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { users } = await listUsersFn();
      setRows(users as UserRow[]);
    } catch {
      setLoadError(true);
      toast.error("Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changeRole = async (userId: string, role: AppRole) => {
    setChangingId(userId);
    try {
      await changeUserRoleFn({ data: { userId, role } });
      toast.success("Cargo atualizado!");
      setRows((p) => p.map((r) => (r.id === userId ? { ...r, role } : r)));
    } catch {
      toast.error("Não foi possível atualizar o cargo.");
    } finally {
      setChangingId(null);
    }
  };

  const removeUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      await deleteUserFn({ data: { userId } });
      toast.success("Usuário e fichas removidos.");
      setRows((p) => p.filter((r) => r.id !== userId));
    } catch {
      toast.error("Não foi possível excluir o usuário.");
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
    <div className="tadeon-page tadeon-route-users max-w-5xl">
      <header className="tadeon-page-hero mb-6 flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="tadeon-eyebrow">Administração do arquivo</p>
          <h1 className="mt-1 font-cinzel text-2xl font-semibold md:text-3xl">
            Gerenciar usuários
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ajuste papéis e remova contas. A exclusão também remove as fichas e
            o acesso da pessoa ao Nexus.
          </p>
        </div>
        {!loading && !loadError && (
          <div className="flex min-h-11 items-center gap-2 self-start rounded-xl border border-border/70 bg-card/55 px-3 text-sm sm:self-auto">
            <Users className="h-4 w-4 text-primary" />
            <strong>{rows.length}</strong>
            <span className="text-muted-foreground">
              {rows.length === 1 ? "usuário" : "usuários"}
            </span>
          </div>
        )}
      </header>

      {loading ? (
        <div className="tadeon-surface flex min-h-56 items-center justify-center rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="sr-only">Carregando usuários</span>
        </div>
      ) : loadError ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium">
            Não foi possível carregar os usuários.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center sm:p-10">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nenhum usuário cadastrado.</p>
        </Card>
      ) : (
        <div className="tadeon-users-list space-y-3">
          {rows.map((u) => {
            const Icon = roleStyles[u.role].icon;
            const isSelf = u.id === user?.id;
            return (
              <Card
                key={u.id}
                className="tadeon-user-row grid gap-4 border-border/70 bg-card/65 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="tadeon-user-row__sigil" aria-hidden>
                    {(u.full_name || u.email || "?")
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {u.full_name || "Sem nome"}
                      {isSelf && (
                        <span className="ml-2 text-[11px] font-semibold text-primary">
                          Você
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2 sm:flex">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${roleStyles[u.role].color}`}
                      aria-hidden
                    />
                    <Select
                      value={u.role}
                      disabled={isSelf || changingId === u.id}
                      onValueChange={(v) => void changeRole(u.id, v as AppRole)}
                    >
                      <SelectTrigger
                        className="w-full sm:w-36"
                        aria-label={`Papel de ${u.full_name || u.email || "usuário"}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mestre">Mestre</SelectItem>
                        <SelectItem value="jogador">Jogador</SelectItem>
                        <SelectItem value="espectador">Espectador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isSelf || deletingId === u.id}
                        title={
                          isSelf
                            ? "Você não pode excluir sua própria conta aqui"
                            : "Excluir usuário"
                        }
                        className="h-11 w-11 text-destructive hover:bg-destructive/15 disabled:opacity-40"
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação remove permanentemente{" "}
                          <b>{u.full_name || u.email}</b>, todas as fichas e o
                          acesso à plataforma. Não pode ser desfeita.
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
