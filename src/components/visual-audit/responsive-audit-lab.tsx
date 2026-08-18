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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuditKind = "overflow" | "target" | "collision" | "clipping" | "motion" | "blocker" | "scroll";
type AuditIssue = { kind: AuditKind; label: string; detail: string };
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

const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, [role='button'], [role='tab'], [role='menuitem'], [role='option'], [role='switch']";
const TEXT_SELECTOR = "button, a, label, p, span, small, strong, h1, h2, h3, h4, [data-slot='card-title']";

function parseDurations(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .map((item) => (item.endsWith("ms") ? Number.parseFloat(item) : Number.parseFloat(item) * 1000))
    .filter(Number.isFinite);
}

function intersectionRatio(a: DOMRect, b: DOMRect) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const area = width * height;
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return smaller > 0 ? area / smaller : 0;
}

export function ResponsiveAuditLab() {
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
    const classes = typeof html.className === "string"
      ? html.className.split(/\s+/).filter(Boolean).slice(0, 2).map((item) => `.${item}`).join("")
      : "";
    return `${element.tagName.toLowerCase()}${id}${slot}${classes}`;
  };

  const auditFrame = useCallback(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow || !frame.contentDocument) return;
    setAuditState("running");
    try {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      const viewportWidth = doc.documentElement.clientWidth;
      const viewportHeight = doc.documentElement.clientHeight;
      const findings: AuditIssue[] = [];
      const elements = Array.from(doc.body?.querySelectorAll<HTMLElement>("*") ?? []);
      const visibleInteractive: HTMLElement[] = [];
      const dialogOpen = Boolean(doc.querySelector('[data-slot="dialog-content"][data-state="open"], [data-slot="alert-dialog-content"][data-state="open"], [data-slot="sheet-content"][data-state="open"]'));
      const reducedMotion = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

      for (const element of elements) {
        const style = win.getComputedStyle(element);
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

        const interactive = element.matches(INTERACTIVE_SELECTOR);
        if (interactive && !element.hasAttribute("disabled") && element.getAttribute("aria-disabled") !== "true") {
          visibleInteractive.push(element);
          const minTarget = viewportWidth <= 1024 ? 42 : 36;
          if (rect.width < minTarget || rect.height < minTarget) {
            findings.push({
              kind: "target",
              label: describe(element),
              detail: `${Math.round(rect.width)}x${Math.round(rect.height)}px; esperado ≥ ${minTarget}px neste formato`,
            });
          }

          if (!reducedMotion && element.matches("button, a, [role='button'], [role='tab'], [role='switch']")) {
            const transition = parseDurations(style.transitionDuration);
            const animation = parseDurations(style.animationDuration);
            const hasMotion = transition.some((duration) => duration >= 80) || animation.some((duration) => duration >= 80);
            const motionExempt = element.matches("[data-motion-exempt], .sr-only") || style.position === "static" && element.closest("[data-slot='command-list']");
            if (!hasMotion && !motionExempt) {
              findings.push({
                kind: "motion",
                label: describe(element),
                detail: "controle interativo sem transição/animação perceptível",
              });
            }
          }
        }

        if (element.matches(TEXT_SELECTOR) && element.textContent?.trim() && !element.classList.contains("truncate")) {
          const clipsX = element.scrollWidth > element.clientWidth + 2;
          const clipsY = element.scrollHeight > element.clientHeight + 2;
          const hidesOverflow = ["hidden", "clip"].includes(style.overflow) || ["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY);
          const intentional = element.hasAttribute("title") || element.getAttribute("aria-label") === element.textContent?.trim();
          if (hidesOverflow && (clipsX || clipsY) && !intentional) {
            findings.push({
              kind: "clipping",
              label: describe(element),
              detail: `conteúdo ${clipsX ? "horizontal" : "vertical"} cortado sem indicação de truncamento intencional`,
            });
          }
        }

        const scrollable = ["auto", "scroll"].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 8;
        if (scrollable && element.clientHeight > 0 && element.clientHeight < 72) {
          findings.push({
            kind: "scroll",
            label: describe(element),
            detail: `região rolável comprimida a ${Math.round(element.clientHeight)}px de altura`,
          });
        }

        const coverage = (rect.width * rect.height) / Math.max(1, viewportWidth * viewportHeight);
        const pointerActive = style.pointerEvents !== "none";
        const nearlyInvisible = Number(style.opacity) <= 0.08;
        const fullscreenLayer = coverage >= 0.72 && ["fixed", "absolute"].includes(style.position);
        if (!dialogOpen && pointerActive && nearlyInvisible && fullscreenLayer) {
          findings.push({
            kind: "blocker",
            label: describe(element),
            detail: `camada quase invisível cobre ${Math.round(coverage * 100)}% do viewport e ainda recebe ponteiro`,
          });
        }

        if (findings.length >= 160) break;
      }

      for (let left = 0; left < visibleInteractive.length && findings.length < 160; left += 1) {
        const a = visibleInteractive[left];
        const aRect = a.getBoundingClientRect();
        for (let right = left + 1; right < visibleInteractive.length; right += 1) {
          const b = visibleInteractive[right];
          if (a.contains(b) || b.contains(a)) continue;
          const bRect = b.getBoundingClientRect();
          if (intersectionRatio(aRect, bRect) < 0.32) continue;
          findings.push({
            kind: "collision",
            label: `${describe(a)} × ${describe(b)}`,
            detail: "controles interativos ocupam a mesma área útil",
          });
          break;
        }
      }

      const rootWidth = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth ?? 0);
      if (rootWidth > viewportWidth + 2) {
        findings.unshift({ kind: "overflow", label: "documento", detail: `largura ${rootWidth}px em viewport ${viewportWidth}px` });
      }
      const rootHeight = Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight ?? 0);
      if (rootHeight < viewportHeight * .7) {
        findings.unshift({ kind: "scroll", label: "documento", detail: `conteúdo ocupa apenas ${Math.round(rootHeight / viewportHeight * 100)}% da altura do viewport` });
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
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[1rem_.32rem_1rem_.32rem] border border-primary/20 bg-primary/5 text-primary"><Ruler className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="tadeon-eyebrow">Controle de qualidade visual</p>
              <h1 className="mt-1 font-cinzel text-2xl font-semibold md:text-3xl">Auditoria responsiva</h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground md:text-sm">Revisa encaixe, colisões, texto cortado, alvos de toque, scroll, camadas bloqueadoras e motion em cada viewport.</p>
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
              <Input id="audit-path" value={pathInput} onChange={(event) => setPathInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") navigatePreview(pathInput); }} />
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
              return <Button key={preset.label} size="sm" variant={active ? "default" : "outline"} onClick={() => { setWidth(preset.width); setHeight(preset.height); }} className="shrink-0 gap-1.5"><Icon className="h-3.5 w-3.5" />{preset.label}<span className="opacity-60">{preset.width}x{preset.height}</span></Button>;
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
            <div><p className="tadeon-eyebrow">Diagnóstico</p><h2 className="mt-1 font-cinzel text-lg font-semibold">Encaixe e interação</h2></div>
            {auditState === "ready" && issues.length === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Sinaliza problemas estruturais sem penalizar canvas, truncamentos declarados ou reduced motion.</p>
          <div className="tadeon-visual-audit__results mt-4 space-y-2">
            {auditState === "blocked" ? <p className="rounded-xl border border-amber-400/20 p-3 text-xs text-amber-200">O navegador bloqueou a leitura do frame; a revisão visual manual continua disponível.</p> : issues.length ? issues.map((issue, index) => (
              <div key={`${issue.kind}-${issue.label}-${index}`} className="rounded-xl border border-border/70 p-3">
                <div className="flex items-center gap-2"><Badge variant="outline">{issue.kind}</Badge><code className="min-w-0 truncate text-[10px] text-primary">{issue.label}</code></div>
                <p className="mt-1 text-[11px] text-muted-foreground">{issue.detail}</p>
              </div>
            )) : <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-muted-foreground">{auditState === "running" ? "Analisando o frame..." : "Nenhum problema estrutural detectado neste estado."}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
