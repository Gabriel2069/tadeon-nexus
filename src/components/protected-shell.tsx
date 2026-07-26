import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRole?: "mestre";
}

export function ProtectedShell({ children, requireRole }: Props) {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      void navigate({ to: "/login", search: { next: "" } });
    }
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireRole && role !== requireRole) {
    return (
      <AppLayout>
        <div className="p-8">
          <h1 className="font-cinzel text-2xl font-bold">Acesso Negado</h1>
          <p className="mt-2 text-muted-foreground">
            Você não tem permissão para acessar esta área.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
