import { PageHeader } from "@/components/page-header";
import { UTILITY_AREAS } from "@/lib/utility-areas";
import { UtilitySummary } from "@/components/utility-summary";
import { useAuth } from "@/lib/auth";
import { createLatestRequestGate } from "@/lib/latest-request";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArchiveRestore,
  Bug,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  ClipboardCopy,
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
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/nexus-tools")({
  head: () => ({
    meta: [
      { title: `${UTILITY_AREAS.backup.label} · Tadeon Nexus` },
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

interface ErrorLogEntry {
  id: string;
  fingerprint: string;
  message: string;
  route: string;
  source: string;
  severity: string;
  context: Json;
  created_at: string;
}

function errorContext(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

export function NexusToolsPage() {
  const { user, role } = useAuth();
  return <NexusToolsPageContent key={`${user?.id ?? ""}:${role ?? ""}`} />;
}

function NexusToolsPageContent() {
  const { user, role } = useAuth();
  const scope = { userId: user?.id ?? "", role: role ?? "espectador" };
  const identity = `${scope.userId}:${scope.role}`;
  const actorRef = useRef(identity);
  actorRef.current = identity;
  const alive = useRef(false);
  const operationRef = useRef(false);
  const diagnosticsGate = useRef(createLatestRequestGate());
  const historyGate = useRef(createLatestRequestGate());
  const [historyError, setHistoryError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<SnapshotSummary | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [working, setWorking] = useState(false);
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [pendingRestore, setPendingRestore] = useState<NexusBackup | null>(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshSnapshots = useCallback(async () => {
    const ticket = historyGate.current.begin();
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const next = await listSnapshots({ userId: user?.id ?? "", role: role ?? "espectador" });
      if (alive.current && historyGate.current.isCurrent(ticket)) setSnapshots(next);
    } catch {
      if (alive.current && historyGate.current.isCurrent(ticket)) {
        setHistoryError(true);
        setSnapshots([]);
      }
    } finally {
      if (alive.current && historyGate.current.isCurrent(ticket)) setHistoryLoading(false);
    }
  }, [user?.id, role]);

  useEffect(() => {
    setPendingRestore(null);
    setSnapshots([]);
    void refreshSnapshots();
    const gate = historyGate.current;
    return () => gate.invalidate();
  }, [refreshSnapshots]);

  const collectBackup = async (): Promise<NexusBackup> => {
    const actor = identity;
    const readTable = async (table: "character_sheets" | "game_settings") => {
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; offset < 100_000; offset += 500) {
        if (!alive.current || actorRef.current !== actor) throw new Error("identity-changed");
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        const page = (data ?? []) as unknown as Record<string, unknown>[];
        rows.push(...page);
        if (page.length < 500) return rows;
      }
      throw new Error("O arquivo excede o limite desta exportação.");
    };
    const [sheets, settings] = await Promise.all([
      readTable("character_sheets"),
      readTable("game_settings"),
    ]);
    return createNexusBackup(sheets, settings);
  };

  const createSnapshot = async (download: boolean) => {
    if (operationRef.current) return;
    const actor = identity;
    operationRef.current = true;
    setWorking(true);
    try {
      const backup = await collectBackup();
      if (!alive.current || actorRef.current !== actor) return;
      let storedLocally = true;
      try {
        await saveSnapshot(backup, snapshotLabel || "Antes da sessão", scope);
      } catch {
        storedLocally = false;
      }
      if (!alive.current || actorRef.current !== actor) return;
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
      if (alive.current && actorRef.current === actor)
        toast.error("Não foi possível criar a cópia de segurança.");
    } finally {
      operationRef.current = false;
      if (alive.current && actorRef.current === actor) setWorking(false);
    }
  };

  const restoreBackup = async () => {
    if (!pendingRestore || operationRef.current) return;
    const actor = identity;
    const current = () => alive.current && actorRef.current === actor;
    operationRef.current = true;
    setWorking(true);
    try {
      const safetyCopy = await collectBackup();
      if (!current()) return;
      await saveSnapshot(safetyCopy, "Cópia automática antes da restauração", scope);

      if (!current()) return;
      const sheetResult = pendingRestore.characterSheets.length
        ? await supabase
            .from("character_sheets")
            .upsert(pendingRestore.characterSheets as never, { onConflict: "id" })
        : { error: null };
      if (sheetResult.error) throw new Error("restore-sheets");
      if (!current()) return;
      const settingsResult = pendingRestore.gameSettings.length
        ? await supabase
            .from("game_settings")
            .upsert(pendingRestore.gameSettings as never, { onConflict: "id" })
        : { error: null };
      if (sheetResult.error || settingsResult.error) throw new Error("restore");

      if (!current()) return;
      toast.success("Backup mesclado com sucesso. Nenhum registro ausente foi excluído.");
      setPendingRestore(null);
      setPendingLabel("");
      await refreshSnapshots();
    } catch {
      if (current())
        toast.error(
          "A mesclagem falhou e pode ter sido aplicada parcialmente. Se a cópia de segurança foi criada, ela permanece no histórico. Revise os dados antes de tentar novamente.",
        );
    } finally {
      operationRef.current = false;
      if (alive.current && actorRef.current === actor) setWorking(false);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file || operationRef.current) return;
    const actor = identity;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("O arquivo excede o limite de 25 MB.");
      const parsed = parseNexusBackup(JSON.parse(await file.text()) as unknown);
      if (!alive.current || actorRef.current !== actor) return;
      setPendingRestore(parsed);
      setPendingLabel(file.name);
    } catch (error) {
      if (alive.current && actorRef.current === actor)
        toast.error(error instanceof Error ? error.message : "Arquivo de backup inválido.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const loadStoredSnapshot = async (id: string) => {
    const actor = identity;
    try {
      const snapshot = await getSnapshot(id, scope);
      if (!alive.current || actorRef.current !== actor) return;
      if (!snapshot) throw new Error("missing");
      setPendingRestore(parseNexusBackup(snapshot.backup));
      setPendingLabel(snapshot.label);
    } catch {
      if (alive.current && actorRef.current === actor)
        toast.error("Não foi possível abrir esse ponto de restauração.");
    }
  };

  const downloadStoredSnapshot = async (id: string) => {
    const actor = identity;
    try {
      const snapshot = await getSnapshot(id, scope);
      if (!alive.current || actorRef.current !== actor) return;
      if (!snapshot) throw new Error("missing");
      downloadNexusBackup(snapshot.backup);
    } catch {
      if (alive.current && actorRef.current === actor)
        toast.error("Não foi possível baixar esse ponto de restauração.");
    }
  };

  const removeStoredSnapshot = async (id: string) => {
    const actor = identity;
    try {
      await deleteSnapshot(id, scope);
      if (!alive.current || actorRef.current !== actor) return;
      await refreshSnapshots();
      toast.success("Ponto removido do histórico local.");
    } catch {
      if (alive.current && actorRef.current === actor)
        toast.error("Não foi possível remover o ponto.");
    }
  };

  const runDiagnostics = useCallback(async () => {
    const ticket = diagnosticsGate.current.begin();
    const current = () => alive.current && diagnosticsGate.current.isCurrent(ticket);
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
      const { data, count, error } = await supabase
        .from("app_error_logs")
        .select("id,fingerprint,message,route,source,severity,context,created_at", {
          count: "exact",
        })
        .is("resolved_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (current()) setErrorLogs(error ? [] : ((data ?? []) as ErrorLogEntry[]));
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
      if (current()) setErrorLogs([]);
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
      label: UTILITY_AREAS.offline.label,
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

    if (current()) {
      setDiagnostics(results);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void runDiagnostics();
    const gate = diagnosticsGate.current;
    return () => gate.invalidate();
  }, [runDiagnostics]);

  const healthyCount = diagnostics.filter((item) => item.level === "healthy").length;

  const copyError = async (entry: ErrorLogEntry) => {
    const context = errorContext(entry.context);
    const report = [
      `${entry.severity.toUpperCase()} · ${entry.message}`,
      `Rota: ${entry.route}`,
      `Origem: ${entry.source}`,
      `Horário: ${new Date(entry.created_at).toLocaleString("pt-BR")}`,
      `Impressão digital: ${entry.fingerprint}`,
      context.release ? `Versão: ${String(context.release)}` : "",
      context.viewport ? `Viewport: ${String(context.viewport)}` : "",
      context.stack ? `Pilha:\n${String(context.stack)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Diagnóstico copiado.");
    } catch {
      toast.error("O navegador não permitiu copiar o diagnóstico.");
    }
  };

  const resolveError = async (entry: ErrorLogEntry) => {
    const actor = identity;
    const current = () => alive.current && actorRef.current === actor;
    try {
      const { data } = await supabase.auth.getUser();
      if (!current() || data.user?.id !== scope.userId || scope.role !== "mestre") return;
      const { error } = await supabase
        .from("app_error_logs")
        .update({ resolved_at: new Date().toISOString(), resolved_by: data.user.id })
        .eq("id", entry.id);
      if (!current()) return;
      if (error) throw error;
      toast.success("Ocorrência marcada como resolvida.");
      await runDiagnostics();
    } catch {
      if (current()) toast.error("Não foi possível marcar a ocorrência como resolvida.");
    }
  };

  return (
    <div data-page-layout className="tadeon-page tadeon-route-tools space-y-6">
      <PageHeader
        section="tools"
        eyebrow="Integridade do arquivo"
        title={UTILITY_AREAS.backup.label}
        description="Proteja fichas e dados do mestre, consulte versões locais e identifique falhas sem exibir mensagens internas do banco."
        actions={
          <Badge variant="outline" className="max-w-full gap-1.5 whitespace-normal px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Credenciais não são exportadas
          </Badge>
        }
      />

      <UtilitySummary
        items={[
          {
            label: "Pontos locais",
            value: historyLoading || historyError ? "--" : snapshots.length,
            detail: "Até dez cópias por conta de mestre neste navegador",
          },
          { label: "Formato", value: "JSON", detail: "Fichas e configurações acessíveis à conta" },
          {
            label: "Diagnóstico",
            value: checking ? "Verificando…" : `${healthyCount}/${diagnostics.length}`,
            detail: "Verificações atuais; consulte os avisos na aba Diagnóstico",
          },
        ]}
      />
      <p className="tadeon-utility-note">
        <strong>O que esta cópia protege.</strong> Exporta fichas e configurações acessíveis à sua
        conta. Não inclui contas, senhas, documentos do Nexus nem arquivos de mídia. Não substitui a
        restauração completa do banco e do armazenamento.
      </p>
      <Tabs defaultValue="backup" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-card/60 p-1 md:w-fit">
          <TabsTrigger value="backup" className="gap-2">
            <ArchiveRestore className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="gap-2">
            <Wrench className="h-4 w-4" />
            Diagnóstico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-5">
          <Card className="tadeon-surface rounded-2xl p-4 md:p-6">
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
                  O histórico mantém dez pontos desta conta de mestre neste navegador. Baixe uma
                  cópia para guardá-la fora do dispositivo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button
                  variant="outline"
                  onClick={() => void createSnapshot(false)}
                  disabled={working}
                  className="h-auto min-h-11 gap-2 whitespace-normal px-2"
                >
                  <FileClock className="h-4 w-4" />
                  Criar ponto
                </Button>
                <Button
                  onClick={() => void createSnapshot(true)}
                  disabled={working}
                  className="h-auto min-h-11 gap-2 whitespace-normal px-2"
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
            <Card className="tadeon-surface rounded-2xl p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="tadeon-eyebrow">Versões locais</p>
                  <h2 className="font-cinzel text-xl font-semibold">Histórico de segurança</h2>
                </div>
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              {historyLoading ? (
                <p role="status" className="py-8 text-sm text-muted-foreground">
                  Lendo histórico local…
                </p>
              ) : historyError ? (
                <div className="py-6 text-sm">
                  <p>O histórico local está indisponível neste navegador.</p>
                  <Button
                    className="mt-3"
                    variant="outline"
                    onClick={() => void refreshSnapshots()}
                  >
                    Tentar ler histórico
                  </Button>
                </div>
              ) : snapshots.length === 0 ? (
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
                      <div className="tadeon-backup-history__actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void loadStoredSnapshot(snapshot.id)}
                        >
                          Revisar cópia
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
                          onClick={() => setPendingDelete(snapshot)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="tadeon-surface rounded-2xl p-4 md:p-6">
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
                disabled={working}
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                Selecionar arquivo
              </Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-5">
          <Card className="tadeon-surface rounded-2xl p-4 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="tadeon-eyebrow">Estado atual</p>
                <h2 className="font-cinzel text-2xl font-semibold">
                  {healthyCount}/{diagnostics.length || "~"} verificações saudáveis
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

          {errorLogs.length > 0 && (
            <Card className="tadeon-surface rounded-2xl p-4 md:p-6">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="tadeon-eyebrow">Ocorrências abertas</p>
                  <h3 className="font-cinzel text-xl font-semibold">O que realmente falhou</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    As 20 capturas mais recentes, já sanitizadas pelo coletor do Nexus.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit gap-1.5">
                  <Bug className="h-3.5 w-3.5" />
                  {errorLogs.length} visível(is)
                </Badge>
              </div>
              <div className="space-y-2">
                {errorLogs.map((entry) => {
                  const context = errorContext(entry.context);
                  return (
                    <details
                      key={entry.id}
                      className="group rounded-xl border border-border/70 bg-background/35"
                    >
                      <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                        <Bug className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <span className="min-w-0 flex-1">
                          <strong className="block break-words text-sm">{entry.message}</strong>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>{entry.route}</span>
                            <span>{entry.source}</span>
                            <time dateTime={entry.created_at}>
                              {new Date(entry.created_at).toLocaleString("pt-BR")}
                            </time>
                          </span>
                        </span>
                        <span className="tadeon-mono text-[10px] text-muted-foreground">
                          {entry.fingerprint}
                        </span>
                      </summary>
                      <div className="border-t border-border/60 p-4">
                        <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="text-muted-foreground">Rota</dt>
                            <dd className="mt-1 break-all font-medium">{entry.route}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Versão</dt>
                            <dd className="mt-1 break-all font-medium">
                              {String(context.release ?? "não informada")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Viewport</dt>
                            <dd className="mt-1 font-medium">
                              {String(context.viewport ?? "não informado")}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Origem</dt>
                            <dd className="mt-1 font-medium">{entry.source}</dd>
                          </div>
                        </dl>
                        {context.stack && (
                          <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-black/25 p-3 text-[11px] leading-relaxed text-muted-foreground">
                            {String(context.stack)}
                          </pre>
                        )}
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => void copyError(entry)}>
                            <ClipboardCopy className="h-3.5 w-3.5" /> Copiar diagnóstico
                          </Button>
                          <Button size="sm" onClick={() => void resolveError(entry)}>
                            <CheckCheck className="h-3.5 w-3.5" /> Marcar como resolvido
                          </Button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            </Card>
          )}
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
            <AlertDialogTitle>Revisar “{pendingLabel}”</AlertDialogTitle>
            <AlertDialogDescription>
              Registros com o mesmo identificador serão atualizados. Antes disso, o Nexus criará
              automaticamente uma cópia dos dados atuais. Registros que não existam no backup não
              serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRestore && (
            <div className="tadeon-utility-note">
              <strong>
                {pendingRestore.characterSheets.length} fichas ·{" "}
                {pendingRestore.gameSettings.length} configurações
              </strong>
              <p>Exportado em {new Date(pendingRestore.exportedAt).toLocaleString("pt-BR")}.</p>
              <p>
                A mesclagem não é uma transação única. Uma falha pode aplicar parte dos registros. A
                cópia automática precisa ser salva antes de qualquer escrita.
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void restoreBackup();
              }}
              disabled={
                working ||
                !pendingRestore ||
                pendingRestore.characterSheets.length + pendingRestore.gameSettings.length === 0
              }
            >
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar mesclagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ponto local?</AlertDialogTitle>
            <AlertDialogDescription>
              O ponto “{pendingDelete?.label}” será removido deste navegador. Os dados do servidor
              permanecem intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) void removeStoredSnapshot(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Excluir ponto
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
