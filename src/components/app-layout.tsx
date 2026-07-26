import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Lightbulb,
  Users,
  LogOut,
  Menu,
  X,
  Crown,
  Swords,
  Eye,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  CloudOff,
  Wrench,
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

const roleIcons: Record<string, typeof Crown> = {
  mestre: Crown,
  jogador: Swords,
  espectador: Eye,
};

const COLLAPSE_KEY = "tadeon.sidebar.collapsed";

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

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const RoleIcon = role ? roleIcons[role] : Eye;
  const isMestre = role === "mestre";

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login", search: { next: "" } });
  };

  const renderNav = (mini: boolean, enableSearchShortcut: boolean) => (
    <nav className="space-y-1">
      <GlobalSearch compact={mini} enableShortcut={enableSearchShortcut} />
      <NavItem
        to="/"
        icon={<Home className="w-4 h-4" />}
        label="Dashboard"
        active={path === "/"}
        mini={mini}
        onClick={() => setMobileOpen(false)}
      />
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
    <div className="relative flex h-full flex-col overflow-hidden p-3">
      <ThreadField className="text-sidebar-primary opacity-40" />
      <div className={`relative z-10 mb-6 ${mini ? "text-center" : ""}`}>
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

      <div className="relative z-10 flex-1">{renderNav(mini, enableSearchShortcut)}</div>

      <div className="relative z-10 space-y-1 border-t border-sidebar-border pt-3">
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
          <p className="tadeon-mono mt-3 text-center text-[9px] uppercase text-muted-foreground">
            Arquivo · {new Date().getFullYear()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex relative shrink-0 bg-sidebar/95 text-sidebar-foreground border-r border-sidebar-border shadow-[24px_0_80px_-50px_rgba(0,0,0,.95)] transition-[width] duration-300 ease-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <SidebarContent mini={collapsed} enableSearchShortcut />
        <button
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir" : "Recolher"}
          className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary shadow-md transition-all"
        >
          {collapsed ? (
            <ChevronsRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronsLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/80 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandMark className="h-7 w-7 text-primary" />
            <h1 className="font-cinzel text-lg font-semibold text-primary">Tadeon Nexus</h1>
          </div>
          <div className="flex items-center gap-1">
            <GlobalSearch mobile />
            <button
              onClick={() => setAccountOpen(true)}
              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
              aria-label="Conta"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 animate-in fade-in-0 duration-200">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-secondary transition-colors"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent mini={false} />
          </aside>
        </div>
      )}

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
      title={mini ? label : undefined}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
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
      className={`w-full gap-2 transition-all ${mini ? "justify-center px-2" : "justify-start"} ${
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
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setPassword("");
      setConfirm("");
    }
  }, [open, initialName]);

  const save = async () => {
    setSaving(true);
    try {
      if (name !== initialName) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { error } = await supabase
            .from("profiles")
            .update({ full_name: name })
            .eq("id", u.user.id);
          if (error) throw error;
        }
      }
      if (password) {
        if (password.length < 6) {
          toast.error("A nova senha deve ter pelo menos 6 caracteres.");
          setSaving(false);
          return;
        }
        if (password !== confirm) {
          toast.error("As senhas não coincidem.");
          setSaving(false);
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      toast.success("Conta atualizada!");
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível atualizar a conta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel">Configurações da Conta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">E-mail</Label>
            <Input value={email} disabled className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Nome de exibição</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div className="pt-2 border-t border-border space-y-3">
            <p className="text-xs text-muted-foreground">Trocar senha (opcional)</p>
            <div>
              <Label className="text-xs">Nova senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label className="text-xs">Confirmar senha</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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
