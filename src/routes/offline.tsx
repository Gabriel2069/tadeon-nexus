import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpenText, CloudOff, Eye, FileText, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { readOfflineCache, type OfflineCache } from "@/lib/offline-cache";

export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Consulta Offline · Tadeon Nexus" },
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

function OfflinePage() {
  const [cache, setCache] = useState<OfflineCache>(() => readOfflineCache());
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const cachedSheets = useMemo(
    () =>
      cache.sheetSummaries.map((summary) => ({
        summary,
        data: cache.sheets[summary.id] as Record<string, unknown> | undefined,
      })),
    [cache],
  );
  const updated = new Date(cache.updatedAt);
  const hasCache = Number.isFinite(updated.getTime()) && updated.getTime() > 0;

  return (
    <div className="tadeon-page max-w-6xl space-y-6">
      <section className="tadeon-surface rounded-2xl px-5 py-6 md:px-8 md:py-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
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
            </div>
            <h1 className="font-cinzel text-3xl font-semibold md:text-4xl">Arquivo local</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Consulte as informações abertas recentemente mesmo sem conexão. Alterações continuam
              bloqueadas para evitar conflitos com o banco principal.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <p className="text-xs text-muted-foreground">
              {hasCache
                ? `Sincronizado em ${updated.toLocaleString("pt-BR")}`
                : "Nenhuma cópia local disponível"}
            </p>
            <Button variant="outline" size="sm" onClick={() => setCache(readOfflineCache())}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar cópia
            </Button>
          </div>
        </div>
      </section>

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
            <TabsTrigger value="master" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Campanha
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sheets">
            {cachedSheets.length === 0 ? (
              <EmptyCard text="Nenhuma ficha foi armazenada para consulta." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cachedSheets.map(({ summary, data }) => (
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
    <Card className="tadeon-surface rounded-2xl p-5">
      <p className="tadeon-mono text-[10px] uppercase text-muted-foreground">
        Rank {summary.exposure ?? 0}
      </p>
      <h2 className="mt-2 font-cinzel text-xl font-semibold">{summary.name}</h2>
      <p className="text-xs text-muted-foreground">
        {summary.occupation || "Ocupação não definida"}
      </p>
      {data ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["PV", stats.pv_current],
              ["PS", stats.ps_current],
              ["PE", stats.pe_current],
              ["PA", stats.pa_current],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-lg border border-border/60 p-2 text-center"
              >
                <p className="text-sm font-semibold">{Number(value ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
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
        <Button asChild variant="outline" size="sm" className="mt-5 w-full">
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
      <Card className="tadeon-surface rounded-2xl p-5 md:p-6">
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
            <p className="font-cinzel text-2xl font-semibold">{value}</p>
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
