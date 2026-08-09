import {
  ChevronDown,
  ChevronUp,
  BrickWall,
  CloudFog,
  Eye,
  EyeOff,
  LampDesk,
  Loader2,
  Moon,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
  Sunset,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createTabletopStructure,
  structureCollision,
  structureFamily,
  structureStateLabel,
  structureStateOptions,
  type TabletopStructureType,
} from "@/lib/tabletop/tabletop-spatial";
import {
  TabletopVisibilityError,
  tabletopVisibilityService,
  type TabletopFogStroke,
  type TabletopLight,
  type TabletopVisibilityState,
  type TabletopWall,
} from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopLevel } from "@/lib/tabletop/types";
import { createLevelRevealStrokes } from "@/lib/tabletop/visibility-tooling";
import "@/styles/tabletop-visibility.css";

interface TabletopVisibilityPanelProps {
  enabled: boolean;
  editable: boolean;
  sceneId: string | null;
  sceneWidth: number;
  sceneHeight: number;
  levels: TabletopLevel[];
  activeLevelId: string | null;
  state: TabletopVisibilityState;
  dirty: boolean;
  selectedStructureId: string | null;
  selectedLightId: string | null;
  onSelectStructure: (id: string | null) => void;
  onSelectLight: (id: string | null) => void;
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

const AMBIENT_PRESETS = [
  { label: "Dia", value: 1, icon: Sun },
  { label: "Crepúsculo", value: 0.55, icon: Sunset },
  { label: "Noite", value: 0.18, icon: Moon },
  { label: "Escuridão", value: 0, icon: EyeOff },
] as const;

const LIGHT_PRESETS = [
  { label: "Vela", color: "#f5b56b", radius: 0.08, intensity: 0.58 },
  { label: "Tocha", color: "#f28b43", radius: 0.14, intensity: 0.82 },
  { label: "Lanterna", color: "#f2c66d", radius: 0.2, intensity: 1 },
  { label: "Arcana", color: "#79c8df", radius: 0.18, intensity: 0.92 },
] as const;

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
  levels,
  activeLevelId,
  state,
  dirty,
  selectedStructureId,
  selectedLightId,
  onSelectStructure,
  onSelectLight,
  onPreview,
  onSaved,
}: TabletopVisibilityPanelProps) {
  const [open, setOpen] = useState(true);
  const [architectureOpen, setArchitectureOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  if (!enabled) return null;

  const disabled = !editable || !sceneId || saving;
  const fallbackLevelId = levels[0]?.id ?? "";
  const currentLevelId = activeLevelId ?? fallbackLevelId;
  const levelWalls = state.walls.filter(
    (wall) => (wall.levelId || fallbackLevelId) === currentLevelId,
  );
  const levelLights = state.lights.filter(
    (light) => (light.levelId || fallbackLevelId) === currentLevelId,
  );
  const levelFogStrokes = state.fogStrokes.filter(
    (stroke) => (stroke.levelId || fallbackLevelId) === currentLevelId,
  );
  const update = (patch: Partial<TabletopVisibilityState>) =>
    onPreview({ ...state, ...patch });
  const updateWall = (id: string, patch: Partial<TabletopWall>) =>
    update({
      walls: state.walls.map((wall) =>
        wall.id === id ? { ...wall, ...patch } : wall,
      ),
    });
  const updateLight = (id: string, patch: Partial<TabletopLight>) =>
    update({
      lights: state.lights.map((light) =>
        light.id === id ? { ...light, ...patch } : light,
      ),
    });
  const updateFog = (id: string, patch: Partial<TabletopFogStroke>) =>
    update({
      fogStrokes: state.fogStrokes.map((stroke) =>
        stroke.id === id ? { ...stroke, ...patch } : stroke,
      ),
    });

  const setWallType = (id: string, wallType: TabletopStructureType) =>
    updateWall(id, { wallType, ...structureCollision(wallType) });

  const addWall = (wallType: TabletopStructureType = "wall") => {
    const centerX = sceneWidth / 2;
    const centerY = sceneHeight / 2;
    const roof = structureFamily(wallType) === "roof";
    const structure = createTabletopStructure({
      id: crypto.randomUUID(),
      type: wallType,
      start: roof
        ? { x: centerX - 240, y: centerY - 180 }
        : { x: centerX - 160, y: centerY },
      end: roof
        ? { x: centerX + 240, y: centerY + 180 }
        : { x: centerX + 160, y: centerY },
    });
    if (!structure) return;
    const activeLevel = levels.find((level) => level.id === currentLevelId);
    const spatialStructure: TabletopWall = {
      ...structure,
      levelId: currentLevelId,
      baseElevation: 0,
      height:
        structureFamily(wallType) === "roof"
          ? (activeLevel?.height ?? 192)
          : Math.max(42, (activeLevel?.height ?? 192) * 0.62),
      thickness: 8,
      playerOperable: false,
      version: 1,
    };
    update({
      walls: [...state.walls, spatialStructure],
    });
    onSelectStructure(spatialStructure.id);
  };

  const addLight = (
    preset: (typeof LIGHT_PRESETS)[number] = LIGHT_PRESETS[2],
  ) =>
    update({
      lights: [
        ...state.lights,
        {
          id: crypto.randomUUID(),
          levelId: currentLevelId,
          entityId: null,
          x: sceneWidth / 2,
          y: sceneHeight / 2,
          elevation: 0,
          radius: Math.max(
            80,
            Math.min(sceneWidth, sceneHeight) * preset.radius,
          ),
          intensity: preset.intensity,
          color: preset.color,
          enabled: true,
          castsShadows: true,
        },
      ],
    });

  const replaceLevelFog = (fogStrokes: TabletopFogStroke[]) =>
    update({
      fogEnabled: true,
      fogStrokes: [
        ...state.fogStrokes.filter(
          (stroke) => (stroke.levelId || fallbackLevelId) !== currentLevelId,
        ),
        ...fogStrokes,
      ].map((stroke, sequenceIndex) => ({ ...stroke, sequenceIndex })),
    });

  const coverLevel = () => replaceLevelFog([]);

  const revealLevel = () =>
    replaceLevelFog(
      createLevelRevealStrokes({
        levelId: currentLevelId,
        sceneWidth,
        sceneHeight,
      }),
    );

  const addFogStroke = (operation: TabletopFogStroke["operation"]) =>
    update({
      fogEnabled: true,
      fogStrokes: [
        ...state.fogStrokes,
        {
          id: crypto.randomUUID(),
          levelId: currentLevelId,
          operation,
          points: [{ x: sceneWidth / 2, y: sceneHeight / 2 }],
          radius: Math.max(80, Math.min(sceneWidth, sceneHeight) / 10),
          sequenceIndex: state.fogStrokes.length,
        },
      ],
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
        <span className="tadeon-visibility__mark">
          <CloudFog aria-hidden="true" />
        </span>
        <span>
          <strong>Visão da cena</strong>
          <small>luz, paredes e névoa</small>
        </span>
        {dirty && <span className="tadeon-visibility__dirty">não salvo</span>}
        {open ? (
          <ChevronUp aria-hidden="true" />
        ) : (
          <ChevronDown aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="tadeon-visibility__body">
          <div className="tadeon-visibility__ambient">
            <label>
              <span>
                <Eye aria-hidden="true" /> Luz ambiente
              </span>
              <output>{Math.round(state.globalIllumination * 100)}%</output>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(state.globalIllumination * 100)}
                disabled={disabled}
                onChange={(event) =>
                  update({
                    globalIllumination: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
            <div
              className="tadeon-visibility__preset-grid"
              aria-label="Cenas de luz ambiente"
            >
              {AMBIENT_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={disabled}
                    aria-pressed={
                      Math.abs(state.globalIllumination - preset.value) < 0.01
                    }
                    onClick={() => update({ globalIllumination: preset.value })}
                  >
                    <Icon aria-hidden="true" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="tadeon-visibility__switch">
              <div>
                <strong>Névoa de guerra</strong>
                <small>oculta áreas ainda não reveladas</small>
              </div>
              <Switch
                checked={state.fogEnabled}
                disabled={disabled}
                onCheckedChange={(fogEnabled) => update({ fogEnabled })}
                aria-label="Ativar névoa de guerra"
              />
            </div>
            {state.fogEnabled && (
              <>
                <label>
                  <span>
                    <EyeOff aria-hidden="true" /> Opacidade
                  </span>
                  <output>{Math.round(state.fogOpacity * 100)}%</output>
                  <input
                    type="range"
                    min="35"
                    max="100"
                    value={Math.round(state.fogOpacity * 100)}
                    disabled={disabled}
                    onChange={(event) =>
                      update({ fogOpacity: Number(event.target.value) / 100 })
                    }
                  />
                </label>
                <div className="tadeon-visibility__fog-shortcuts">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={coverLevel}
                  >
                    <EyeOff aria-hidden="true" /> Cobrir andar
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={revealLevel}
                  >
                    <Eye aria-hidden="true" /> Revelar andar
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="tadeon-visibility__toolbox">
            <header>
              <Sparkles aria-hidden="true" />
              <span>
                <strong>Luzes rápidas</strong>
                <small>cria no centro do andar; ajuste abaixo</small>
              </span>
            </header>
            <div className="tadeon-visibility__light-presets">
              {LIGHT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  disabled={disabled}
                  onClick={() => addLight(preset)}
                >
                  <span style={{ backgroundColor: preset.color }} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tadeon-visibility__actions">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addWall("wall")}
            >
              <BrickWall aria-hidden="true" /> Parede
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addWall("door_closed")}
            >
              <Plus aria-hidden="true" /> Porta
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addWall("window_closed")}
            >
              <Plus aria-hidden="true" /> Janela
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addWall("roof_visible")}
            >
              <Plus aria-hidden="true" /> Telhado
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addLight()}
            >
              <LampDesk aria-hidden="true" /> Luz
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addFogStroke("reveal")}
            >
              <Plus aria-hidden="true" /> Revelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => addFogStroke("hide")}
            >
              <EyeOff aria-hidden="true" /> Ocultar
            </Button>
          </div>

          {levelWalls.length > 0 && (
            <details
              className="tadeon-visibility__group"
              open={architectureOpen}
              onToggle={(event) =>
                setArchitectureOpen(event.currentTarget.open)
              }
            >
              <summary>
                <BrickWall aria-hidden="true" />
                <strong>Arquitetura</strong>
                <span>{levelWalls.length}</span>
                <ChevronDown aria-hidden="true" />
              </summary>
              {levelWalls.map((wall, index) => (
                <article
                  key={wall.id}
                  className="tadeon-visibility__item"
                  data-family={structureFamily(wall.wallType)}
                  data-selected={wall.id === selectedStructureId}
                  onPointerDownCapture={() => onSelectStructure(wall.id)}
                >
                  <div className="tadeon-visibility__item-title">
                    <strong>
                      {structureStateLabel(wall.wallType)} · {index + 1}
                    </strong>
                    <select
                      value={structureFamily(wall.wallType)}
                      disabled={disabled}
                      aria-label={`Família da estrutura ${index + 1}`}
                      onChange={(event) => {
                        const typeByFamily = {
                          wall: "wall",
                          door: "door_closed",
                          window: "window_closed",
                          roof: "roof_visible",
                        } as const;
                        setWallType(
                          wall.id,
                          typeByFamily[
                            event.target.value as keyof typeof typeByFamily
                          ],
                        );
                      }}
                    >
                      <option value="wall">Parede</option>
                      <option value="door">Porta</option>
                      <option value="window">Janela</option>
                      <option value="roof">Telhado</option>
                    </select>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label="Excluir estrutura"
                      onClick={() => {
                        update({
                          walls: state.walls.filter(
                            (item) => item.id !== wall.id,
                          ),
                        });
                        if (wall.id === selectedStructureId)
                          onSelectStructure(null);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                  {structureFamily(wall.wallType) !== "wall" && (
                    <div
                      className="tadeon-visibility__states"
                      aria-label={`Estado de ${structureStateLabel(wall.wallType)}`}
                    >
                      {structureStateOptions(
                        structureFamily(wall.wallType),
                      ).map((stateType) => (
                        <button
                          key={stateType}
                          type="button"
                          disabled={disabled}
                          aria-pressed={wall.wallType === stateType}
                          onClick={() => setWallType(wall.id, stateType)}
                        >
                          {structureStateLabel(stateType).replace(
                            /^(Porta|Janela|Telhado) /,
                            "",
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <details className="tadeon-visibility__precision">
                    <summary>
                      Posição precisa <ChevronDown aria-hidden="true" />
                    </summary>
                    <div className="tadeon-visibility__coordinates">
                      <NumberField
                        label="X1"
                        value={wall.x1}
                        disabled={disabled}
                        onChange={(x1) => updateWall(wall.id, { x1 })}
                      />
                      <NumberField
                        label="Y1"
                        value={wall.y1}
                        disabled={disabled}
                        onChange={(y1) => updateWall(wall.id, { y1 })}
                      />
                      <NumberField
                        label="X2"
                        value={wall.x2}
                        disabled={disabled}
                        onChange={(x2) => updateWall(wall.id, { x2 })}
                      />
                      <NumberField
                        label="Y2"
                        value={wall.y2}
                        disabled={disabled}
                        onChange={(y2) => updateWall(wall.id, { y2 })}
                      />
                      <NumberField
                        label="Base Z"
                        value={wall.baseElevation ?? 0}
                        disabled={disabled}
                        onChange={(baseElevation) =>
                          updateWall(wall.id, { baseElevation })
                        }
                      />
                      <NumberField
                        label="Altura"
                        value={wall.height ?? 64}
                        disabled={disabled}
                        onChange={(height) =>
                          updateWall(wall.id, {
                            height: Math.max(8, height),
                          })
                        }
                      />
                      <NumberField
                        label="Espessura"
                        value={wall.thickness ?? 8}
                        disabled={disabled}
                        onChange={(thickness) =>
                          updateWall(wall.id, {
                            thickness: Math.max(1, thickness),
                          })
                        }
                      />
                    </div>
                  </details>
                  {structureFamily(wall.wallType) !== "roof" && (
                    <div className="tadeon-visibility__checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={wall.blocksVision}
                          disabled={disabled}
                          onChange={(event) =>
                            updateWall(wall.id, {
                              blocksVision: event.target.checked,
                            })
                          }
                        />{" "}
                        bloqueia visão
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={wall.blocksMovement}
                          disabled={disabled}
                          onChange={(event) =>
                            updateWall(wall.id, {
                              blocksMovement: event.target.checked,
                            })
                          }
                        />{" "}
                        bloqueia movimento
                      </label>
                    </div>
                  )}
                  {structureFamily(wall.wallType) === "door" && (
                    <div className="tadeon-visibility__switch">
                      <span>
                        <strong>Jogadores podem acionar</strong>
                        <small>
                          portas trancadas continuam exclusivas do mestre
                        </small>
                      </span>
                      <Switch
                        checked={wall.playerOperable ?? false}
                        disabled={disabled || wall.wallType === "door_locked"}
                        onCheckedChange={(playerOperable) =>
                          updateWall(wall.id, { playerOperable })
                        }
                      />
                    </div>
                  )}
                </article>
              ))}
            </details>
          )}

          {levelLights.length > 0 && (
            <div className="tadeon-visibility__group">
              <header>
                <LampDesk aria-hidden="true" />
                <strong>Fontes de luz</strong>
                <span>{levelLights.length}</span>
              </header>
              {levelLights.map((light, index) => (
                <article
                  key={light.id}
                  className="tadeon-visibility__item"
                  data-selected={light.id === selectedLightId}
                  onPointerDownCapture={() => onSelectLight(light.id)}
                >
                  <div className="tadeon-visibility__item-title">
                    <strong>Luz {index + 1}</strong>
                    <input
                      type="color"
                      value={light.color}
                      disabled={disabled}
                      aria-label="Cor da luz"
                      onChange={(event) =>
                        updateLight(light.id, { color: event.target.value })
                      }
                    />
                    <Switch
                      checked={light.enabled}
                      disabled={disabled}
                      onCheckedChange={(enabled) =>
                        updateLight(light.id, { enabled })
                      }
                      aria-label={`Ativar luz ${index + 1}`}
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label="Excluir luz"
                      onClick={() => {
                        update({
                          lights: state.lights.filter(
                            (item) => item.id !== light.id,
                          ),
                        });
                        if (light.id === selectedLightId) onSelectLight(null);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                  <div className="tadeon-visibility__coordinates is-light">
                    <NumberField
                      label="X"
                      value={light.x}
                      disabled={disabled}
                      onChange={(x) => updateLight(light.id, { x })}
                    />
                    <NumberField
                      label="Y"
                      value={light.y}
                      disabled={disabled}
                      onChange={(y) => updateLight(light.id, { y })}
                    />
                    <NumberField
                      label="Raio"
                      value={light.radius}
                      disabled={disabled}
                      onChange={(radius) => updateLight(light.id, { radius })}
                    />
                    <NumberField
                      label="Elevação"
                      value={light.elevation ?? 0}
                      disabled={disabled}
                      onChange={(elevation) =>
                        updateLight(light.id, { elevation })
                      }
                    />
                  </div>
                  <label className="tadeon-visibility__intensity">
                    <span>Intensidade</span>
                    <output>{Math.round(light.intensity * 100)}%</output>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(light.intensity * 100)}
                      disabled={disabled}
                      onChange={(event) =>
                        updateLight(light.id, {
                          intensity: Number(event.target.value) / 100,
                        })
                      }
                    />
                  </label>
                  <div className="tadeon-visibility__switch is-compact">
                    <span>
                      <strong>Sombras arquitetônicas</strong>
                      <small>paredes e portas recortam esta luz</small>
                    </span>
                    <Switch
                      checked={light.castsShadows}
                      disabled={disabled}
                      onCheckedChange={(castsShadows) =>
                        updateLight(light.id, { castsShadows })
                      }
                      aria-label={`Sombras da luz ${index + 1}`}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {levelFogStrokes.length > 0 && (
            <div className="tadeon-visibility__group">
              <header>
                <CloudFog aria-hidden="true" />
                <strong>Operações de névoa</strong>
                <span>{levelFogStrokes.length}</span>
              </header>
              <div className="tadeon-visibility__fog-list">
                {levelFogStrokes.map((stroke, index) => (
                  <div key={stroke.id} className="tadeon-visibility__fog-item">
                    <header>
                      {stroke.operation === "reveal" ? (
                        <Eye aria-hidden="true" />
                      ) : (
                        <EyeOff aria-hidden="true" />
                      )}
                      <span>
                        {stroke.operation === "reveal" ? "Revelar" : "Ocultar"}{" "}
                        {index + 1}
                      </span>
                      <small>{stroke.points.length} ponto(s)</small>
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label="Excluir operação de névoa"
                        onClick={() =>
                          update({
                            fogStrokes: state.fogStrokes
                              .filter((item) => item.id !== stroke.id)
                              .map((item, sequenceIndex) => ({
                                ...item,
                                sequenceIndex,
                              })),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </header>
                    <div className="tadeon-visibility__coordinates is-light">
                      <NumberField
                        label="Centro X"
                        value={stroke.points[0]?.x ?? 0}
                        disabled={disabled}
                        onChange={(x) =>
                          updateFog(stroke.id, {
                            points: stroke.points.map((point, pointIndex) =>
                              pointIndex === 0 ? { ...point, x } : point,
                            ),
                          })
                        }
                      />
                      <NumberField
                        label="Centro Y"
                        value={stroke.points[0]?.y ?? 0}
                        disabled={disabled}
                        onChange={(y) =>
                          updateFog(stroke.id, {
                            points: stroke.points.map((point, pointIndex) =>
                              pointIndex === 0 ? { ...point, y } : point,
                            ),
                          })
                        }
                      />
                      <NumberField
                        label="Raio"
                        value={stroke.radius}
                        disabled={disabled}
                        onChange={(radius) => updateFog(stroke.id, { radius })}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="tadeon-visibility__reset"
                disabled={disabled}
                onClick={coverLevel}
              >
                <RotateCcw aria-hidden="true" /> Reiniciar exploração deste
                andar
              </button>
            </div>
          )}

          <div className="tadeon-visibility__footer">
            <p>
              {dirty
                ? "Prévia local — salve para transmitir."
                : `Versão de visão ${state.version}`}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={disabled || !dirty}
              onClick={() => void save()}
            >
              {saving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              Salvar visão
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
