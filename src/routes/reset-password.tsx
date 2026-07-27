import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir Senha · Tadeon Nexus" },
      { name: "description", content: "Defina uma nova senha para sua conta no Tadeon Nexus." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase puts recovery token in the URL hash on email click.
    // The client auto-exchanges it for a session. Just wait for the session.
    const timeout = setTimeout(
      () => setStatus((current) => (current === "checking" ? "invalid" : current)),
      8000,
    );
    void supabase.auth.getSession().then(({ data, error }) => {
      if (data.session) setStatus("ready");
      else if (error) setStatus("invalid");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setStatus("ready");
      }
    });
    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida! Você já está conectado.");
      void navigate({ to: "/" });
    } catch {
      toast.error("Não foi possível redefinir a senha. Solicite um novo link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border">
        <h1 className="font-cinzel text-2xl font-bold text-primary text-center mb-2">
          Redefinir Senha
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {status === "ready"
            ? "Defina uma nova senha para sua conta."
            : status === "invalid"
              ? "Este link é inválido ou expirou."
              : "Validando link de redefinição…"}
        </p>

        {status === "ready" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        ) : status === "checking" ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to="/login" search={{ next: "" }}>
              Solicitar outro link
            </Link>
          </Button>
        )}

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          <Link to="/login" search={{ next: "" }} className="hover:text-primary">
            Voltar ao login
          </Link>
        </p>
      </Card>
    </div>
  );
}
