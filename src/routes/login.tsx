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

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Tadeon Nexus" },
      { name: "description", content: "Acesse sua conta no Tadeon Nexus." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/" });
  }, [loading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
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
      const msg =
        /invalid login credentials/i.test(raw) ? "E-mail ou senha incorretos." :
        /already registered|user already/i.test(raw) ? "E-mail já cadastrado." :
        /password.*6/i.test(raw) ? "A senha precisa ter ao menos 6 caracteres." :
        /email.*invalid/i.test(raw) ? "E-mail inválido." :
        raw;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border">
        <div className="text-center mb-6">
          <h1 className="font-cinzel text-3xl font-bold text-primary">Tadeon Nexus</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Entre na sua conta" : "Crie sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "signin" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>

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
          <Link to="/" className="hover:text-primary">Voltar</Link>
        </p>
      </Card>
    </div>
  );
}
