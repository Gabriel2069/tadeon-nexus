import {
  BrickWall,
  Circle,
  CloudFog,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  LampDesk,
  Loader2,
  Moon,
  Paintbrush,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Sunset,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type TabletopFogShape,
  type TabletopFogStroke,
  type TabletopLight,
  type TabletopVisibilityState,
  type TabletopWall,
} from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopLevel } from "@/lib/tabletop/types";
import {
  createLevelRevealStrokes,
  tabletopFogBounds,
} from "@/lib/tabletop/visibility-tooling";
import "@/styles/tabletop-visibility.css";

type VisibilityStudio = "environment" | "architecture" | "lights" | "fog";

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
  selectedFogId: string | null;
  onSelectStructure: (id: string | null) => void;
  onSelectLight: (id: string | null) => void;
  onSelectFog: (id: string | null) => void;
  onActivateFogTool: (
    operation: TabletopFogStroke["operation"],
    shape: TabletopFogShape,
  ) => void;
  onPreview: (state: TabletopVisibilityState) => void;
  onSaved: (state: TabletopVisibilityState, sceneVersion: number) => void;
}

function visibilityErrorMessage(error: unknown) {
  if (!(error instanceof TabletopVisibilityError))
    return "Não foi possível salvar a visão desta cena.";
  if (error.code === "TABLETOP_VISIBILITY_CONFLICT")
    return "A visão mudou em outra sessão. Reabra a cena antes de salvar.";
  if (error.code === "TABLETOP_VISIBILITY_FORBIDDEN")
    return "Seu papel atual não pode alterar a visão desta cena.";
  if (error.code === "TABLETOP_VISIBILITY_DISABLED")
    return "O módulo de iluminação está desligado para sua conta.";
  if (error.code === "TABLETOP_VISIBILITY_INVALID")
    return "Revise os limites das paredes, luzes e regiões de névoa.";
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

const STUDIO_TABS = [
  { id: "environment", label: "Ambiente", icon: SlidersHorizontal },
  { id: "architecture", label: "Arquitetura", icon: BrickWall },
  { id: "lights", label: "Luzes", icon: LampDesk },
  { id: "fog", label: "Névoa", icon: CloudFog },
] as const;

const FOG_SHAPES = [
  { id: "brush", label: "Pincel", icon: Paintbrush },
  { id: "rectangle", label: "Área", icon: Square },
  { id: "ellipse", label: "Elipse", icon: Circle },
] as const;

function NumberField({
  label,
  value,
  disabled,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="tadeon-visibility-field">
      <span>{label}</span>
      <Input
        type="number"
        step="1"
        min={min}
        max={max}
        value={Math.round(value)}
        disabled={disabled}
        onChange={(event) => onChange(numberValue(event.target.value, value))}
      />
    </label>
  );
}

function StudioEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="tadeon-visibility__empty">
      <Icon aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
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
  selectedFogId,
  onSelectStructure,
  onSelectLight,
  onSelectFog,
  onActivateFogTool,
  onPreview,
  onSaved,
}: TabletopVisibilityPanelProps) {
  const [studio, setStudio] = useState<VisibilityStudio>("environment");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedStructureId) setStudio("architecture");
  }, [selectedStructureId]);
  useEffect(() => {
    if (selectedLightId) setStudio("lights");
  }, [selectedLightId]);
  useEffect(() => {
    if (selectedFogId) setStudio("fog");
  }, [selectedFogId]);

  if (!enabled) return null;

  const disabled = !editable || !sceneId || saving;
  const fallbackLevelId = levels[0]?.id ?? "";
  const currentLevelId = activeLevelId ?? fallbackLevelId;
  const currentLevel = levels.find((level) => level.id === currentLevelId);
  const levelWalls = state.walls.filter(
    (wall) => (wall.levelId || fallbackLevelId) === currentLevelId,
  );
  const levelLights = state.lights.filter(
    (light) => (light.levelId || fallbackLevelId) === currentLevelId,
  );
  const levelFogStrokes = state.fogStrokes.filter(
    (stroke) => (stroke.levelId || fallbackLevelId) === currentLevelId,
  );
  const selectedWall =
    levelWalls.find((wall) => wall.id === selectedStructureId) ?? null;
  const selectedLight =
    levelLights.find((light) => light.id === selectedLightId) ?? null;
  const selectedFog =
    levelFogStrokes.find((stroke) => stroke.id === selectedFogId) ?? null;

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

  const removeWall = (id: string) => {
    update({ walls: state.walls.filter((wall) => wall.id !== id) });
    if (id === selectedStructureId) onSelectStructure(null);
  };
  const duplicateWall = (wall: TabletopWall) => {
    const copy = {
      ...wall,
      id: crypto.randomUUID(),
      x1: wall.x1 + 24,
      y1: wall.y1 + 24,
      x2: wall.x2 + 24,
      y2: wall.y2 + 24,
    };
    update({ walls: [...state.walls, copy] });
    onSelectStructure(copy.id);
  };
  const removeLight = (id: string) => {
    update({ lights: state.lights.filter((light) => light.id !== id) });
    if (id === selectedLightId) onSelectLight(null);
  };
  const duplicateLight = (light: TabletopLight) => {
    const copy: TabletopLight = {
      ...light,
      id: crypto.randomUUID(),
      entityId: null,
      x: light.x + 24,
      y: light.y + 24,
      visibilityPolygon: undefined,
    };
    update({ lights: [...state.lights, copy] });
    onSelectLight(copy.id);
  };
  const removeFog = (id: string) => {
    update({
      fogStrokes: state.fogStrokes
        .filter((stroke) => stroke.id !== id)
        .map((stroke, sequenceIndex) => ({ ...stroke, sequenceIndex })),
    });
    if (id === selectedFogId) onSelectFog(null);
  };
  const duplicateFog = (stroke: TabletopFogStroke) => {
    const copy: TabletopFogStroke = {
      ...stroke,
      id: crypto.randomUUID(),
      points: stroke.points.map((point) => ({
        x: point.x + 24,
        y: point.y + 24,
      })),
      sequenceIndex: state.fogStrokes.length,
    };
    update({ fogStrokes: [...state.fogStrokes, copy] });
    onSelectFog(copy.id);
  };

  const moveFogStroke = (id: string, axis: "x" | "y", nextValue: number) =>
    update({
      fogStrokes: state.fogStrokes.map((stroke) => {
        if (stroke.id !== id || stroke.points.length === 0) return stroke;
        const anchor = stroke.points[0];
        const limit = axis === "x" ? sceneWidth : sceneHeight;
        const target = Math.max(0, Math.min(limit, nextValue));
        const delta = target - anchor[axis];
        return {
          ...stroke,
          points: stroke.points.map((point) => ({
            ...point,
            [axis]: point[axis] + delta,
          })),
        };
      }),
    });

  const resizeFog = (
    stroke: TabletopFogStroke,
    axis: "width" | "height",
    value: number,
  ) => {
    const first = stroke.points[0];
    const last = stroke.points.at(-1);
    if (!first || !last) return;
    const sign =
      axis === "width"
        ? Math.sign(last.x - first.x) || 1
        : Math.sign(last.y - first.y) || 1;
    const next = { ...last };
    if (axis === "width") next.x = first.x + sign * Math.max(8, value);
    else next.y = first.y + sign * Math.max(8, value);
    updateFog(stroke.id, {
      points: stroke.points.map((point, index) =>
        index === stroke.points.length - 1 ? next : point,
      ),
    });
  };

  const convertFogShape = (
    stroke: TabletopFogStroke,
    shape: TabletopFogShape,
  ) => {
    if (shape === stroke.shape) return;
    const bounds = tabletopFogBounds(stroke);
    if (shape === "brush") {
      updateFog(stroke.id, {
        shape,
        radius: Math.max(
          8,
          Math.min(1024, Math.max(bounds.width, bounds.height) / 2),
        ),
        points: [
          {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          },
        ],
      });
      return;
    }
    updateFog(stroke.id, {
      shape,
      points: [
        { x: bounds.x, y: bounds.y },
        {
          x: bounds.x + Math.max(16, bounds.width),
          y: bounds.y + Math.max(16, bounds.height),
        },
      ],
    });
  };

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
    const spatialStructure: TabletopWall = {
      ...structure,
      levelId: currentLevelId,
      baseElevation: 0,
      height:
        structureFamily(wallType) === "roof"
          ? (currentLevel?.height ?? 192)
          : Math.max(42, (currentLevel?.height ?? 192) * 0.62),
      thickness: 8,
      playerOperable: false,
      version: 1,
    };
    update({ walls: [...state.walls, spatialStructure] });
    onSelectStructure(spatialStructure.id);
  };

  const addLight = (
    preset: (typeof LIGHT_PRESETS)[number] = LIGHT_PRESETS[2],
  ) => {
    const light: TabletopLight = {
      id: crypto.randomUUID(),
      levelId: currentLevelId,
      entityId: null,
      x: sceneWidth / 2,
      y: sceneHeight / 2,
      elevation: 0,
      radius: Math.max(80, Math.min(sceneWidth, sceneHeight) * preset.radius),
      intensity: preset.intensity,
      color: preset.color,
      enabled: true,
      castsShadows: true,
    };
    update({ lights: [...state.lights, light] });
    onSelectLight(light.id);
  };

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
  const coverLevel = () => {
    replaceLevelFog([]);
    onSelectFog(null);
  };
  const revealLevel = () => {
    replaceLevelFog(
      createLevelRevealStrokes({
        levelId: currentLevelId,
        sceneWidth,
        sceneHeight,
      }),
    );
    onSelectFog(null);
  };

  const addFogRegion = (
    operation: TabletopFogStroke["operation"],
    shape: TabletopFogShape,
  ) => {
    const size = Math.max(120, Math.min(sceneWidth, sceneHeight) * 0.16);
    const stroke: TabletopFogStroke = {
      id: crypto.randomUUID(),
      levelId: currentLevelId,
      operation,
      shape,
      points:
        shape === "brush"
          ? [{ x: sceneWidth / 2, y: sceneHeight / 2 }]
          : [
              { x: sceneWidth / 2 - size, y: sceneHeight / 2 - size * 0.65 },
              { x: sceneWidth / 2 + size, y: sceneHeight / 2 + size * 0.65 },
            ],
      radius: Math.max(64, Math.min(240, size * 0.65)),
      sequenceIndex: state.fogStrokes.length,
    };
    update({ fogEnabled: true, fogStrokes: [...state.fogStrokes, stroke] });
    onSelectFog(stroke.id);
  };

  const save = async () => {
    if (!sceneId) return;
    setSaving(true);
    try {
      const saved = await tabletopVisibilityService.save(sceneId, state);
      onSaved(saved.visibility, saved.sceneVersion);
      toast.success("Ambiente, arquitetura, luzes e névoa salvos.");
    } catch (error) {
      toast.error(visibilityErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    architecture: levelWalls.length,
    lights: levelLights.length,
    fog: levelFogStrokes.length,
  };

  return (
    <section className="tadeon-visibility" aria-label="Estúdio de ambiente">
      <header className="tadeon-visibility__command-head">
        <span className="tadeon-visibility__mark">
          <CloudFog aria-hidden="true" />
        </span>
        <span>
          <strong>Estúdio de ambiente</strong>
          <small>{currentLevel?.name ?? "Andar base"} · edição no mapa</small>
        </span>
        {dirty && <span className="tadeon-visibility__dirty">não salvo</span>}
      </header>

      <nav
        className="tadeon-visibility__studios"
        role="tablist"
        aria-label="Áreas do ambiente"
      >
        {STUDIO_TABS.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.id === "architecture"
              ? counts.architecture
              : tab.id === "lights"
                ? counts.lights
                : tab.id === "fog"
                  ? counts.fog
                  : null;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={studio === tab.id}
              onClick={() => setStudio(tab.id)}
            >
              <Icon aria-hidden="true" />
              <span>{tab.label}</span>
              {count !== null && <small>{count}</small>}
            </button>
          );
        })}
      </nav>

      <div className="tadeon-visibility__body">
        {studio === "environment" && (
          <div className="tadeon-visibility__studio" role="tabpanel">
            <div className="tadeon-visibility__studio-intro">
              <span>
                <Sparkles aria-hidden="true" />
              </span>
              <div>
                <strong>Atmosfera da cena</strong>
                <p>
                  Defina a luz base. Fontes locais e névoa refinam o resultado
                  por cima.
                </p>
              </div>
            </div>
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
                      onClick={() =>
                        update({ globalIllumination: preset.value })
                      }
                    >
                      <Icon aria-hidden="true" />
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="tadeon-visibility__switch is-feature">
              <div>
                <strong>Névoa de guerra</strong>
                <small>oculta áreas ainda não exploradas</small>
              </div>
              <Switch
                checked={state.fogEnabled}
                disabled={disabled}
                onCheckedChange={(fogEnabled) => update({ fogEnabled })}
                aria-label="Ativar névoa de guerra"
              />
            </div>
            <label className="tadeon-visibility__intensity">
              <span>Opacidade da névoa</span>
              <output>{Math.round(state.fogOpacity * 100)}%</output>
              <input
                type="range"
                min="35"
                max="100"
                value={Math.round(state.fogOpacity * 100)}
                disabled={disabled || !state.fogEnabled}
                onChange={(event) =>
                  update({ fogOpacity: Number(event.target.value) / 100 })
                }
              />
            </label>
            <div className="tadeon-visibility__health-grid">
              <article>
                <BrickWall aria-hidden="true" />
                <strong>{levelWalls.length}</strong>
                <span>estruturas</span>
              </article>
              <article>
                <LampDesk aria-hidden="true" />
                <strong>
                  {levelLights.filter((light) => light.enabled).length}
                </strong>
                <span>luzes ativas</span>
              </article>
              <article>
                <CloudFog aria-hidden="true" />
                <strong>{levelFogStrokes.length}</strong>
                <span>regiões</span>
              </article>
            </div>
          </div>
        )}

        {studio === "architecture" && (
          <div className="tadeon-visibility__studio" role="tabpanel">
            <div className="tadeon-visibility__creation-deck">
              <header>
                <Crosshair aria-hidden="true" />
                <span>
                  <strong>Construir no centro</strong>
                  <small>ou pressione B e desenhe diretamente no mapa</small>
                </span>
              </header>
              <div className="tadeon-visibility__creation-grid">
                {(
                  [
                    ["wall", "Parede"],
                    ["door_closed", "Porta"],
                    ["window_closed", "Janela"],
                    ["roof_visible", "Telhado"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    disabled={disabled}
                    onClick={() => addWall(type)}
                  >
                    <Plus aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="tadeon-visibility__object-list">
              {levelWalls.map((wall, index) => (
                <button
                  key={wall.id}
                  type="button"
                  className="tadeon-visibility__object-row"
                  data-selected={wall.id === selectedStructureId}
                  aria-pressed={wall.id === selectedStructureId}
                  onClick={() => onSelectStructure(wall.id)}
                >
                  <span data-family={structureFamily(wall.wallType)}>
                    <BrickWall aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{structureStateLabel(wall.wallType)}</strong>
                    <small>
                      Estrutura {index + 1} · {Math.round(wall.height ?? 64)}u
                    </small>
                  </span>
                  <Crosshair aria-hidden="true" />
                </button>
              ))}
            </div>
            {levelWalls.length === 0 && (
              <StudioEmpty
                icon={BrickWall}
                title="Nenhuma arquitetura neste andar"
                description="Desenhe paredes, portas, janelas e telhados diretamente sobre o mapa."
              />
            )}
            {selectedWall && (
              <article className="tadeon-visibility__inspector">
                <header>
                  <span>
                    <BrickWall aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {structureStateLabel(selectedWall.wallType)}
                    </strong>
                    <small>arraste corpo e vértices no mapa</small>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => duplicateWall(selectedWall)}
                    aria-label="Duplicar estrutura"
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => removeWall(selectedWall.id)}
                    aria-label="Excluir estrutura"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </header>
                <label className="tadeon-visibility__select-field">
                  <span>Família</span>
                  <select
                    value={structureFamily(selectedWall.wallType)}
                    disabled={disabled}
                    onChange={(event) => {
                      const types = {
                        wall: "wall",
                        door: "door_closed",
                        window: "window_closed",
                        roof: "roof_visible",
                      } as const;
                      setWallType(
                        selectedWall.id,
                        types[event.target.value as keyof typeof types],
                      );
                    }}
                  >
                    <option value="wall">Parede</option>
                    <option value="door">Porta</option>
                    <option value="window">Janela</option>
                    <option value="roof">Telhado</option>
                  </select>
                </label>
                {structureFamily(selectedWall.wallType) !== "wall" && (
                  <div className="tadeon-visibility__states">
                    {structureStateOptions(
                      structureFamily(selectedWall.wallType),
                    ).map((stateType) => (
                      <button
                        key={stateType}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selectedWall.wallType === stateType}
                        onClick={() => setWallType(selectedWall.id, stateType)}
                      >
                        {structureStateLabel(stateType).replace(
                          /^(Porta|Janela|Telhado) /,
                          "",
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="tadeon-visibility__coordinates">
                  <NumberField
                    label="X1"
                    value={selectedWall.x1}
                    disabled={disabled}
                    onChange={(x1) => updateWall(selectedWall.id, { x1 })}
                  />
                  <NumberField
                    label="Y1"
                    value={selectedWall.y1}
                    disabled={disabled}
                    onChange={(y1) => updateWall(selectedWall.id, { y1 })}
                  />
                  <NumberField
                    label="X2"
                    value={selectedWall.x2}
                    disabled={disabled}
                    onChange={(x2) => updateWall(selectedWall.id, { x2 })}
                  />
                  <NumberField
                    label="Y2"
                    value={selectedWall.y2}
                    disabled={disabled}
                    onChange={(y2) => updateWall(selectedWall.id, { y2 })}
                  />
                  <NumberField
                    label="Base Z"
                    value={selectedWall.baseElevation ?? 0}
                    disabled={disabled}
                    onChange={(baseElevation) =>
                      updateWall(selectedWall.id, { baseElevation })
                    }
                  />
                  <NumberField
                    label="Altura"
                    min={8}
                    value={selectedWall.height ?? 64}
                    disabled={disabled}
                    onChange={(height) =>
                      updateWall(selectedWall.id, {
                        height: Math.max(8, height),
                      })
                    }
                  />
                  <NumberField
                    label="Espessura"
                    min={1}
                    value={selectedWall.thickness ?? 8}
                    disabled={disabled}
                    onChange={(thickness) =>
                      updateWall(selectedWall.id, {
                        thickness: Math.max(1, thickness),
                      })
                    }
                  />
                </div>
                {structureFamily(selectedWall.wallType) === "roof" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={disabled}
                    onClick={() =>
                      updateWall(selectedWall.id, {
                        baseElevation: 0,
                        height: Math.max(8, currentLevel?.height ?? 192),
                      })
                    }
                  >
                    <Sparkles aria-hidden="true" />
                    Encaixar ao andar automaticamente
                  </Button>
                ) : (
                  <div className="tadeon-visibility__checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedWall.blocksVision}
                        disabled={disabled}
                        onChange={(event) =>
                          updateWall(selectedWall.id, {
                            blocksVision: event.target.checked,
                          })
                        }
                      />
                      bloqueia visão
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedWall.blocksMovement}
                        disabled={disabled}
                        onChange={(event) =>
                          updateWall(selectedWall.id, {
                            blocksMovement: event.target.checked,
                          })
                        }
                      />
                      bloqueia movimento
                    </label>
                  </div>
                )}
                {structureFamily(selectedWall.wallType) === "door" && (
                  <div className="tadeon-visibility__switch is-compact">
                    <span>
                      <strong>Jogadores podem acionar</strong>
                      <small>portas trancadas permanecem exclusivas</small>
                    </span>
                    <Switch
                      checked={selectedWall.playerOperable ?? false}
                      disabled={
                        disabled || selectedWall.wallType === "door_locked"
                      }
                      onCheckedChange={(playerOperable) =>
                        updateWall(selectedWall.id, { playerOperable })
                      }
                    />
                  </div>
                )}
              </article>
            )}
          </div>
        )}

        {studio === "lights" && (
          <div className="tadeon-visibility__studio" role="tabpanel">
            <div className="tadeon-visibility__creation-deck">
              <header>
                <Sparkles aria-hidden="true" />
                <span>
                  <strong>Fontes rápidas</strong>
                  <small>crie e ajuste o alcance diretamente no mapa</small>
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
            <div className="tadeon-visibility__object-list">
              {levelLights.map((light, index) => (
                <button
                  key={light.id}
                  type="button"
                  className="tadeon-visibility__object-row"
                  data-selected={light.id === selectedLightId}
                  aria-pressed={light.id === selectedLightId}
                  onClick={() => onSelectLight(light.id)}
                >
                  <span
                    className="is-light"
                    style={{ "--light-color": light.color } as CSSProperties}
                  >
                    <LampDesk aria-hidden="true" />
                  </span>
                  <span>
                    <strong>Luz {index + 1}</strong>
                    <small>
                      {Math.round(light.radius)}px ·{" "}
                      {Math.round(light.intensity * 100)}% ·{" "}
                      {light.enabled ? "acesa" : "apagada"}
                    </small>
                  </span>
                  <Crosshair aria-hidden="true" />
                </button>
              ))}
            </div>
            {levelLights.length === 0 && (
              <StudioEmpty
                icon={LampDesk}
                title="Nenhuma luz neste andar"
                description="Use um preset ou pressione L e arraste o alcance sobre o mapa."
              />
            )}
            {selectedLight && (
              <article className="tadeon-visibility__inspector">
                <header>
                  <span
                    className="is-light"
                    style={
                      {
                        "--light-color": selectedLight.color,
                      } as CSSProperties
                    }
                  >
                    <LampDesk aria-hidden="true" />
                  </span>
                  <div>
                    <strong>Fonte de luz</strong>
                    <small>arraste o núcleo ou a alça do alcance</small>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => duplicateLight(selectedLight)}
                    aria-label="Duplicar luz"
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => removeLight(selectedLight.id)}
                    aria-label="Excluir luz"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </header>
                <div className="tadeon-visibility__light-command">
                  <label>
                    <span>Cor</span>
                    <input
                      type="color"
                      value={selectedLight.color}
                      disabled={disabled}
                      onChange={(event) =>
                        updateLight(selectedLight.id, {
                          color: event.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="tadeon-visibility__switch is-compact">
                    <span>
                      <strong>Fonte ativa</strong>
                      <small>mantém a configuração ao apagar</small>
                    </span>
                    <Switch
                      checked={selectedLight.enabled}
                      disabled={disabled}
                      onCheckedChange={(enabled) =>
                        updateLight(selectedLight.id, { enabled })
                      }
                    />
                  </div>
                </div>
                <div className="tadeon-visibility__coordinates">
                  <NumberField
                    label="X"
                    value={selectedLight.x}
                    disabled={disabled}
                    onChange={(x) => updateLight(selectedLight.id, { x })}
                  />
                  <NumberField
                    label="Y"
                    value={selectedLight.y}
                    disabled={disabled}
                    onChange={(y) => updateLight(selectedLight.id, { y })}
                  />
                  <NumberField
                    label="Raio"
                    min={8}
                    value={selectedLight.radius}
                    disabled={disabled}
                    onChange={(radius) =>
                      updateLight(selectedLight.id, {
                        radius: Math.max(8, radius),
                      })
                    }
                  />
                  <NumberField
                    label="Elevação"
                    value={selectedLight.elevation ?? 0}
                    disabled={disabled}
                    onChange={(elevation) =>
                      updateLight(selectedLight.id, { elevation })
                    }
                  />
                </div>
                <label className="tadeon-visibility__intensity">
                  <span>Intensidade</span>
                  <output>{Math.round(selectedLight.intensity * 100)}%</output>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(selectedLight.intensity * 100)}
                    disabled={disabled}
                    onChange={(event) =>
                      updateLight(selectedLight.id, {
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
                    checked={selectedLight.castsShadows}
                    disabled={disabled}
                    onCheckedChange={(castsShadows) =>
                      updateLight(selectedLight.id, { castsShadows })
                    }
                  />
                </div>
                <div className="tadeon-visibility__quick-grid">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      updateLight(selectedLight.id, {
                        x: sceneWidth / 2,
                        y: sceneHeight / 2,
                      })
                    }
                  >
                    Centralizar
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      updateLight(selectedLight.id, { elevation: 0 })
                    }
                  >
                    Luz baixa
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      updateLight(selectedLight.id, {
                        elevation: Math.max(
                          8,
                          (currentLevel?.height ?? 192) * 0.72,
                        ),
                      })
                    }
                  >
                    Luz alta
                  </button>
                </div>
              </article>
            )}
          </div>
        )}

        {studio === "fog" && (
          <div className="tadeon-visibility__studio" role="tabpanel">
            <div className="tadeon-visibility__fog-command">
              <header>
                <CloudFog aria-hidden="true" />
                <span>
                  <strong>Controle espacial de névoa</strong>
                  <small>
                    desenhe e depois selecione para mover ou dimensionar
                  </small>
                </span>
              </header>
              <div className="tadeon-visibility__fog-operations">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => onActivateFogTool("reveal", "brush")}
                >
                  <Eye aria-hidden="true" />
                  Revelar no mapa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onActivateFogTool("hide", "brush")}
                >
                  <EyeOff aria-hidden="true" />
                  Cobrir no mapa
                </Button>
              </div>
              <div
                className="tadeon-visibility__shape-grid"
                aria-label="Criar região no centro"
              >
                {FOG_SHAPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled}
                    onClick={() => addFogRegion("reveal", id)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                    <small>criar</small>
                  </button>
                ))}
              </div>
              <div className="tadeon-visibility__fog-shortcuts">
                <button type="button" disabled={disabled} onClick={coverLevel}>
                  <EyeOff aria-hidden="true" /> Cobrir andar
                </button>
                <button type="button" disabled={disabled} onClick={revealLevel}>
                  <Eye aria-hidden="true" /> Revelar andar
                </button>
              </div>
            </div>
            <div className="tadeon-visibility__object-list">
              {levelFogStrokes.map((stroke, index) => (
                <button
                  key={stroke.id}
                  type="button"
                  className="tadeon-visibility__object-row"
                  data-selected={stroke.id === selectedFogId}
                  data-operation={stroke.operation}
                  aria-pressed={stroke.id === selectedFogId}
                  onClick={() => onSelectFog(stroke.id)}
                >
                  <span>
                    {stroke.shape === "brush" ? (
                      <Paintbrush aria-hidden="true" />
                    ) : stroke.shape === "rectangle" ? (
                      <Square aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <strong>
                      {stroke.operation === "reveal" ? "Revelar" : "Cobrir"} ·{" "}
                      {index + 1}
                    </strong>
                    <small>
                      {stroke.shape === "brush"
                        ? `${stroke.points.length} ponto(s) · ${Math.round(
                            stroke.radius,
                          )}px`
                        : stroke.shape === "rectangle"
                          ? "região retangular"
                          : stroke.shape === "ellipse"
                            ? "região elíptica"
                            : "região poligonal"}
                    </small>
                  </span>
                  <Crosshair aria-hidden="true" />
                </button>
              ))}
            </div>
            {levelFogStrokes.length === 0 && (
              <StudioEmpty
                icon={CloudFog}
                title="Andar totalmente coberto"
                description="Revele com pincel, retângulo ou elipse. Cada região continuará editável."
              />
            )}
            {selectedFog && (
              <article className="tadeon-visibility__inspector">
                <header>
                  <span data-operation={selectedFog.operation}>
                    <CloudFog aria-hidden="true" />
                  </span>
                  <div>
                    <strong>
                      {selectedFog.operation === "reveal"
                        ? "Região revelada"
                        : "Região coberta"}
                    </strong>
                    <small>arraste corpo e alça diretamente no mapa</small>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => duplicateFog(selectedFog)}
                    aria-label="Duplicar região de névoa"
                  >
                    <Copy aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => removeFog(selectedFog.id)}
                    aria-label="Excluir região de névoa"
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </header>
                <div
                  className="tadeon-visibility__states"
                  aria-label="Operação da região"
                >
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selectedFog.operation === "reveal"}
                    onClick={() =>
                      updateFog(selectedFog.id, { operation: "reveal" })
                    }
                  >
                    Revelar
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selectedFog.operation === "hide"}
                    onClick={() =>
                      updateFog(selectedFog.id, { operation: "hide" })
                    }
                  >
                    Cobrir
                  </button>
                </div>
                <div
                  className="tadeon-visibility__shape-grid is-editor"
                  role="radiogroup"
                  aria-label="Geometria da região"
                >
                  {FOG_SHAPES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      disabled={disabled}
                      aria-checked={selectedFog.shape === id}
                      onClick={() => convertFogShape(selectedFog, id)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="tadeon-visibility__coordinates">
                  <NumberField
                    label="Âncora X"
                    value={selectedFog.points[0]?.x ?? 0}
                    disabled={disabled}
                    onChange={(x) => moveFogStroke(selectedFog.id, "x", x)}
                  />
                  <NumberField
                    label="Âncora Y"
                    value={selectedFog.points[0]?.y ?? 0}
                    disabled={disabled}
                    onChange={(y) => moveFogStroke(selectedFog.id, "y", y)}
                  />
                  {selectedFog.shape === "brush" ? (
                    <NumberField
                      label="Raio"
                      min={8}
                      max={1024}
                      value={selectedFog.radius}
                      disabled={disabled}
                      onChange={(radius) =>
                        updateFog(selectedFog.id, {
                          radius: Math.max(8, Math.min(1024, radius)),
                        })
                      }
                    />
                  ) : (
                    <>
                      <NumberField
                        label="Largura"
                        min={8}
                        value={tabletopFogBounds(selectedFog).width}
                        disabled={disabled}
                        onChange={(width) =>
                          resizeFog(selectedFog, "width", width)
                        }
                      />
                      <NumberField
                        label="Altura"
                        min={8}
                        value={tabletopFogBounds(selectedFog).height}
                        disabled={disabled}
                        onChange={(height) =>
                          resizeFog(selectedFog, "height", height)
                        }
                      />
                    </>
                  )}
                </div>
                <div className="tadeon-visibility__tip">
                  <Crosshair aria-hidden="true" />
                  <span>
                    <strong>Edição direta ativa</strong>
                    <small>
                      arraste para mover · alça clara dimensiona · setas refinam
                    </small>
                  </span>
                </div>
              </article>
            )}
            <button
              type="button"
              className="tadeon-visibility__reset"
              disabled={disabled}
              onClick={coverLevel}
            >
              <RotateCcw aria-hidden="true" />
              Reiniciar exploração deste andar
            </button>
          </div>
        )}
      </div>

      <footer className="tadeon-visibility__footer">
        <p>
          {dirty
            ? "Prévia local pronta para salvar e transmitir."
            : `Visão sincronizada · versão ${state.version}`}
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
          Salvar ambiente
        </Button>
      </footer>
    </section>
  );
}
