import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Radio, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { buildTabletopPreflight, type TabletopPreflightReport } from "@/lib/tabletop/tabletop-preflight";
import { tabletopSessionService, TabletopSessionServiceError } from "@/lib/tabletop/tabletop-session-service";
import type { TabletopVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";
import "@/styles/tabletop-preflight.css";

type VisibilityInternals = { visibilityState?: TabletopVisibilityState };
type OpenSessionArgs = Parameters<typeof tabletopSessionService.openSession>[0];
type PendingRequest = {
  args: OpenSessionArgs;
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
};

function webgl2Available() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

export function TabletopPreflightBridge() {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [report, setReport] = useState<TabletopPreflightReport | null>(null);
  const [opening, setOpening] = useState(false);
  const originalRef = useRef<typeof tabletopSessionService.openSession | null>(null);

  useEffect(() => {
    if (originalRef.current) return;
    const original = tabletopSessionService.openSession.bind(tabletopSessionService);
    originalRef.current = original;
    tabletopSessionService.openSession = ((args: OpenSessionArgs) =>
      new Promise<string>((resolve, reject) => {
        const runtime = currentTabletopRuntime();
        const snapshot = runtime?.snapshot() ?? null;
        if (!runtime || !snapshot || snapshot.scene.id !== args.sceneId) {
          // If the runtime is unavailable, preserve the service's behavior. This
          // path is intentionally fail-open only for non-tabletop callers; the
          // normal Mesa route always has a runtime by the time the button exists.
          void original(args).then(resolve, reject);
          return;
        }
        const visibility = (runtime.engine as unknown as VisibilityInternals).visibilityState;
        const next = buildTabletopPreflight(snapshot.scene, visibility, {
          realtimeEnabled: true,
          online: navigator.onLine,
          webgl2: webgl2Available(),
        });
        setReport(next);
        setRequest({ args, resolve, reject });
      })) as typeof tabletopSessionService.openSession;

    return () => {
      if (originalRef.current) tabletopSessionService.openSession = originalRef.current;
      originalRef.current = null;
    };
  }, []);

  const severityIcon = useMemo(() => ({
    blocking: XCircle,
    warning: AlertTriangle,
    info: CheckCircle2,
  }), []);

  const cancel = () => {
    request?.reject(new TabletopSessionServiceError("TABLETOP_SESSION_INVALID_INPUT"));
    setRequest(null);
    setReport(null);
  };

  const continueOpen = async () => {
    if (!request || !report?.ready || !originalRef.current || opening) return;
    setOpening(true);
    try {
      const id = await originalRef.current(request.args);
      request.resolve(id);
      setRequest(null);
      setReport(null);
    } catch (error) {
      request.reject(error);
      setRequest(null);
      setReport(null);
    } finally {
      setOpening(false);
    }
  };

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && cancel()}>
      <DialogContent className="tadeon-preflight max-w-2xl">
        <DialogHeader>
          <div className="tadeon-preflight__heading">
            <span><ShieldCheck aria-hidden="true" /></span>
            <div>
              <small>Antes de abrir a sala</small>
              <DialogTitle>Preflight da sessão</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        {report && (
          <div className="tadeon-preflight__body">
            <section className="tadeon-preflight__score" data-ready={report.ready}>
              <div><strong>{report.score}</strong><small>/ 100</small></div>
              <span><b>{report.ready ? "Pronta para abrir" : "Bloqueada"}</b><small>{report.blockers} bloqueio(s) · {report.warnings} aviso(s)</small></span>
            </section>
            <div className="tadeon-preflight__checks">
              {report.checks.map((check) => {
                const Icon = severityIcon[check.severity];
                return (
                  <article key={check.id} data-severity={check.severity}>
                    <Icon aria-hidden="true" />
                    <div><strong>{check.title}</strong><p>{check.detail}</p>{check.fixHint && <small>{check.fixHint}</small>}</div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={cancel} disabled={opening}>Voltar à preparação</Button>
          <Button onClick={continueOpen} disabled={!report?.ready || opening}>
            {opening ? <Loader2 className="animate-spin" /> : <Radio />}
            Abrir sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
