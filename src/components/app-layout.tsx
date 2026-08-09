import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Lightbulb,
  Users,
  LogOut,
  Menu,
  Crown,
  Swords,
  Eye,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  CloudOff,
  Download,
  Mail,
  ShieldCheck,
  Wrench,
  LibraryBig,
  MapPinned,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandMark, ThreadField } from "@/components/brand-mark";
import { GlobalSearch } from "@/components/global-search";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { isApplicationAdministrator } from "@/lib/permissions";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

const roleIcons: Record<string, typeof Crown> = {
  mestre: Crown,
  jogador: Swords,
  espectador: Eye,
};

const COLLAPSE_KEY = "tadeon.sidebar.collapsed";
const NAV_FLAGS_KEY = "tadeon.navigation.flags";

interface NavigationFlags {
  knowledge: boolean;
  tabletop: boolean;
}

const DEFAULT_NAVIGATION_FLAGS: NavigationFlags = {
  knowledge: false,
  tabletop: false,
};

function readNavigationFlags(userId?: string): NavigationFlags {
  if (typeof window === "undefined" || !userId) return DEFAULT_NAVIGATION_FLAGS;
  try {
    const value = window.localStorage.getItem(`${NAV_FLAGS_KEY}:${userId}`);
    if (!value) return DEFAULT_NAVIGATION_FLAGS;
    const parsed = JSON.parse(value) as Partial<NavigationFlags>;
    return {
      knowledge: parsed.knowledge === true,
      tabletop: parsed.tabletop === true,
    };
  } catch {
    return DEFAULT_NAVIGATION_FLAGS;
  }
}

