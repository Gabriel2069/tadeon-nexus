import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { getAuthRedirectOrigin } from "@/lib/auth-redirect";
import { getAuthErrorMessage, readAuthUrlError } from "@/lib/auth-errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar · Tadeon Nexus" },
      {
        name: "description",
        content:
          "Acesse sua conta no Tadeon Nexus para gerenciar suas fichas de personagem, atributos e mesas de RPG online.",
      },
      { property: "og:title", content: "Entrar · Tadeon Nexus" },
      {
        property: "og:description",
        content:
          "Acesse sua conta no Tadeon Nexus para gerenciar suas fichas de personagem, atributos e mesas de RPG online.",
      },
      { property: "og:url", content: "https://tadeon-nexus.gtadeusz.workers.dev/login" },
    ],
    links: [{ rel: "canonical", href: "https://tadeon-nexus.gtadeusz.workers.dev/login" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    next:
      typeof search.next === "string" &&
      search.next.startsWith("/") &&
      !search.next.startsWith("//")
        ? search.next
        : "",
  }),
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = next || "/";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const urlErrorHandled = useRef(false);

  useEffect(() => {
    if (!loading && session) {
      if (target === "/") void navigate({ to: "/" });
      else window.location.replace(target);
    }
  }, [loading, session, navigate, target]);

  useEffect(() => {
    if (urlErrorHandled.current) return;
    urlErrorHandled.current = true;

    const urlError = readAuthUrlError(window.location.href);
    if (!urlError) return;

    const message = getAuthErrorMessage(urlError, "link");
    setFeedback({ tone: "error", message });
    toast.error(message);

    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = "";
    cleanUrl.searchParams.delete("error");
    cleanUrl.searchParams.delete("error_code");
    cleanUrl.searchParams.delete("error_description");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
  }, []);

  const showError = (error: unknown, action: Parameters<typeof getAuthErrorMessage>[1]) => {
    const message = getAuthErrorMessage(error, action);
    setFeedback({ tone: "error", message });
    toast.error(message);
  };

  const handleForgot = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      const message = "Informe seu e-mail acima primeiro.";
      setFeedback({ tone: "error", message });
      toast.error(message);
      return;
    }

    setFeedback(null);
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${getAuthRedirectOrigin()}/reset-password`,
      });
      if (error) throw error;
      const message =
        "Se este e-mail estiver cadastrado, enviaremos um link de redefinição. Verifique também a pasta de spam.";
      setFeedback({ tone: "success", message });
      toast.success(message);
    } catch (error) {
      showError(error, "recovery-request");
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    if (mode === "signup" && normalizedName.length < 2) {
      const message = "Informe o nome que será exibido na sua conta.";
      setFeedback({ tone: "error", message });
      toast.error(message);
      return;
    }

    setFeedback(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${getAuthRedirectOrigin()}${target}`,
            data: { full_name: normalizedName },
          },
        });
        if (error) throw error;

        if (data.session) {
          const message = "Conta criada. Preparando seu painel…";
          setFeedback({ tone: "success", message });
          toast.success(message);
        } else {
          const message =
            "Cadastro recebido. Confirme o e-mail enviado antes de entrar; verifique também a pasta de spam.";
          setMode("signin");
          setPassword("");
          setFeedback({ tone: "success", message });
          toast.success(message);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        const message = "Login confirmado. Preparando seu painel…";
        setFeedback({ tone: "success", message });
        toast.success(message);
      }
    } catch (err) {
      showError(err, mode === "signup" ? "signup" : "signin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border">
        <div className="text-center mb-6">
          <h1 className="font-cinzel text-3xl font-bold text-primary">Tadeon Nexus · Entrar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" disabled={submitting || resetting} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Cadastrar"}
          </Button>

          {feedback && (
            <div
              role={feedback.tone === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
                feedback.tone === "error"
                  ? "border-destructive/35 bg-destructive/10 text-destructive"
                  : "border-primary/30 bg-primary/10 text-foreground"
              }`}
            >
              {feedback.tone === "error" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </form>

        {mode === "signin" && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleForgot}
              disabled={resetting || submitting}
              className="text-xs text-muted-foreground hover:text-primary hover:underline disabled:opacity-50"
            >
              {resetting ? "Enviando…" : "Esqueceu a senha?"}
            </button>
          </div>
        )}

        <div className="mt-4 text-center text-sm">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setPassword("");
                setFeedback(null);
              }}
              className="text-primary hover:underline"
            >
              Não tem conta? Cadastre-se
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setPassword("");
                setFeedback(null);
              }}
              className="text-primary hover:underline"
            >
              Já tem conta? Entrar
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Voltar
          </Link>
        </p>
      </Card>
    </div>
  );
}
