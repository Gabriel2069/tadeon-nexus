import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Columns3,
  ExternalLink,
  Eye,
  Frame,
  Monitor,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Smartphone,
  Tablet,
} from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { PopupGallery } from "@/components/visual-audit/popup-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/visual-audit")({
  validateSearch: (search: Record<string, unknown>) => ({
    gallery: search.gallery === 1 || search.gallery === "1" ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Auditoria visual · Tadeon Nexus" },
      { name: "description", content: "Laboratório interno de responsividade do Tadeon Nexus." },
    ],
  }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <VisualAuditPage />
    </ProtectedShell>
  ),
});

type AuditIssue = { kind: "overflow" | "target"; label: string; detail: string };
type ViewportPreset = { label: string; width: number; height: number; icon: typeof Smartphone };

const PRESETS: ViewportPreset[] = [
  { label: "iPhone", width: 390, height: 844, icon: Smartphone },
  { label: "Mobile largo", width: 430, height: 932, icon: Smartphone },
  { label: "Tablet retrato", width: 768, height: 1024, icon: Tablet },
  { label: "Tablet largo", width: 820, height: 1180, icon: Tablet },
  { label: "Tablet paisagem", width: 1024, height: 768, icon: Tablet },
  { label: "Notebook", width: 1366, height: 768, icon: Monitor },
  { label: "Desktop", width: 1440, height: 1000, icon: Monitor },
  { label: "Full HD", width: 1920, height: 1080, icon: Monitor },
];

const PAGES = [
  ["Dashboard", "/"],
  ["O Nexus", "/nexus"],
  ["Painel do Mestre", "/master-panel"],
  ["Usuários", "/manage-users"],
  ["Backup", "/nexus-tools"],
  ["Offline", "/offline"],
  ["Mesa", "/tabletop"],
  ["Popups", "/visual-audit?gallery=1"],
] as const;

function VisualAuditPage() {
  const { gallery } = Route.useSearch();
  return gallery ? <PopupGallery /> : <ResponsiveAuditLab />;
}