function storeNavigationFlags(userId: string, flags: NavigationFlags) {
  try {
    // Feature visibility is not an authorization boundary. Persisting this harmless
    // presentation cache prevents O Nexus and Mesa Nexus from briefly disappearing
    // on every new tab while the secure flag repository is refreshed.
    window.localStorage.setItem(
      `${NAV_FLAGS_KEY}:${userId}`,
      JSON.stringify(flags),
    );
  } catch {
    // Navegação continua funcional mesmo quando o armazenamento está indisponível.
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, user, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });
  const [accountOpen, setAccountOpen] = useState(false);
  const [navigationFlags, setNavigationFlags] = useState<NavigationFlags>(() =>
    readNavigationFlags(user?.id),
  );

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const userId = user.id;
    const cached = readNavigationFlags(userId);
    setNavigationFlags(cached);

    const refreshFlags = () => {
      void loadFeatureFlags(userId).then((flags) => {
        if (!active) return;
        const next = {
          knowledge: flags.nexus_knowledge_enabled,
          tabletop: flags.nexus_tabletop_enabled,
        };
        setNavigationFlags(next);
        storeNavigationFlags(userId, next);
      });
    };

    refreshFlags();
    window.addEventListener("focus", refreshFlags);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshFlags);
    };
  }, [user?.id]);

  const RoleIcon = role ? roleIcons[role] : Eye;
  const isMestre = isApplicationAdministrator({ appRole: role });
  const knowledgeEnabled =
    navigationFlags.knowledge || path.startsWith("/nexus");
  const tabletopEnabled =
    navigationFlags.tabletop || path.startsWith("/tabletop");
  const currentSection = path.startsWith("/sheet/")
    ? "Ficha"
    : path.startsWith("/nexus-tools")
      ? "Saúde do arquivo"
      : path.startsWith("/nexus")
        ? "O Nexus"
        : path.startsWith("/tabletop")
          ? "Mesa Nexus"
          : path.startsWith("/master-panel")
            ? "Painel do Mestre"
            : path.startsWith("/manage-users")
              ? "Usuários"
              : path.startsWith("/offline")
                ? "Consulta offline"
                : "Dashboard";

  const handleSignOut = async () => {
    try {
      await signOut();
      void navigate({ to: "/login", search: { next: "" } });
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "session"));
    }
  };

  const renderNav = (mini: boolean, enableSearchShortcut: boolean) => (
    <nav
      className="tadeon-primary-nav space-y-1"
      aria-label="Navegação principal"
    >
      <GlobalSearch compact={mini} enableShortcut={enableSearchShortcut} />
      <NavItem
        to="/"
        icon={<Home className="w-4 h-4" />}
        label="Dashboard"
        active={path === "/"}
        mini={mini}
        onClick={() => setMobileOpen(false)}
      />
      {knowledgeEnabled && (
        <NavItem
          to="/nexus"
          icon={<LibraryBig className="w-4 h-4" />}
          label="O Nexus"
          active={path.startsWith("/nexus")}
          mini={mini}
          onClick={() => setMobileOpen(false)}
        />
      )}
      {tabletopEnabled && (
        <NavItem
          to="/tabletop"
          icon={<MapPinned className="w-4 h-4" />}
          label="Mesa Nexus"
          active={path.startsWith("/tabletop")}
          mini={mini}
          onClick={() => setMobileOpen(false)}
        />
      )}
      {isMestre && (
        <>
          <NavItem
            to="/master-panel"
            icon={<Lightbulb className="w-4 h-4" />}
            label="Painel do Mestre"
            active={path.startsWith("/master-panel")}
            mini={mini}
            onClick={() => setMobileOpen(false)}
          />
          <NavItem
            to="/manage-users"
            icon={<Users className="w-4 h-4" />}
            label="Gerenciar Usuários"
            active={path.startsWith("/manage-users")}
            mini={mini}
            onClick={() => setMobileOpen(false)}
          />
          <NavItem
            to="/nexus-tools"
            icon={<Wrench className="w-4 h-4" />}
            label="Backup & Diagnóstico"
            active={path.startsWith("/nexus-tools")}
            mini={mini}
            onClick={() => setMobileOpen(false)}
          />
        </>
      )}
      <NavItem
        to="/offline"
        icon={<CloudOff className="w-4 h-4" />}
        label="Consulta Offline"
        active={path.startsWith("/offline")}
        mini={mini}
        onClick={() => setMobileOpen(false)}
      />
    </nav>
  );

  const SidebarContent = ({
    mini,
    enableSearchShortcut = false,
  }: {
    mini: boolean;
    enableSearchShortcut?: boolean;
  }) => (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ThreadField className="text-sidebar-primary opacity-40" />
      <div
        className={`relative z-10 mb-4 shrink-0 ${mini ? "text-center" : ""}`}
      >
        {mini ? (
          <BrandMark className="mx-auto h-9 w-9 text-primary" />
        ) : (
          <>
            <div className="flex items-center gap-3 px-1 pt-1">
              <BrandMark className="h-11 w-11 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="tadeon-eyebrow">Fio-Mestre</div>
                <h1 className="font-cinzel text-xl font-semibold leading-none text-primary">
                  Tadeon Nexus
                </h1>
              </div>
            </div>
            <div className="mt-4 border-l border-primary/25 pl-3">
              <p className="truncate text-xs text-muted-foreground">
                {profile?.full_name || user?.email}
              </p>
            </div>
            {role && (
              <div className="mt-1 flex items-center gap-1.5 pl-3 text-[11px] text-primary">
                <RoleIcon className="w-3 h-3" />
                <span className="capitalize">{role}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {renderNav(mini, enableSearchShortcut)}
      </div>

      <div className="relative z-10 shrink-0 space-y-1 border-t border-sidebar-border pt-3">
        <SideAction
          mini={mini}
          icon={<Settings className="w-4 h-4" />}
          label="Conta"
          onClick={() => {
            setMobileOpen(false);
            setAccountOpen(true);
          }}
        />
        <SideAction
          mini={mini}
          icon={<LogOut className="w-4 h-4" />}
          label="Sair"
          danger
          onClick={handleSignOut}
        />
        {!mini && (
          <p className="tadeon-mono mt-3 text-center text-[10px] uppercase text-muted-foreground">
            Arquivo · {new Date().getFullYear()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="tadeon-shell relative isolate flex min-h-screen overflow-x-clip">
      <div aria-hidden className="tadeon-ambient tadeon-ambient--veil" />
      <div aria-hidden className="tadeon-ambient tadeon-ambient--flow" />
      {/* Desktop sidebar */}
      <aside
        className={`tadeon-sidebar relative z-20 hidden shrink-0 border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-[24px_0_80px_-50px_rgba(0,0,0,.95)] md:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent mini={collapsed} enableSearchShortcut />
        <button
          type="button"
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir" : "Recolher"}
          className="absolute -right-5 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:border-primary/45 hover:text-primary active:scale-[.97]"
        >
          {collapsed ? (
            <ChevronsRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronsLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="tadeon-mobile-header sticky top-0 z-30 grid min-h-16 grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center bg-background/85 px-3 py-2 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-border hover:bg-secondary active:scale-[.97]"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <BrandMark className="hidden h-7 w-7 shrink-0 text-primary min-[360px]:block" />
            <div className="min-w-0 text-center min-[360px]:text-left">
              <p className="tadeon-mono truncate text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Tadeon Nexus
              </p>
              <p className="font-cinzel truncate text-sm font-semibold leading-tight text-primary">
                {currentSection}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1">
            <GlobalSearch mobile />
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-border hover:bg-secondary active:scale-[.97]"
              aria-label="Conta"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main key={path} className="tadeon-route-stage min-w-0 flex-1">
          {children}
        </main>
      </div>

      {/* Mobile drawer: Radix preserves focus, Escape and symmetric exit motion. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="h-[100dvh] w-[min(18rem,86vw)] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-none md:hidden"
        >
          <SheetTitle className="sr-only">Navegação principal</SheetTitle>
          <SheetDescription className="sr-only">
            Acesse as áreas do Tadeon Nexus e as opções da sua conta.
          </SheetDescription>
          <SidebarContent mini={false} />
        </SheetContent>
      </Sheet>

      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        initialName={profile?.full_name || ""}
        email={user?.email || ""}
        onSaved={() => refresh()}
      />
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  mini,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  mini: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={mini ? label : undefined}
      className={`tadeon-nav-item group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[.98] ${
        mini ? "justify-center px-2" : ""
      } ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_var(--sidebar-primary)]"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
      }`}
    >
      {icon}
      {!mini && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SideAction({
  icon,
  label,
  onClick,
  mini,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  mini: boolean;
  danger?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      title={mini ? label : undefined}
      className={`w-full gap-2 ${mini ? "justify-center px-2" : "justify-start"} ${
        danger
          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      {icon}
      {!mini && label}
    </Button>
  );
}

function AccountDialog({
  open,
  onOpenChange,
  initialName,
  email,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialName: string;
  email: string;
  onSaved?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [newEmail, setNewEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setNewEmail(email);
      setPassword("");
      setConfirm("");
    }
  }, [email, open, initialName]);

  const save = async () => {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedEmail = newEmail.trim().toLowerCase();
      if (!trimmedName) {
        toast.error("Informe um nome de exibição.");
        return;
      }
      if (trimmedName !== initialName) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const [{ error }, { error: metadataError }] = await Promise.all([
            supabase
              .from("profiles")
              .update({ full_name: trimmedName })
              .eq("id", u.user.id),
            supabase.auth.updateUser({ data: { full_name: trimmedName } }),
          ]);
          if (error) throw error;
          if (metadataError) throw metadataError;
        }
      }
      if (trimmedEmail && trimmedEmail !== email.toLowerCase()) {
        const { error } = await supabase.auth.updateUser({
          email: trimmedEmail,
        });
        if (error) throw error;
        toast.info(
          "Enviamos as confirmações necessárias para trocar o e-mail.",
        );
      }
      if (password) {
        if (password.length < 8) {
          toast.error("A nova senha deve ter pelo menos 8 caracteres.");
          return;
        }
        if (password !== confirm) {
          toast.error("As senhas não coincidem.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      toast.success("Configurações pessoais atualizadas.");
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "account-update"));
    } finally {
      setSaving(false);
    }
  };

  const signOutOtherSessions = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("As outras sessões foram encerradas.");
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "session"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-cinzel">
            Configurações da Conta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Identidade</p>
            </div>
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="mt-1"
            />
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              A troca só termina após as confirmações de segurança enviadas por
              e-mail.
            </p>
            <div className="mt-3">
              <Label className="text-xs">Nome de exibição</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1"
                maxLength={80}
              />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Segurança</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Trocar senha (opcional)
            </p>
            <div>
              <Label className="text-xs">Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Mínimo 8 caracteres recomendado"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label className="text-xs">Confirmar senha</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1"
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void signOutOtherSessions()}
              disabled={saving}
            >
              Encerrar outras sessões
            </Button>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Seus dados</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Mestres podem gerar cópias independentes de fichas e
              configurações.
            </p>
            <Button
              asChild
              type="button"
              variant="outline"
              className="mt-3 w-full"
            >
              <Link to="/nexus-tools" onClick={() => onOpenChange(false)}>
                Abrir Backup & Diagnóstico
              </Link>
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
