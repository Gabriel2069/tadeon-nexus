import { useMemo, useState, type ChangeEvent } from "react";
import {
  ArchiveRestore,
  Download,
  FileArchive,
  Loader2,
  PackageOpen,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KNOWLEDGE_NODE_TYPES,
  type KnowledgeNodeType,
} from "@/lib/nexus-contracts";
import {
  parseKnowledgeVaultFile,
  type KnowledgeVaultPreview,
} from "@/lib/knowledge/knowledge-portability";
import {
  loadOfficialKnowledgePack,
  TADEON_NEXUS_LOTE_01,
} from "@/lib/knowledge/official-knowledge-packs";
import {
  downloadKnowledgeArchive,
  knowledgePortabilityService,
  type ExportProgress,
  type ImportProgress,
  type KnowledgeImportReport,
} from "@/lib/knowledge/knowledge-portability-service";

const TYPE_LABELS: Partial<Record<KnowledgeNodeType, string>> = {
  character: "Personagem",
  npc: "NPC",
  creature: "Criatura",
  culture: "Cultura",
  location: "Local",
  historical_event: "Evento",
  plot: "Trama",
  clue: "Pista",
  fragment: "Fragmento",
  transcendental_ability: "Habilidade transcendental",
  weapon: "Arma",
  object: "Objeto",
  document: "Documento",
  map: "Mapa",
  free_note: "Nota livre",
};

function typeLabel(type: KnowledgeNodeType) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

function portabilityError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("UNSUPPORTED_ATTACHMENT")) {
    return "O cofre contém anexos em formatos não permitidos.";
  }
  if (message.includes("ASSETS_DISABLED")) {
    return "Ative Nexus Assets no canário para importar anexos.";
  }
  if (message.includes("ROLLBACK_INCOMPLETE")) {
    return "A importação falhou e alguns anexos precisam de revisão no catálogo.";
  }
  if (message.includes("KNOWLEDGE_OFFICIAL_PACK_LOAD_FAILED")) {
    return "Não foi possível carregar o Lote 01 versionado no repositório.";
  }
  if (message.includes("KNOWLEDGE_OFFICIAL_PACK_INTEGRITY_FAILED")) {
    return "O Lote 01 falhou na verificação de integridade e não foi aberto.";
  }
  if (message.includes("MANAGER_REQUIRED")) {
    return "A importação em lote exige permissão de mestre ou administrador.";
  }
  if (message.includes("EXPORT_PAGE_LIMIT_EXCEEDED")) {
    return "O escopo possui mais de 500 páginas; divida a exportação por campanha.";
  }
  if (
    message.includes("EXPORT_RELATION_LIMIT_EXCEEDED") ||
    message.includes("EXPORT_ATTACHMENT_LIMIT_EXCEEDED")
  ) {
    return "O escopo ultrapassa o limite de 2.000 relações ou anexos por ZIP.";
  }
  if (message.includes("FORBIDDEN")) {
    return "Você não tem permissão para importar nesse escopo.";
  }
  return message || "Não foi possível concluir a portabilidade de O Nexus.";
}