function ResponsiveAuditLab() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState(390);
  const [height, setHeight] = useState(844);
  const [path, setPath] = useState("/");
  const [pathInput, setPathInput] = useState("/");
  const [guides, setGuides] = useState(true);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [auditState, setAuditState] = useState<"idle" | "running" | "ready" | "blocked">("idle");

  const describe = (element: Element) => {
    const html = element as HTMLElement;
    const slot = html.dataset.slot ? `[${html.dataset.slot}]` : "";
    const id = html.id ? `#${html.id}` : "";
    const cls = typeof html.className === "string"
      ? html.className.split(/\s+/).filter(Boolean).slice(0, 2).map((item) => `.${item}`).join("")
      : "";
    return `${element.tagName.toLowerCase()}${id}${slot}${cls}`;
  };

  const auditFrame = useCallback(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow || !frame.contentDocument) return;
    setAuditState("running");
    try {
      const doc = frame.contentDocument;
      const viewportWidth = doc.documentElement.clientWidth;
      const findings: AuditIssue[] = [];
      const elements = Array.from(doc.body?.querySelectorAll<HTMLElement>("*") ?? []);

      for (const element of elements) {
        const style = frame.contentWindow.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        const ignoredCanvas = element.matches("canvas, .tadeon-tabletop-stage, .tadeon-graph-canvas");
        if (!ignoredCanvas && rect.width <= viewportWidth * 1.8 && (rect.left < -2 || rect.right > viewportWidth + 2)) {
          findings.push({
            kind: "overflow",
            label: describe(element),
            detail: `x ${Math.round(rect.left)}..${Math.round(rect.right)} em viewport ${viewportWidth}px`,
          });
        }
        const interactive = element.matches(
          "button, a, input, select, textarea, [role='button'], [role='tab'], [role='menuitem'], [role='option']",
        );
        if (interactive && !element.hasAttribute("disabled") && (rect.width < 40 || rect.height < 40)) {
          findings.push({ kind: "target", label: describe(element), detail: `${Math.round(rect.width)}x${Math.round(rect.height)}px` });
        }
        if (findings.length >= 80) break;
      }

      const rootWidth = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth ?? 0);
      if (rootWidth > viewportWidth + 2) {
        findings.unshift({ kind: "overflow", label: "documento", detail: `largura ${rootWidth}px em viewport ${viewportWidth}px` });
      }
      setIssues(findings);
      setAuditState("ready");
    } catch {
      setIssues([]);
      setAuditState("blocked");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(auditFrame, 520);
    return () => window.clearTimeout(timer);
  }, [width, height, path, auditFrame]);

  const navigatePreview = (next: string) => {
    const normalized = next.startsWith("/") ? next : `/${next}`;
    setPath(normalized);
    setPathInput(normalized);
    setIssues([]);
    setAuditState("idle");
  };

  return (
    <div className="tadeon-visual-audit">
      <section className="tadeon-page-hero tadeon-surface mb-4 rounded-2xl px-5 py-5 md:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem_.32rem_1rem_.32rem] border border-primary/20 bg-primary/5 text-primary">
              <Ruler className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="tadeon-eyebrow">Controle de qualidade visual</p>
              <h1 className="mt-1 font-cinzel text-2xl font-semibold md:text-3xl">Auditoria responsiva</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground md:text-sm">
                Abra cada área em um viewport real, troque de formato e rode a inspeção de encaixe.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Somente mestre</Badge>
        </div>
      </section>

      <Card className="mb-4 p-4 md:p-5">
        <div className="tadeon-visual-audit__controls">
          <div className="min-w-0">
            <Label htmlFor="audit-path">Página em revisão</Label>
            <div className="mt-2 flex min-w-0 gap-2">
              <Input id="audit-path" value={pathInput} onChange={(event) => setPathInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && navigatePreview(pathInput)} />
              <Button variant="outline" onClick={() => navigatePreview(pathInput)}><ExternalLink className="h-4 w-4" />Abrir</Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setWidth(height); setHeight(width); }}><RefreshCw className="h-4 w-4" />Girar</Button>
            <Button variant={guides ? "default" : "outline"} onClick={() => setGuides((value) => !value)}><Columns3 className="h-4 w-4" />Guias</Button>
            <Button onClick={auditFrame}><Eye className="h-4 w-4" />Analisar</Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="tadeon-visual-audit__presets">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              const active = preset.width === width && preset.height === height;
              return (
                <Button key={preset.label} size="sm" variant={active ? "default" : "outline"} onClick={() => { setWidth(preset.width); setHeight(preset.height); }} className="shrink-0 gap-1.5">
                  <Icon className="h-3.5 w-3.5" />{preset.label}<span className="opacity-60">{preset.width}x{preset.height}</span>
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Frame className="h-4 w-4 text-primary" /><strong className="text-foreground">{width} x {height}</strong></div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PAGES.map(([label, href]) => <Button key={href} size="sm" variant={path === href ? "secondary" : "ghost"} onClick={() => navigatePreview(href)}>{label}</Button>)}
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="tadeon-visual-audit__stage">
          <div className="tadeon-visual-audit__viewport" style={{ width: `${width}px`, height: `${height}px` }}>
            {guides && <><span className="tadeon-visual-audit__guide tadeon-visual-audit__guide--x" /><span className="tadeon-visual-audit__guide tadeon-visual-audit__guide--y" /></>}
            <iframe ref={frameRef} title={`Auditoria de ${path}`} src={path} onLoad={() => window.setTimeout(auditFrame, 450)} />
          </div>
        </div>

        <Card className="h-fit p-4">
          <div className="flex items-center justify-between gap-2">
            <div><p className="tadeon-eyebrow">Diagnóstico</p><h2 className="mt-1 font-cinzel text-lg font-semibold">Encaixe do viewport</h2></div>
            {auditState === "ready" && issues.length === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Sinaliza overflow horizontal e controles menores que 40px. Canvas é ignorado.</p>
          <div className="tadeon-visual-audit__results mt-4 space-y-2">
            {auditState === "blocked" ? (
              <p className="rounded-xl border border-amber-400/20 p-3 text-xs text-amber-200">O navegador bloqueou a leitura do frame; a revisão visual manual continua disponível.</p>
            ) : issues.length ? issues.map((issue, index) => (
              <div key={`${issue.kind}-${issue.label}-${index}`} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center gap-2"><Badge variant="outline">{issue.kind === "overflow" ? "Overflow" : "Toque"}</Badge><code className="min-w-0 truncate text-[10px] text-primary">{issue.label}</code></div>
                <p className="mt-1 text-[11px] text-muted-foreground">{issue.detail}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-muted-foreground">{auditState === "running" ? "Analisando o frame..." : "Nenhum problema estrutural detectado neste estado."}</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
