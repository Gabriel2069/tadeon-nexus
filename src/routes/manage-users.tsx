import { PageHeader } from "@/components/page-header";
import { UTILITY_AREAS } from "@/lib/utility-areas";
import { UtilitySummary } from "@/components/utility-summary";
import { Input } from "@/components/ui/input";
import { createLatestRequestGate } from "@/lib/latest-request";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Loader2, Crown, Swords, Eye, Trash2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth";
import { changeUserRoleFn, deleteUserFn, listUsersFn } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/manage-users")({
  head: () => ({
    meta: [
      { title: `${UTILITY_AREAS.users.label} · Tadeon Nexus` },
      {
        name: "description",
        content:
          "Painel do mestre para gerenciar contas, papéis e permissões dos jogadores do Tadeon Nexus.",
      },
      { property: "og:title", content: `${UTILITY_AREAS.users.label} · Tadeon Nexus` },
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

export function ManageUsersPage() {
  const { user, role } = useAuth();
  return <ManageUsersPageContent key={`${user?.id ?? ""}:${role ?? ""}`} />;
}

function ManageUsersPageContent() {
  const { user, role: actorRole } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pending, setPending] = useState<{ user: UserRow; role?: AppRole } | null>(null);
  const requests = useRef(createLatestRequestGate());
  const actor = `${user?.id ?? ""}:${actorRole ?? ""}`;
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const alive = useRef(false);
  const mutationRef = useRef(false);

  const load = useCallback(async () => {
    const ticket = requests.current.begin();
    const currentActor = actor;
    const current = () =>
      alive.current && actorRef.current === currentActor && requests.current.isCurrent(ticket);
    setLoading(true);
    setLoadError(false);
    try {
      const { users } = await listUsersFn();
      if (current()) setRows(users as UserRow[]);
    } catch {
      if (current()) setLoadError(true);
    } finally {
      if (current()) setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    alive.current = true;
    setRows([]);
    setPending(null);
    setBusyId(null);
    void load();
    const gate = requests.current;
    return () => {
      alive.current = false;
      gate.invalidate();
    };
  }, [load]);

  const applyChange = async () => {
    if (!pending || mutationRef.current || pending.user.id === user?.id) return;
    const operation = pending;
    const currentActor = actor;
    const current = () => alive.current && actorRef.current === currentActor;
    mutationRef.current = true;
    requests.current.invalidate();
    setBusyId(operation.user.id);
    try {
      if (operation.role)
        await changeUserRoleFn({ data: { userId: operation.user.id, role: operation.role } });
      else await deleteUserFn({ data: { userId: operation.user.id } });
      if (!current()) return;
      setPending(null);
      toast.success(operation.role ? "Papel atualizado." : "Conta excluída.");
      await load();
    } catch {
      if (current())
        toast.error(
          operation.role
            ? "Não foi possível atualizar o papel. Tente novamente."
            : "Não foi possível excluir a conta. Tente novamente.",
        );
    } finally {
      mutationRef.current = false;
      if (current()) setBusyId(null);
    }
  };
  const labels: Record<AppRole, string> = {
    mestre: "Mestre",
    jogador: "Jogador",
    espectador: "Espectador",
  };
  const icons: Record<AppRole, typeof Crown> = { mestre: Crown, jogador: Swords, espectador: Eye };
  const filtered = rows.filter(
    (row) =>
      (roleFilter === "all" || row.role === roleFilter) &&
      `${row.full_name ?? ""} ${row.email ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.trim().toLocaleLowerCase("pt-BR")),
  );
  const count = (role: AppRole) =>
    loading || loadError ? "--" : rows.filter((row) => row.role === role).length;
  return (
    <div data-page-layout className="tadeon-page tadeon-route-users space-y-6">
      <PageHeader
        section="users"
        eyebrow="Administração do arquivo"
        title={UTILITY_AREAS.users.label}
        description="Encontre pessoas, revise seus papéis e controle o acesso ao Nexus. Cada alteração é confirmada antes de ser aplicada."
      />
      <UtilitySummary
        items={[
          {
            label: "Mestres",
            value: count("mestre"),
            detail: "Administração e condução da campanha",
          },
          {
            label: "Jogadores",
            value: count("jogador"),
            detail: "Participação e fichas da personagem",
          },
          {
            label: "Espectadores",
            value: count("espectador"),
            detail: "Consulta conforme as permissões disponíveis",
          },
        ]}
      />
      <div className="tadeon-utility-toolbar">
        <label>
          Buscar pessoas
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou e-mail"
          />
        </label>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por papel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            {Object.entries(labels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" disabled={loading || Boolean(busyId)} onClick={() => void load()}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Atualizar lista
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {loading
          ? "Carregando usuários…"
          : loadError
            ? "Lista indisponível"
            : `${filtered.length} de ${rows.length} pessoas`}
      </p>
      {loading ? (
        <Card className="grid min-h-48 place-items-center">
          <Loader2 className="h-7 w-7 animate-spin" aria-label="Carregando" />
        </Card>
      ) : loadError ? (
        <Card className="p-8 text-center">
          <h2 className="font-medium">Não foi possível carregar os usuários.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-medium">
            {rows.length ? "Nenhuma pessoa encontrada" : "Nenhum usuário cadastrado"}
          </h2>
          {rows.length > 0 && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setRoleFilter("all");
              }}
            >
              Limpar filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="tadeon-users-list space-y-3">
          {filtered.map((row) => {
            const isSelf = row.id === user?.id;
            const Icon = icons[row.role];
            return (
              <Card
                key={row.id}
                className="tadeon-user-row grid gap-4 border-border/70 bg-card/65 p-4 sm:p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="tadeon-user-row__sigil" aria-hidden>
                    {(row.full_name || row.email || "?").trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {row.full_name || "Sem nome"}
                      {isSelf && <span className="ml-2 text-xs text-primary">Você</span>}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">
                      {row.email || "E-mail indisponível"}
                    </p>
                    {isSelf && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Seu próprio papel e sua conta estão protegidos aqui.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Select
                    value={row.role}
                    disabled={isSelf || Boolean(busyId)}
                    onValueChange={(next) => {
                      if (next !== row.role) setPending({ user: row, role: next as AppRole });
                    }}
                  >
                    <SelectTrigger
                      className="min-w-0 flex-1 sm:w-36"
                      aria-label={`Papel de ${row.full_name || row.email || "usuário"}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(labels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={isSelf || Boolean(busyId)}
                    aria-label={`Excluir ${row.full_name || row.email || "usuário"}`}
                    onClick={() => setPending({ user: row })}
                    className="shrink-0 text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !busyId) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.role ? "Alterar papel de acesso?" : "Excluir conta permanentemente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.role ? (
                <>
                  O papel de <strong>{pending.user.full_name || pending.user.email}</strong> passará
                  de {labels[pending.user.role]} para <strong>{labels[pending.role]}</strong>.{" "}
                  {pending.role === "mestre"
                    ? "Mestres podem administrar usuários e dados da campanha."
                    : "O acesso seguirá as permissões desse papel."}
                </>
              ) : (
                <>
                  A conta de <strong>{pending?.user.full_name || pending?.user.email}</strong> e
                  suas fichas serão removidas. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(busyId)}
              onClick={(event) => {
                event.preventDefault();
                void applyChange();
              }}
              className={pending?.role ? undefined : "bg-destructive text-destructive-foreground"}
            >
              {busyId && <Loader2 className="animate-spin" />}
              {pending?.role ? "Confirmar alteração" : "Excluir conta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