export function KnowledgePortabilityDialog({
  open,
  onOpenChange,
  workspaceId,
  campaignId,
  assetsEnabled,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  campaignId: string | null;
  assetsEnabled: boolean;
  onImported: () => void | Promise<void>;
}) {
  const [mode, setMode] = useState<"import" | "export">("import");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<KnowledgeVaultPreview | null>(null);
  const [typeMappings, setTypeMappings] = useState<
    Record<string, KnowledgeNodeType>
  >({});
  const [report, setReport] = useState<KnowledgeImportReport | null>(null);
  const [progress, setProgress] = useState<
    ImportProgress | ExportProgress | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(true);

  const unsupportedAttachments = useMemo(
    () =>
      preview?.attachments.filter(
        (attachment) => attachment.mime_type === "application/octet-stream",
      ).length ?? 0,
    [preview],
  );

  const readFile = async (
    nextFile: File,
    mappings: Record<string, KnowledgeNodeType>,
  ) => {
    setBusy(true);
    setReport(null);
    try {
      const nextPreview = await parseKnowledgeVaultFile(nextFile, mappings);
      setPreview(nextPreview);
      const discoveredMappings = { ...mappings };
      for (const sourceType of nextPreview.source_types) {
        discoveredMappings[sourceType] ??=
          nextPreview.pages.find((page) => page.source_type === sourceType)
            ?.node_type ?? "free_note";
      }
      setTypeMappings(discoveredMappings);
      return true;
    } catch (error) {
      setPreview(null);
      toast.error(portabilityError(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (nextFile: File | null) => {
    setFile(nextFile);
    if (!nextFile) {
      setPreview(null);
      setReport(null);
      return;
    }
    await readFile(nextFile, {});
  };

  const chooseOfficialPack = async () => {
    setBusy(true);
    setReport(null);
    try {
      const nextFile = await loadOfficialKnowledgePack();
      setFile(nextFile);
      const parsed = await readFile(nextFile, {});
      if (parsed) {
        toast.success("Lote 01 carregado e verificado. Execute o dry-run.");
      } else {
        setFile(null);
      }
    } catch (error) {
      setFile(null);
      setPreview(null);
      toast.error(portabilityError(error));
    } finally {
      setBusy(false);
    }
  };

  const remapType = async (sourceType: string, nodeType: KnowledgeNodeType) => {
    const next = { ...typeMappings, [sourceType]: nodeType };
    setTypeMappings(next);
    if (file) await readFile(file, next);
  };

  const dryRun = async () => {
    if (!preview || !workspaceId) return;
    setBusy(true);
    setProgress(null);
    try {
      const nextReport = await knowledgePortabilityService.dryRun(preview, {
        workspaceId,
        campaignId,
      });
      setReport(nextReport);
      toast.success("Dry-run concluído sem alterar dados.");
    } catch (error) {
      setReport(null);
      toast.error(portabilityError(error));
    } finally {
      setBusy(false);
    }
  };

  const setConflictAction = (importKey: string, action: "skip" | "copy") => {
    setPreview((current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) =>
              page.import_key === importKey
                ? { ...page, conflict_action: action }
                : page,
            ),
          }
        : current,
    );
    setReport(null);
  };

  const applyImport = async () => {
    if (!preview || !report?.dry_run) return;
    setBusy(true);
    try {
      const result = await knowledgePortabilityService.import(preview, {
        workspaceId,
        campaignId,
        assetsEnabled,
        onProgress: setProgress,
      });
      setReport(result);
      await onImported();
      toast.success(
        `${result.pages_created} página(s) importada(s) com transação concluída.`,
      );
    } catch (error) {
      toast.error(portabilityError(error));
    } finally {
      setBusy(false);
    }
  };

  const exportVault = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setProgress(null);
    try {
      const result = await knowledgePortabilityService.export({
        workspaceId,
        campaignId,
        includeAttachments: includeAttachments && assetsEnabled,
        assetsEnabled,
        onProgress: setProgress,
      });
      const date = new Date().toISOString().slice(0, 10);
      downloadKnowledgeArchive(result.bytes, `tadeon-nexus-${date}.zip`);
      toast.success(
        `${result.snapshot.pages.length} página(s) exportada(s) em ZIP reimportável.`,
      );
    } catch (error) {
      toast.error(portabilityError(error));
    } finally {
      setBusy(false);
    }
  };

  const canImport =
    Boolean(report?.dry_run) &&
    !unsupportedAttachments &&
    (!preview?.attachments.length || assetsEnabled);

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveRestore className="h-5 w-5 text-primary" />
            Portabilidade de O Nexus
          </DialogTitle>
          <DialogDescription>
            ZIP versionado com Markdown, YAML, pastas, aliases, tags, relações e
            anexos. A importação exige dry-run e nunca sobrescreve uma página.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-lg border border-border/60 bg-muted/20 p-1">
          <Button
            type="button"
            variant={mode === "import" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setMode("import")}
            disabled={busy}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar cofre
          </Button>
          <Button
            type="button"
            variant={mode === "export" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setMode("export")}
            disabled={busy}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar O Nexus
          </Button>
        </div>

        {mode === "import" ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <PackageOpen className="h-6 w-6 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{TADEON_NEXUS_LOTE_01.title}</h3>
                  <Badge variant="secondary">
                    {TADEON_NEXUS_LOTE_01.pages} páginas ·{" "}
                    {TADEON_NEXUS_LOTE_01.relations} relações
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {TADEON_NEXUS_LOTE_01.description}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void chooseOfficialPack()}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Carregar Lote 01
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="knowledge-vault-file">Cofre ZIP</Label>
              <Input
                id="knowledge-vault-file"
                type="file"
                accept=".zip,application/zip"
                disabled={busy}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  void chooseFile(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                Limites: 50 MiB compactado, 200 MiB descompactado, 500 páginas.
              </p>
            </div>

            {preview ? (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["Páginas", preview.pages.length],
                    ["Relações", preview.relations.length],
                    ["Anexos", preview.attachments.length],
                    ["Alertas", preview.warnings.length],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-lg border border-border/60 bg-card p-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-xl font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-lg border border-border/60 p-4">
                  <div>
                    <h3 className="font-medium">Mapeamento de tipos</h3>
                    <p className="text-xs text-muted-foreground">
                      Tipos desconhecidos começam como Nota livre e podem ser
                      corrigidos antes do dry-run.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {preview.source_types.map((sourceType) => (
                      <div key={sourceType} className="space-y-1">
                        <Label>{sourceType}</Label>
                        <Select
                          value={typeMappings[sourceType] ?? "free_note"}
                          onValueChange={(value: string) =>
                            void remapType(
                              sourceType,
                              value as KnowledgeNodeType,
                            )
                          }
                          disabled={busy}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KNOWLEDGE_NODE_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {typeLabel(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {preview.warnings.length ? (
                  <div className="space-y-1 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 text-sm">
                    {preview.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}

                {report ? (
                  <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">
                        {report.dry_run
                          ? "Relatório do dry-run"
                          : "Relatório da importação"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {report.pages_created} para criar
                      </Badge>
                      <Badge variant="secondary">
                        {report.pages_skipped} preservadas
                      </Badge>
                      <Badge variant="secondary">
                        {report.conflicts.length} conflitos
                      </Badge>
                    </div>
                    {report.conflicts.map((conflict) => (
                      <div
                        key={conflict.import_key}
                        className="flex flex-col gap-2 rounded-md border border-border/60 p-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {conflict.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            slug já existente: {conflict.slug}
                          </p>
                        </div>
                        <Select
                          value={
                            preview.pages.find(
                              (page) => page.import_key === conflict.import_key,
                            )?.conflict_action ?? "skip"
                          }
                          onValueChange={(value: string) =>
                            setConflictAction(
                              conflict.import_key,
                              value as "skip" | "copy",
                            )
                          }
                          disabled={busy}
                        >
                          <SelectTrigger className="w-full sm:w-52">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">
                              Preservar e ignorar
                            </SelectItem>
                            <SelectItem value="copy">
                              Criar cópia importada
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 text-center">
                <FileArchive className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Selecione um ZIP para gerar o preview local.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 p-4">
              <h3 className="font-medium">Escopo da exportação</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {campaignId
                  ? "Páginas da campanha selecionada."
                  : "Páginas canônicas do workspace."}
              </p>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeAttachments}
                  onChange={(event) =>
                    setIncludeAttachments(event.target.checked)
                  }
                  disabled={!assetsEnabled || busy}
                  className="h-4 w-4 accent-primary"
                />
                Incluir anexos privados por URL temporária
              </label>
              {!assetsEnabled ? (
                <p className="mt-2 text-xs text-amber-600">
                  Nexus Assets não está ativo para este usuário; o ZIP será
                  gerado somente com conteúdo e metadados.
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              O ZIP inclui Markdown, YAML, estrutura de pastas, aliases, tags,
              manifesto de relações e relatório. O download só começa quando
              todos os arquivos estiverem prontos.
            </div>
          </div>
        )}

        {progress ? (
          <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="flex-1">{progress.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {progress.completed}/{progress.total}
            </span>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Fechar
          </Button>
          {mode === "import" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void dryRun()}
                disabled={!preview || busy}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Executar dry-run
              </Button>
              <Button
                type="button"
                onClick={() => void applyImport()}
                disabled={!canImport || busy}
              >
                Importar com transação
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => void exportVault()}
              disabled={!workspaceId || busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Gerar ZIP
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
