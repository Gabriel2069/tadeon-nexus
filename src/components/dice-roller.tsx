import { useState } from "react";
import { Dices, X, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


type KeepMode = "sum" | "highest" | "lowest";

interface RollEntry {
  id: number;
  expr: string;
  rolls: number[];
  modifier: number;
  total: number;
  ts: string;
  keep: KeepMode;
}

function rollExpr(expr: string): { rolls: number[]; modifier: number; total: number; keep: KeepMode } | null {
  // Supports e.g. 2d6+3, d20, 4d4-1, :2d20+10 (highest), ;2d20+10 (lowest)
  const cleaned = expr.replace(/\s/g, "").toLowerCase();
  let keep: KeepMode = "sum";
  let body = cleaned;
  if (cleaned.startsWith(":")) { keep = "highest"; body = cleaned.slice(1); }
  else if (cleaned.startsWith(";")) { keep = "lowest"; body = cleaned.slice(1); }
  const match = body.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const count = parseInt(match[1] || "1", 10);
  const sides = parseInt(match[2], 10);
  const mod = match[3] ? parseInt(match[3], 10) : 0;
  if (count < 1 || count > 50 || sides < 2 || sides > 1000) return null;
  const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
  const base =
    keep === "highest" ? Math.max(...rolls)
    : keep === "lowest" ? Math.min(...rolls)
    : rolls.reduce((a, b) => a + b, 0);
  return { rolls, modifier: mod, total: base + mod, keep };
}

const QUICK = ["d4", "d6", "d8", "d10", "d12", "d20", "d100", "2d6"];

export function DiceRoller() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("d20");
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [showInfo, setShowInfo] = useState(false);


  const doRoll = (e: string) => {
    const r = rollExpr(e);
    if (!r) return;
    setHistory((p) => [
      { id: Date.now(), expr: e, ...r, ts: new Date().toLocaleTimeString("pt-BR") },
      ...p,
    ].slice(0, 20));
  };

  return (
    <>
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-5 right-5 z-30 h-13 w-13 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 hover:shadow-primary/50 transition-all flex items-center justify-center"
        aria-label="Rolar dados"
        style={{ width: 56, height: 56 }}
      >
        <Dices className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-30 w-80 max-w-[calc(100vw-2.5rem)] bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h3 className="font-cinzel font-bold text-primary">Rolar Dados</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowInfo((p) => !p)}
                className={`p-1 rounded-md transition-colors ${
                  showInfo ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                aria-label="Informações sobre fórmulas"
                title="Como escrever rolagens"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="mb-3 p-2.5 rounded-lg bg-secondary/50 border border-border/60 text-[11px] leading-relaxed animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <p className="font-bold text-primary mb-1">Formato: <code className="font-mono">NdF±M</code></p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li><code className="font-mono text-foreground">N</code> · quantidade de dados (1 a 50, opcional — padrão 1)</li>
                <li><code className="font-mono text-foreground">F</code> · faces do dado (2 a 1000)</li>
                <li><code className="font-mono text-foreground">±M</code> · modificador fixo opcional (sempre somado à parte)</li>
                <li><code className="font-mono text-foreground">:</code> · prefixo: usa o <b>maior dado</b> rolado + modificador</li>
                <li><code className="font-mono text-foreground">;</code> · prefixo: usa o <b>menor dado</b> rolado + modificador</li>
              </ul>
              <p className="mt-1.5 text-muted-foreground">
                Exemplos: <code className="font-mono text-foreground">d20</code>, <code className="font-mono text-foreground">2d6+3</code>, <code className="font-mono text-foreground">4d4-1</code>, <code className="font-mono text-foreground">:2d20+10</code>, <code className="font-mono text-foreground">;3d20-2</code>.
              </p>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              doRoll(expr);
            }}
            className="flex gap-2"
          >
            <Input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="2d6+3"
              className="h-9"
            />
            <Button type="submit" size="sm">Rolar</Button>
          </form>

          <div className="grid grid-cols-4 gap-1.5 mt-3">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => doRoll(q)}
                className="text-xs py-1.5 rounded-md bg-secondary hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Histórico</span>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                title="Limpar histórico"
              >
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sem rolagens ainda.
              </p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="bg-secondary/40 rounded-md p-2 text-xs animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  <div className="flex justify-between items-baseline">
                    <span className="font-cinzel font-bold text-primary">{h.expr}</span>
                    <span className="text-muted-foreground text-[10px]">{h.ts}</span>
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    [{h.rolls.join(", ")}]{h.keep === "highest" ? ` → maior = ${Math.max(...h.rolls)}` : h.keep === "lowest" ? ` → menor = ${Math.min(...h.rolls)}` : ""}{h.modifier ? (h.modifier > 0 ? ` +${h.modifier}` : ` ${h.modifier}`) : ""}
                  </div>
                  <div className="text-lg font-bold text-foreground mt-1">= {h.total}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </>
  );
}

