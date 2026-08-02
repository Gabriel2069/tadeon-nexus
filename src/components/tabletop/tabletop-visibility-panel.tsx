import {
  ChevronDown,
  ChevronUp,
  CloudFog,
  Eye,
  EyeOff,
  LampDesk,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wall,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TabletopVisibilityError,
  tabletopVisibilityService,
  type TabletopFogStroke,
  type TabletopLight,
  type TabletopVisibilityState,
  type TabletopWall,
} from "@/lib/tabletop/tabletop-visibility-service";
import "@/styles/tabletop-visibility.css";

interface TabletopVisibilityPanelProps {
  enabled: boolean;
  editable: boolean;
  sceneId: string | null;
  sceneWidth: number;
  sceneHeight: number;
  state: TabletopVisibilityState;
  dirty: boolean;
  onPreview: (state: TabletopVisibilityState) => void;
  onSaved: (state: TabletopVisibilityState, sceneVersion: number) => void;
}

function visibilityErrorMessage(error: unknown) {
  if (!(error instanceof TabletopVisibilityError))
    return "Não foi possível salvar a visão desta cena.";
  if (error.code === "TABLETOP_VISIBILITY_CONFLICT")
    return "A iluminação foi alterada em outra sessão. Reabra a cena antes de salvar.";
  if (error.code === "TABLETOP_VISIBILITY_FORBIDDEN")
    return "Seu papel atual não pode alterar a visão desta cena.";
  if (error.code === "TABLETOP_VISIBILITY_DISABLED")
    return "O módulo de iluminação está desligado para sua conta.";
  if (error.code === "TABLETOP_VISIBILITY_INVALID")
    return "Revise os limites das paredes, luzes e pincéis.";
  return "O banco não conseguiu concluir o salvamento da visão.";
}

function numberValue(value: string, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="tadeon-visibility-field">
      <span>{label}</span>
      <Input
        type="number"
        step="1"
        value={Math.round(value)}
        disabled={disabled}
        onChange={(event) => onChange(numberValue(event.target.value, value))}
      />
    </label>
  );
}

