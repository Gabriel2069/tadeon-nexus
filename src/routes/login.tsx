import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getAuthRedirectOrigin } from "@/lib/auth-redirect";

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
      { property: "og:url", content: "https://tadeon-nexus.lovable.app/login" },
    ],
    links: [{ rel: "canonical", href: "https://tadeon-nexus.lovable.app/login" }],
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

  useEffect(() => {
    if (!loading && session) {
      if (target === "/") void navigate({ to: "/" });
      else window.location.replace(target);
    }
  }, [loading, session, navigate, target]);

  const handleForgot = async () => {
    if (!email) {
      toast.error("Informe seu e-mail acima primeiro.");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAuthRedirectOrigin()}/reset-password`,
      });
      if (error) throw error;
      toast.success("Enviamos um link para redefinir sua senha. Verifique seu e-mail.");
    } catch {
      toast.error("Não foi possível enviar o e-mail de redefinição.");
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${getAuthRedirectOrigin()}${target}`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Erro desconhecido";
      const msg = /invalid login credentials/i.test(raw)
        ? "E-mail ou senha incorretos."
        : /already registered|user already/i.test(raw)
          ? "E-mail já cadastrado."
          : /password.*(6|8)|weak password/i.test(raw)
            ? "A senha precisa ter ao menos 8 caracteres."
            : /email.*invalid/i.test(raw)
              ? "E-mail inválido."
              : "Não foi possível entrar. Tente novamente.";
      toast.error(msg);
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
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>

        {mode === "signin" && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={handleForgot}
              disabled={resetting}
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
              onClick={() => setMode("signup")}
              className="text-primary hover:underline"
            >
              Não tem conta? Cadastre-se
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("signin")}
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
