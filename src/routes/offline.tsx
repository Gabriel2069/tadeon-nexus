import { PageHeader } from "@/components/page-header";
import { UTILITY_AREAS } from "@/lib/utility-areas";
import { UtilitySummary } from "@/components/utility-summary";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CloudOff, Eye, FileText, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearOfflineCache, readOfflineCache, type OfflineCache } from "@/lib/offline-cache";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: `${UTILITY_AREAS.offline.label} · Tadeon Nexus` },
      {
        name: "description",
        content: "Consulta local e somente leitura das informações recentes do Tadeon Nexus.",
      },
    ],
  }),
  component: () => (
    <ProtectedShell>
      <OfflinePage />
    </ProtectedShell>
  ),
});

export function OfflinePage() {
  const { user, role } = useAuth();
  return <OfflinePageContent key={`${user?.id ?? ""}:${role ?? ""}`} />;
}

function OfflinePageContent() {
  const { user, role } = useAuth();
  const [query, setQuery] = useState("");
  const [cache, setCache] = useState<OfflineCache>(() => readOfflineCache());
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    setCache(readOfflineCache());
    const refreshCache = () => setCache(readOfflineCache());
    const updateStatus = () => setOnline(navigator.onLine);
    window.addEventListener("storage", refreshCache);
    window.addEventListener("focus", refreshCache);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("storage", refreshCache);
      window.removeEventListener("focus", refreshCache);
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, [user?.id, role]);

  const cachedSheets = useMemo(
    () =>
      cache.sheetSummaries.map((summary) => ({
        summary,
        data: cache.sheets[summary.id] as Record<string, unknown> | undefined,
      })),
    [cache],
  );
  const filteredSheets = cachedSheets.filter(({ summary }) =>
    `${summary.name} ${summary.occupation ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(query.trim().toLocaleLowerCase("pt-BR")),
  );
  const detailedCount = cachedSheets.filter(({ data }) => Boolean(data)).length;
  const updated = new Date(cache.updatedAt);
  const hasCache = Number.isFinite(updated.getTime()) && updated.getTime() > 0;

  return (
    <div data-page-layout className="tadeon-page tadeon-route-offline space-y-6">
      <PageHeader
        section="offline"
        eyebrow="Memória neste navegador"
        title={UTILITY_AREAS.offline.label}
        description="Consulte as informações abertas recentemente mesmo sem conexão. Alterações continuam bloqueadas para evitar conflitos com o banco principal."
        actions={
          <Button variant="outline" size="sm" onClick={() => setCache(readOfflineCache())}>
            <RefreshCw className="h-4 w-4" />
            Ler cópia local
          </Button>
        }
      >
        <Badge variant="outline" className="gap-1.5">
          <Eye className="h-3.5 w-3.5" />
          Somente leitura
        </Badge>
        <Badge variant="outline" className={online ? "text-emerald-400" : "text-amber-400"}>
          {online ? (
            <Wifi className="mr-1 h-3.5 w-3.5" />
          ) : (
            <CloudOff className="mr-1 h-3.5 w-3.5" />
          )}
          {online ? "Conectado" : "Offline"}
        </Badge>
        <p className="text-xs text-muted-foreground">
          {hasCache
            ? `Cópia atualizada em ${updated.toLocaleString("pt-BR")}`
            : "Nenhuma cópia local disponível"}
        </p>
      </PageHeader>

      <UtilitySummary
        items={[
          {
            label: "Fichas locais",
            value: cachedSheets.length,
            detail: "Resumos salvos nesta conta e neste navegador",
          },
          {
            label: "Com detalhes",
            value: detailedCount,
            detail: "Recursos e atributos disponíveis para leitura",
          },
          {
            label: "Conexão",
            value: online ? "Conectado" : "Sem conexão",
            detail: "Esta área permanece somente para consulta",
          },
        ]}
      />
      <details className="tadeon-utility-note">
        <summary>Cópia deste dispositivo</summary>
        <p>
          O conteúdo é preparado ao abrir as áreas conectado. Ler novamente a cópia não busca dados
          no servidor. O acesso depende da sessão verificada; este arquivo não substitui um backup.
        </p>
      </details>
      {hasCache && (
        <div className="tadeon-utility-toolbar">
          <label>
            Buscar fichas locais
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome ou ocupação"
              type="search"
            />
          </label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Limpar cópia local</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar a cópia desta conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os dados principais permanecem no servidor. Será necessário abrir as áreas
                  conectado para preparar outra cópia neste navegador.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const cleared = clearOfflineCache();
                    const next = readOfflineCache();
                    setCache(next);
                    setQuery("");
                    if (!cleared) toast.error("O navegador não permitiu limpar a cópia.");
                    else toast.success("Cópia local removida.");
                  }}
                >
                  Limpar cópia
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      {!hasCache ? (
        <Card className="tadeon-surface rounded-2xl px-6 py-16 text-center">
          <CloudOff className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-cinzel text-xl font-semibold">Arquivo local ainda vazio</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Quando estiver conectado, abra o dashboard, as fichas importantes e o Painel do Mestre.
            O Nexus preparará automaticamente uma versão de consulta neste dispositivo.
          </p>
        </Card>
      ) : (
        <Tabs defaultValue="sheets" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-2 bg-card/60 p-1 md:w-fit">
            <TabsTrigger value="sheets" className="gap-2">
              <BookOpenText className="h-4 w-4" />
              Fichas
            </TabsTrigger>
            {role === "mestre" && (
              <TabsTrigger value="master" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                Campanha
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="sheets">
            {filteredSheets.length === 0 ? (
              <EmptyCard text="Nenhuma ficha encontrada nesta cópia local." />
            ) : (
              <div className="tadeon-offline-sheet-grid">
                {filteredSheets.map(({ summary, data }) => (
                  <OfflineSheetCard
                    key={summary.id}
                    summary={summary}
                    data={data}
                    online={online}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="master">
            {cache.master ? (
              <OfflineMaster cache={cache.master} />
            ) : (
              <EmptyCard text="Abra o Painel do Mestre conectado para preparar esta seção." />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OfflineSheetCard({
  summary,
  data,
  online,
}: {
  summary: OfflineCache["sheetSummaries"][number];
  data?: Record<string, unknown>;
  online: boolean;
}) {
  const attributes = (data?.attributes ?? {}) as Record<string, number>;
  const stats = (data?.stats ?? {}) as Record<string, number>;
  const identity = (data?.identity_data ?? {}) as Record<string, unknown>;

  return (
    <Card className="tadeon-offline-folio" data-availability={data ? "details" : "summary"}>
      <div className="tadeon-offline-folio__meta">
        <span>Exposição {summary.exposure ?? 0}%</span>
        <span>{data ? "Detalhes disponíveis" : "Somente resumo"}</span>
      </div>
      <h2 className="tadeon-offline-folio__title">{summary.name}</h2>
      <p className="text-xs text-muted-foreground">
        {summary.occupation || "Ocupação não definida"}
      </p>
      {data ? (
        <>
          <dl className="tadeon-offline-resources" aria-label="Recursos locais">
            {[
              ["PV", stats.pv_current],
              ["PS", stats.ps_current],
              ["PE", stats.pe_current],
              ["PA", stats.pa_current],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt>{label}</dt>
                <dd>
                  {typeof value === "number" ? value : <span aria-label="Não armazenado">n/d</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(attributes).map(([key, value]) => (
              <Badge key={key} variant="secondary">
                {key} {value}
              </Badge>
            ))}
          </div>
          {typeof identity.conviction === "string" && identity.conviction && (
            <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Convicção:</span>{" "}
              {identity.conviction}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Abra esta ficha conectado para guardar os detalhes completos.
        </p>
      )}
      {online && (
        <Button asChild variant="outline" size="sm" className="tadeon-offline-folio__action">
          <Link to="/sheet/$id" params={{ id: summary.id }}>
            Abrir versão principal
          </Link>
        </Button>
      )}
    </Card>
  );
}

function OfflineMaster({ cache }: { cache: NonNullable<OfflineCache["master"]> }) {
  const activeScenes = (cache.scenes as Array<Record<string, unknown>>).filter(
    (scene) => scene.status === "Em curso",
  );
  const pendingClues = (cache.clues as Array<Record<string, unknown>>).filter(
    (clue) => !clue.discovered,
  );
  const activeFolds = (cache.folds as Array<Record<string, unknown>>).filter(
    (fold) => !fold.sealed,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <Card className="tadeon-surface rounded-2xl p-4 md:p-6">
        <p className="tadeon-eyebrow">Campanha</p>
        <h2 className="font-cinzel text-2xl font-semibold">{cache.campaignTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {cache.campaignPhase || "Fase não registrada"}
        </p>
        <div className="mt-5 space-y-2">
          <ReadOnlyList
            title="Cenas em curso"
            items={activeScenes.map((item) => String(item.title ?? "Cena sem título"))}
          />
          <ReadOnlyList
            title="Pistas pendentes"
            items={pendingClues.slice(0, 8).map((item) => String(item.title ?? "Pista sem título"))}
          />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["Cenas", cache.scenes.length],
          ["NPCs", cache.npcs.length],
          ["Ameaças", cache.threats.length],
          ["Dobras ativas", activeFolds.length],
        ].map(([label, value]) => (
          <Card key={String(label)} className="tadeon-surface rounded-2xl p-4">
            <p className="font-sans text-2xl font-medium tabular-nums">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold">{title}</p>
      </div>
      {items.length ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum registro.</p>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card className="tadeon-surface rounded-2xl px-5 py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}
