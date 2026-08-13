import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { getAuthErrorMessage, readAuthUrlError } from "@/lib/auth-errors";
import { BrandMark } from "@/components/brand-mark";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir Senha · Tadeon Nexus" },
      {
        name: "description",
        content: "Defina uma nova senha para sua conta no Tadeon Nexus.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issue, setIssue] = useState("Este link é inválido ou expirou.");

  useEffect(() => {
    let active = true;

    const markInvalid = (error: unknown) => {
      if (!active) return;
      setIssue(getAuthErrorMessage(error, "link"));
      setStatus("invalid");
    };

    const timeout = setTimeout(() => {
      setIssue(
        "A validação demorou mais que o esperado. Solicite um novo link.",
      );
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 12000);

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setStatus("ready");
      }
    });

    void (async () => {
      const urlError = readAuthUrlError(window.location.href);
      if (urlError) {
        markInvalid(urlError);
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        url.searchParams.delete("code");
        window.history.replaceState(
          null,
          "",
          `${url.pathname}${url.search}${url.hash}`,
        );
        if (error) {
          markInvalid(error);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) markInvalid(error);
      else if (data.session) setStatus("ready");
    })().catch(markInvalid);

    return () => {
      active = false;
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
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "password-update"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="tadeon-consent-page">
      <div aria-hidden className="tadeon-consent-thread" />
      <Card className="tadeon-consent-card w-full max-w-md">
        <header className="tadeon-consent-card__header">
          <span className="tadeon-consent-card__mark">
            <BrandMark className="h-8 w-8" />
          </span>
          <div>
            <p className="tadeon-eyebrow">Segurança da conta</p>
            <p className="tadeon-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Tadeon Nexus · Acesso protegido
            </p>
          </div>
        </header>
        <div className="mt-7 flex items-center gap-3">
          <KeyRound aria-hidden className="h-6 w-6 text-primary" />
          <h1 className="font-cinzel text-3xl font-semibold text-primary">
            Redefinir senha
          </h1>
        </div>
        <p className="mb-6 mt-3 text-sm leading-relaxed text-muted-foreground">
          {status === "ready"
            ? "Defina uma nova senha para sua conta."
            : status === "invalid"
              ? issue
              : "Validando link de redefinição…"}
        </p>

        {status === "ready" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
              {submitting ? (
                <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck aria-hidden className="mr-2 h-4 w-4" />
              )}
              {submitting ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </form>
        ) : status === "checking" ? (
          <div
            className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2
              aria-hidden
              className="h-5 w-5 animate-spin text-primary"
            />
            Validando acesso…
          </div>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to="/login" search={{ next: "" }}>
              Solicitar outro link
            </Link>
          </Button>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link
            to="/login"
            search={{ next: "" }}
            className="rounded-sm underline decoration-border underline-offset-4 hover:text-primary"
          >
            Voltar ao login
          </Link>
        </p>
      </Card>
    </main>
  );
}