export function TabletopVisibilityPanel({
  enabled,
  editable,
  sceneId,
  sceneWidth,
  sceneHeight,
  state,
  dirty,
  onPreview,
  onSaved,
}: TabletopVisibilityPanelProps) {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  if (!enabled) return null;

  const disabled = !editable || !sceneId || saving;
  const update = (patch: Partial<TabletopVisibilityState>) =>
    onPreview({ ...state, ...patch });
  const updateWall = (id: string, patch: Partial<TabletopWall>) =>
    update({ walls: state.walls.map((wall) => wall.id === id ? { ...wall, ...patch } : wall) });
  const updateLight = (id: string, patch: Partial<TabletopLight>) =>
    update({ lights: state.lights.map((light) => light.id === id ? { ...light, ...patch } : light) });
  const updateFog = (id: string, patch: Partial<TabletopFogStroke>) =>
    update({ fogStrokes: state.fogStrokes.map((stroke) => stroke.id === id ? { ...stroke, ...patch } : stroke) });

  const addWall = () => {
    const centerX = sceneWidth / 2;
    const centerY = sceneHeight / 2;
    update({
      walls: [...state.walls, {
        id: crypto.randomUUID(),
        x1: centerX - 160,
        y1: centerY,
        x2: centerX + 160,
        y2: centerY,
        wallType: "wall",
        blocksVision: true,
        blocksMovement: true,
      }],
    });
  };

  const addLight = () => update({
    lights: [...state.lights, {
      id: crypto.randomUUID(),
      entityId: null,
      x: sceneWidth / 2,
      y: sceneHeight / 2,
      radius: Math.max(160, Math.min(sceneWidth, sceneHeight) / 5),
      intensity: 1,
      color: "#f2c66d",
      enabled: true,
      castsShadows: true,
    }],
  });

  const addFogStroke = (operation: TabletopFogStroke["operation"]) => update({
    fogEnabled: true,
    fogStrokes: [...state.fogStrokes, {
      id: crypto.randomUUID(),
      operation,
      points: [{ x: sceneWidth / 2, y: sceneHeight / 2 }],
      radius: Math.max(80, Math.min(sceneWidth, sceneHeight) / 10),
      sequenceIndex: state.fogStrokes.length,
    }],
  });

  const save = async () => {
    if (!sceneId) return;
    setSaving(true);
    try {
      const saved = await tabletopVisibilityService.save(sceneId, state);
      onSaved(saved.visibility, saved.sceneVersion);
      toast.success("Iluminação e névoa salvas.");
    } catch (error) {
      toast.error(visibilityErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="tadeon-visibility" aria-label="Iluminação e névoa">
      <button
        type="button"
        className="tadeon-visibility__heading"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="tadeon-visibility__mark"><CloudFog aria-hidden="true" /></span>
        <span><strong>Visão da cena</strong><small>luz, paredes e névoa</small></span>
        {dirty && <span className="tadeon-visibility__dirty">não salvo</span>}
        {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </button>

      {open && (
        <div className="tadeon-visibility__body">
          <div className="tadeon-visibility__ambient">
            <label>
              <span><Eye aria-hidden="true" /> Luz ambiente</span>
              <output>{Math.round(state.globalIllumination * 100)}%</output>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(state.globalIllumination * 100)}
                disabled={disabled}
                onChange={(event) => update({ globalIllumination: Number(event.target.value) / 100 })}
              />
            </label>
            <div className="tadeon-visibility__switch">
              <div><strong>Névoa de guerra</strong><small>oculta áreas ainda não reveladas</small></div>
              <Switch
                checked={state.fogEnabled}
                disabled={disabled}
                onCheckedChange={(fogEnabled) => update({ fogEnabled })}
                aria-label="Ativar névoa de guerra"
              />
            </div>
            {state.fogEnabled && (
              <label>
                <span><EyeOff aria-hidden="true" /> Opacidade</span>
                <output>{Math.round(state.fogOpacity * 100)}%</output>
                <input
                  type="range"
                  min="35"
                  max="100"
                  value={Math.round(state.fogOpacity * 100)}
                  disabled={disabled}
                  onChange={(event) => update({ fogOpacity: Number(event.target.value) / 100 })}
                />
              </label>
            )}
          </div>

          <div className="tadeon-visibility__actions">
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addWall}>
              <Wall aria-hidden="true" /> Parede
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addLight}>
              <LampDesk aria-hidden="true" /> Luz
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => addFogStroke("reveal")}>
              <Plus aria-hidden="true" /> Revelar
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => addFogStroke("hide")}>
              <EyeOff aria-hidden="true" /> Ocultar
            </Button>
          </div>

          {state.walls.length > 0 && (
            <div className="tadeon-visibility__group">
              <header><Wall aria-hidden="true" /><strong>Paredes e portas</strong><span>{state.walls.length}</span></header>
              {state.walls.map((wall, index) => (
                <article key={wall.id} className="tadeon-visibility__item">
                  <div className="tadeon-visibility__item-title">
                    <strong>{wall.wallType === "wall" ? `Parede ${index + 1}` : `Porta ${index + 1}`}</strong>
                    <select
                      value={wall.wallType}
                      disabled={disabled}
                      onChange={(event) => updateWall(wall.id, { wallType: event.target.value as TabletopWall["wallType"] })}
                    >
                      <option value="wall">Parede</option>
                      <option value="door_closed">Porta fechada</option>
                      <option value="door_open">Porta aberta</option>
                      <option value="door_locked">Porta trancada</option>
                    </select>
                    <button type="button" disabled={disabled} aria-label="Excluir parede" onClick={() => update({ walls: state.walls.filter((item) => item.id !== wall.id) })}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                  <div className="tadeon-visibility__coordinates">
                    <NumberField label="X1" value={wall.x1} disabled={disabled} onChange={(x1) => updateWall(wall.id, { x1 })} />
                    <NumberField label="Y1" value={wall.y1} disabled={disabled} onChange={(y1) => updateWall(wall.id, { y1 })} />
                    <NumberField label="X2" value={wall.x2} disabled={disabled} onChange={(x2) => updateWall(wall.id, { x2 })} />
                    <NumberField label="Y2" value={wall.y2} disabled={disabled} onChange={(y2) => updateWall(wall.id, { y2 })} />
                  </div>
                  <div className="tadeon-visibility__checks">
                    <label><input type="checkbox" checked={wall.blocksVision} disabled={disabled} onChange={(event) => updateWall(wall.id, { blocksVision: event.target.checked })} /> bloqueia visão</label>
                    <label><input type="checkbox" checked={wall.blocksMovement} disabled={disabled} onChange={(event) => updateWall(wall.id, { blocksMovement: event.target.checked })} /> bloqueia movimento</label>
                  </div>
                </article>
              ))}
            </div>
          )}

          {state.lights.length > 0 && (
            <div className="tadeon-visibility__group">
              <header><LampDesk aria-hidden="true" /><strong>Fontes de luz</strong><span>{state.lights.length}</span></header>
              {state.lights.map((light, index) => (
                <article key={light.id} className="tadeon-visibility__item">
                  <div className="tadeon-visibility__item-title">
                    <strong>Luz {index + 1}</strong>
                    <input type="color" value={light.color} disabled={disabled} aria-label="Cor da luz" onChange={(event) => updateLight(light.id, { color: event.target.value })} />
                    <Switch checked={light.enabled} disabled={disabled} onCheckedChange={(enabled) => updateLight(light.id, { enabled })} aria-label={`Ativar luz ${index + 1}`} />
                    <button type="button" disabled={disabled} aria-label="Excluir luz" onClick={() => update({ lights: state.lights.filter((item) => item.id !== light.id) })}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                  <div className="tadeon-visibility__coordinates is-light">
                    <NumberField label="X" value={light.x} disabled={disabled} onChange={(x) => updateLight(light.id, { x })} />
                    <NumberField label="Y" value={light.y} disabled={disabled} onChange={(y) => updateLight(light.id, { y })} />
                    <NumberField label="Raio" value={light.radius} disabled={disabled} onChange={(radius) => updateLight(light.id, { radius })} />
                  </div>
                  <label className="tadeon-visibility__intensity">
                    <span>Intensidade</span><output>{Math.round(light.intensity * 100)}%</output>
                    <input type="range" min="0" max="100" value={Math.round(light.intensity * 100)} disabled={disabled} onChange={(event) => updateLight(light.id, { intensity: Number(event.target.value) / 100 })} />
                  </label>
                </article>
              ))}
            </div>
          )}

          {state.fogStrokes.length > 0 && (
            <div className="tadeon-visibility__group">
              <header><CloudFog aria-hidden="true" /><strong>Operações de névoa</strong><span>{state.fogStrokes.length}</span></header>
              <div className="tadeon-visibility__fog-list">
                {state.fogStrokes.map((stroke, index) => (
                  <div key={stroke.id} className="tadeon-visibility__fog-item">
                    <header>
                      {stroke.operation === "reveal" ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                      <span>{stroke.operation === "reveal" ? "Revelar" : "Ocultar"} {index + 1}</span>
                      <small>{stroke.points.length} ponto(s)</small>
                      <button type="button" disabled={disabled} aria-label="Excluir operação de névoa" onClick={() => update({ fogStrokes: state.fogStrokes.filter((item) => item.id !== stroke.id).map((item, sequenceIndex) => ({ ...item, sequenceIndex })) })}>
                        <Trash2 aria-hidden="true" />
                      </button>
                    </header>
                    <div className="tadeon-visibility__coordinates is-light">
                      <NumberField label="Centro X" value={stroke.points[0]?.x ?? 0} disabled={disabled} onChange={(x) => updateFog(stroke.id, { points: stroke.points.map((point, pointIndex) => pointIndex === 0 ? { ...point, x } : point) })} />
                      <NumberField label="Centro Y" value={stroke.points[0]?.y ?? 0} disabled={disabled} onChange={(y) => updateFog(stroke.id, { points: stroke.points.map((point, pointIndex) => pointIndex === 0 ? { ...point, y } : point) })} />
                      <NumberField label="Raio" value={stroke.radius} disabled={disabled} onChange={(radius) => updateFog(stroke.id, { radius })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tadeon-visibility__footer">
            <p>{dirty ? "Prévia local — salve para transmitir." : `Versão de visão ${state.version}`}</p>
            <Button type="button" size="sm" disabled={disabled || !dirty} onClick={() => void save()}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
              Salvar visão
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
