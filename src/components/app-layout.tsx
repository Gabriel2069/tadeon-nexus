import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const roleIcons: Record<string, typeof Crown> = {
  mestre: Crown,
  jogador: Swords,
  espectador: Eye,
};

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const RoleIcon = role ? roleIcons[role] : Eye;
  const isMestre = role === "mestre";

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  const NavLinks = (
    <nav className="space-y-1">
      <NavItem to="/" icon={<Home className="w-4 h-4" />} label="Dashboard" active={path === "/"} onClick={() => setMobileOpen(false)} />
      {isMestre && (
        <>
          <NavItem
            to="/master-panel"
            icon={<Lightbulb className="w-4 h-4" />}
            label="Painel do Mestre"
            active={path.startsWith("/master-panel")}
            onClick={() => setMobileOpen(false)}
          />
          <NavItem
            to="/manage-users"
            icon={<Users className="w-4 h-4" />}
            label="Gerenciar Usuários"
            active={path.startsWith("/manage-users")}
            onClick={() => setMobileOpen(false)}
          />
        </>
      )}
    </nav>
  );

  const Sidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6">
        <h1 className="font-cinzel text-xl font-bold text-primary">Tadeon Nexus</h1>
        <p className="mt-1 text-xs text-muted-foreground truncate">{profile?.full_name || user?.email}</p>
        {role && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-primary">
            <RoleIcon className="w-3 h-3" />
            <span className="capitalize">{role}</span>
          </div>
        )}
      </div>

      <div className="flex-1">{NavLinks}</div>

      <div className="pt-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          © {new Date().getFullYear()} Gabriel Tadeu
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        {Sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-secondary"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-cinzel text-lg font-bold text-primary">Tadeon Nexus</h1>
          <div className="w-7" />
        </header>

        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-secondary"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
            {Sidebar}
          </aside>
        </div>
      )}
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
