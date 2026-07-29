import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArchiveRestore,
  CheckCircle2,
  CircleAlert,
  Cloud,
  Database,
  Download,
  FileClock,
  FileUp,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wifi,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  createNexusBackup,
  deleteSnapshot,
  downloadNexusBackup,
  getSnapshot,
  listSnapshots,
  parseNexusBackup,
  saveSnapshot,
  type NexusBackup,
  type SnapshotSummary,
} from "@/lib/nexus-backup";
import { readOfflineCache } from "@/lib/offline-cache";

export const Route = createFileRoute("/nexus-tools")({
  head: () => ({
    meta: [
      { title: "Integridade & Backup · Tadeon Nexus" },
      {
        name: "description",
        content: "Diagnóstico, cópias de segurança e restauração do Tadeon Nexus.",
      },
    ],
  }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <NexusToolsPage />
    </ProtectedShell>
  ),
});

type DiagnosticLevel = "healthy" | "warning" | "error";

interface DiagnosticResult {
  id: string;
  label: string;
  detail: string;
  level: DiagnosticLevel;
}

function NexusToolsPage() {
  const [working, setWorking] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [pendingRestore, setPendingRestore] = useState<NexusBackup | null>(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshSnapshots = useCallback(async () => {
    try {
      setSnapshots(await listSnapshots());
    } catch {
      setSnapshots([]);
    }
  }, []);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  const collectBackup = async (): Promise<NexusBackup> => {
    const [{ data: sheets, error: sheetsError }, { data: settings, error: settingsError }] =
      await Promise.all([
        supabase.from("character_sheets").select("*").order("created_at"),
        supabase.from("game_settings").select("*").order("updated_at"),
      ]);
    if (sheetsError || settingsError) throw new Error("backup");
    return createNexusBackup(
      (sheets ?? []) as unknown as Record<string, unknown>[],
      (settings ?? []) as unknown as Record<string, unknown>[],
    );
  };

  const createSnapshot = async (download: boolean) => {
    setWorking(true);
    try {
      const backup = await collectBackup();
      let storedLocally = true;
      try {
        await saveSnapshot(backup, snapshotLabel || "Antes da sessão");
      } catch {
        storedLocally = false;
      }
      if (download) downloadNexusBackup(backup);
      if (!storedLocally && !download) throw new Error("local-history");
      setSnapshotLabel("");
      await refreshSnapshots();
      if (!storedLocally) {
        toast.warning("Backup baixado, mas o navegador bloqueou o histórico local.");
      } else {
        toast.success(
          download ? "Backup gerado e salvo no histórico local." : "Ponto de restauração criado.",
        );
      }
    } catch {
      toast.error("Não foi possível criar a cópia de segurança.");
    } finally {
      setWorking(false);
    }
  };

  const restoreBackup = async () => {
    if (!pendingRestore) return;
    setWorking(true);
    try {
      const safetyCopy = await collectBackup();
      await saveSnapshot(safetyCopy, "Cópia automática antes da restauração");

      const sheetResult = pendingRestore.characterSheets.length
        ? await supabase
            .from("character_sheets")
            .upsert(pendingRestore.characterSheets as never, { onConflict: "id" })
        : { error: null };
      const settingsResult = pendingRestore.gameSettings.length
        ? await supabase
            .from("game_settings")
            .upsert(pendingRestore.gameSettings as never, { onConflict: "id" })
        : { error: null };
      if (sheetResult.error || settingsResult.error) throw new Error("restore");

      toast.success("Backup mesclado com sucesso. Nenhum registro ausente foi excluído.");
      setPendingRestore(null);
      setPendingLabel("");
      await refreshSnapshots();
    } catch {
      toast.error(
        "A restauração foi interrompida. A cópia automática anterior permanece no histórico local.",
      );
    } finally {
      setWorking(false);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseNexusBackup(JSON.parse(await file.text()) as unknown);
      setPendingRestore(parsed);
      setPendingLabel(file.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Arquivo de backup inválido.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const loadStoredSnapshot = async (id: string) => {
    try {
      const snapshot = await getSnapshot(id);
      if (!snapshot) throw new Error("missing");
      setPendingRestore(snapshot.backup);
      setPendingLabel(snapshot.label);
    } catch {
      toast.error("Não foi possível abrir esse ponto de restauração.");
    }
  };

  const downloadStoredSnapshot = async (id: string) => {
    try {
      const snapshot = await getSnapshot(id);
      if (!snapshot) throw new Error("missing");
      downloadNexusBackup(snapshot.backup);
    } catch {
      toast.error("Não foi possível baixar esse ponto de restauração.");
    }
  };

  const removeStoredSnapshot = async (id: string) => {
    try {
      await deleteSnapshot(id);
      await refreshSnapshots();
      toast.success("Ponto removido do histórico local.");
    } catch {
      toast.error("Não foi possível remover o ponto.");
    }
  };

  const runDiagnostics = useCallback(async () => {
    setChecking(true);
    const results: DiagnosticResult[] = [];
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    results.push({
      id: "network",
      label: "Conectividade",
      detail: online ? "O navegador está conectado à rede." : "O navegador está em modo offline.",
      level: online ? "healthy" : "warning",
    });

    try {
      const { data } = await supabase.auth.getUser();
      results.push({
        id: "auth",
        label: "Sessão autenticada",
        detail: data.user
          ? "Sessão válida e pronta para consultas."
          : "A sessão precisa ser renovada.",
        level: data.user ? "healthy" : "error",
      });
    } catch {
      results.push({
        id: "auth",
        label: "Sessão autenticada",
        detail: "Não foi possível validar a sessão agora.",
        level: "error",
      });
    }

    try {
      const { data, error } = await supabase
        .from("game_settings")
        .select("id,rules_version,updated_at")
        .eq("key", "global")
        .maybeSingle();
      results.push({
        id: "settings",
        label: "Dados do mestre",
        detail:
          !error && data
            ? `Configuração global acessível · regras v${data.rules_version}.`
            : "A configuração global não respondeu corretamente.",
        level: !error && data ? "healthy" : "error",
      });
    } catch {
      results.push({
        id: "settings",
        label: "Dados do mestre",
        detail: "Não foi possível consultar a configuração global.",
        level: "error",
      });
    }

    try {
      const startedAt = performance.now();
      const { data, error } = await supabase.rpc("project_heartbeat");
      const latency = Math.round(performance.now() - startedAt);
      results.push({
        id: "heartbeat",
        label: "Saúde do Supabase",
        detail:
          !error && data
            ? `Banco respondeu em ${latency} ms · ${new Date(data).toLocaleString("pt-BR")}.`
            : "O teste controlado do banco não respondeu.",
        level: !error && data ? (latency < 1500 ? "healthy" : "warning") : "error",
      });
    } catch {
      results.push({
        id: "heartbeat",
        label: "Saúde do Supabase",
        detail: "Não foi possível medir a resposta do banco.",
        level: "error",
      });
    }

    try {
      const { count, error } = await supabase
        .from("app_error_logs")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null);
      results.push({
        id: "errors",
        label: "Monitoramento de erros",
        detail: error
          ? "O coletor ainda não está disponível."
          : count
            ? `${count} ocorrência(s) não resolvida(s) aguardando revisão.`
            : "Nenhuma ocorrência não resolvida nas últimas capturas.",
        level: error ? "warning" : count ? "warning" : "healthy",
      });
    } catch {
      results.push({
        id: "errors",
        label: "Monitoramento de erros",
        detail: "Não foi possível consultar as ocorrências.",
        level: "warning",
      });
    }

    try {
      const { count, error } = await supabase
        .from("character_sheets")
        .select("id", { count: "exact", head: true });
      results.push({
        id: "sheets",
        label: "Arquivo de fichas",
        detail: !error ? `${count ?? 0} ficha(s) acessível(is).` : "A consulta às fichas falhou.",
        level: error ? "error" : "healthy",
      });
    } catch {
      results.push({
        id: "sheets",
        label: "Arquivo de fichas",
        detail: "Não foi possível consultar as fichas.",
        level: "error",
      });
    }

    const offlineCache = readOfflineCache();
    const cacheDate = new Date(offlineCache.updatedAt);
    const cacheValid = Number.isFinite(cacheDate.getTime()) && cacheDate.getTime() > 0;
    results.push({
      id: "offline",
      label: "Consulta offline",
      detail: cacheValid
        ? `Última cópia local: ${cacheDate.toLocaleString("pt-BR")}.`
        : "A cópia offline será criada após abrir uma ficha ou o painel.",
      level: cacheValid ? "healthy" : "warning",
    });

    const serviceWorkerReady =
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      Boolean(navigator.serviceWorker.controller);
    results.push({
      id: "pwa",
      label: "Aplicativo offline",
      detail: serviceWorkerReady
        ? "O navegador está sob controle do cache seguro do Nexus."
        : "Recarregue uma vez após a publicação para ativar o cache do aplicativo.",
      level: serviceWorkerReady ? "healthy" : "warning",
    });

    try {
      window.localStorage.setItem("tadeon.storage.probe", "ok");
      window.localStorage.removeItem("tadeon.storage.probe");
      results.push({
        id: "storage",
        label: "Armazenamento local",
        detail: "O navegador pode manter consulta offline e preferências.",
        level: "healthy",
      });
    } catch {
      results.push({
        id: "storage",
        label: "Armazenamento local",
        detail: "O navegador bloqueou o armazenamento local.",
        level: "warning",
      });
    }

    setDiagnostics(results);
    setChecking(false);
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  const healthyCount = diagnostics.filter((item) => item.level === "healthy").length;

  return (
    <div className="tadeon-page max-w-6xl space-y-6">
      <section className="tadeon-surface rounded-2xl px-5 py-6 md:px-8 md:py-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="tadeon-eyebrow">Integridade do arquivo</p>
            <h1 className="font-cinzel text-3xl font-semibold md:text-4xl">Backup & Diagnóstico</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Proteja fichas e dados do mestre, consulte versões locais e identifique falhas sem
              exibir mensagens internas do banco.
            </p>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Credenciais não são exportadas
          </Badge>
        </div>
      </section>

      <Tabs defaultValue="backup" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-card/60 p-1 md:w-fit">
          <TabsTrigger value="backup" className="gap-2">
            <ArchiveRestore className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2">
            <Wrench className="h-4 w-4" />
            Saúde & diagnóstico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-5">
          <Card className="tadeon-surface rounded-2xl p-5 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Label htmlFor="snapshot-label">Nome do ponto de restauração</Label>
                <Input
                  id="snapshot-label"
                  className="mt-2"
                  value={snapshotLabel}
                  onChange={(event) => setSnapshotLabel(event.target.value)}
                  placeholder="Ex.: Antes da sessão 12"
                  maxLength={80}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  O histórico mantém os dez pontos mais recentes apenas neste navegador.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => void createSnapshot(false)}
                  disabled={working}
                  className="gap-2"
                >
                  <FileClock className="h-4 w-4" />
                  Criar ponto
                </Button>
                <Button
                  onClick={() => void createSnapshot(true)}
                  disabled={working}
                  className="gap-2"
                >
                  {working ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Gerar e baixar
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
            <Card className="tadeon-surface rounded-2xl p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="tadeon-eyebrow">Versões locais</p>
                  <h2 className="font-cinzel text-xl font-semibold">Histórico de segurança</h2>
                </div>
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              {snapshots.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum ponto de restauração criado neste navegador.
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/35 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{snapshot.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(snapshot.createdAt).toLocaleString("pt-BR")} ·{" "}
                          {snapshot.sheetCount} ficha(s)
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void loadStoredSnapshot(snapshot.id)}
                        >
                          Restaurar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Baixar ponto"
                          onClick={() => void downloadStoredSnapshot(snapshot.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Excluir ponto"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void removeStoredSnapshot(snapshot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="tadeon-surface rounded-2xl p-5 md:p-6">
              <FileUp className="mb-4 h-6 w-6 text-primary" />
              <h2 className="font-cinzel text-xl font-semibold">Importar backup</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A restauração mescla registros pelo identificador. Ela pode atualizar fichas
                existentes, mas não apaga registros que estejam fora do arquivo.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => void importFile(event.target.files?.[0])}
              />
              <Button
                variant="outline"
                className="mt-5 w-full gap-2"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                Selecionar arquivo
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-5">
          <Card className="tadeon-surface rounded-2xl p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="tadeon-eyebrow">Estado atual</p>
                <h2 className="font-cinzel text-2xl font-semibold">
                  {healthyCount}/{diagnostics.length || "—"} verificações saudáveis
                </h2>
              </div>
              <Button
                variant="outline"
                onClick={() => void runDiagnostics()}
                disabled={checking}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                Verificar novamente
              </Button>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            {diagnostics.map((item) => (
              <DiagnosticCard key={item.id} result={item} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={Boolean(pendingRestore)}
        onOpenChange={(open) => {
          if (!open && !working) {
            setPendingRestore(null);
            setPendingLabel("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar “{pendingLabel}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Registros com o mesmo identificador serão atualizados. Antes disso, o Nexus criará
              automaticamente uma cópia dos dados atuais. Registros que não existam no backup não
              serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void restoreBackup()} disabled={working}>
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar restauração
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DiagnosticCard({ result }: { result: DiagnosticResult }) {
  const icon =
    result.id === "network" ? (
      <Wifi className="h-5 w-5" />
    ) : result.id === "settings" ||
      result.id === "sheets" ||
      result.id === "heartbeat" ||
      result.id === "errors" ? (
      <Database className="h-5 w-5" />
    ) : result.id === "offline" || result.id === "pwa" ? (
      <Cloud className="h-5 w-5" />
    ) : result.level === "healthy" ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : (
      <CircleAlert className="h-5 w-5" />
    );

  return (
    <Card className="tadeon-surface rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 rounded-lg p-2 ${
            result.level === "healthy"
              ? "bg-emerald-500/10 text-emerald-400"
              : result.level === "warning"
                ? "bg-amber-500/10 text-amber-400"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold">{result.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{result.detail}</p>
        </div>
      </div>
    </Card>
  );
}
