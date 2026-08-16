import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Circle,
  Eye,
  EyeOff,
  Hexagon,
  Paintbrush,
  Shield,
  Square,
  UserRound,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { setTabletopFogAudience } from "@/lib/tabletop/tabletop-fog-audience-runtime";
import type {
  TabletopFogAudience,
  TabletopFogShape,
} from "@/lib/tabletop/tabletop-visibility-service";
import type { Point, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-world-systems.css";

const database = supabase as unknown as SupabaseClient;

type PracticalFogShape = Extract<
  TabletopFogShape,
  "rectangle" | "ellipse" | "brush" | "polygon"
>;
type FogOperation = "reveal" | "hide";
type AudiencePreset = "global" | "players" | "masters" | "observers";
type AudienceChoice = AudiencePreset | `user:${string}`;

interface FogParticipant {
  userId: string;
  name: string;
  role: string;
}

const SHAPES: Array<{
  id: PracticalFogShape;
  label: string;
  description: string;
  icon: typeof Square;
}> = [
  { id: "rectangle", label: "Área", description: "arraste dois cantos", icon: Square },
  { id: "ellipse", label: "Elipse", description: "arraste o diâmetro", icon: Circle },
  {
    id: "polygon",
    label: "Polígono",
    description: "clique os vértices; Enter fecha",
    icon: Hexagon,
  },
  { id: "brush", label: "Pincel", description: "traço livre", icon: Paintbrush },
];

const AUDIENCES: Array<{
  id: AudiencePreset;
  label: string;
  icon: typeof UsersRound;
}> = [
  { id: "global", label: "Todos", icon: UsersRound },
  { id: "players", label: "Jogadores", icon: UserRound },
  { id: "masters", label: "Mestres", icon: Shield },
  { id: "observers", label: "Observadores", icon: Eye },
];

function fogOperationsHost() {
  return document.querySelector<HTMLElement>(".tadeon-visibility__fog-operations");
}

function audienceValue(choice: AudienceChoice): TabletopFogAudience {
  if (choice.startsWith("user:")) {
    const userId = choice.slice("user:".length);
    return userId ? { scope: "users", userIds: [userId] } : { scope: "global" };
  }
  if (choice === "players") return { scope: "roles", roles: ["player"] };
  if (choice === "masters") return { scope: "roles", roles: ["master", "co_master"] };
  if (choice === "observers") return { scope: "roles", roles: ["observer"] };
  return { scope: "global" };
}

function closePoint(points: Point[], point: Point) {
  const previous = points.at(-1);
  if (!previous) return false;
  return Math.hypot(previous.x - point.x, previous.y - point.y) < 2;
}

type CommitVisibilityTool = {
  options?: {
    onCommitVisibilityTool?: (tool: {
      kind: "fog_reveal" | "fog_hide";
      shape: TabletopFogShape;
      points: Point[];
      radius: number;
    }) => void;
  };
};

export function TabletopFogGeometryBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [sceneId, setSceneId] = useState("");
  const [members, setMembers] = useState<FogParticipant[]>([]);
  const [shape, setShape] = useState<PracticalFogShape>("rectangle");
  const [audience, setAudience] = useState<AudienceChoice>("global");
  const [polygonOperation, setPolygonOperation] = useState<FogOperation | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [polygonHover, setPolygonHover] = useState<Point | null>(null);

  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      frame = 0;
      setHost((current) => {
        const next = fogOperationsHost();
        return next === current ? current : next;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(refresh);
    };
    refresh();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const refreshScene = (snapshot?: TabletopSnapshot | null) => {
      const next = snapshot ?? currentTabletopRuntime()?.snapshot() ?? null;
      setSceneId(next?.scene.id && next.scene.id !== "local-scene" ? next.scene.id : "");
    };
    refreshScene();
    const onRender = (event: Event) =>
      refreshScene((event as CustomEvent<TabletopSnapshot>).detail);
    window.addEventListener("tadeon-tabletop-render", onRender);
    return () => window.removeEventListener("tadeon-tabletop-render", onRender);
  }, []);

  useEffect(() => {
    if (!sceneId) {
      setMembers([]);
      return;
    }
    let active = true;
    void (async () => {
      const { data: scene } = await database
        .from("tabletop_scenes")
        .select("campaign_id")
        .eq("id", sceneId)
        .maybeSingle();
      if (!scene?.campaign_id) {
        if (active) setMembers([]);
        return;
      }
      const { data: memberships } = await database
        .from("campaign_members")
        .select("user_id,role")
        .eq("campaign_id", scene.campaign_id);
      const userIds = [...new Set((memberships ?? []).map((entry) => String(entry.user_id)))];
      if (!userIds.length) {
        if (active) setMembers([]);
        return;
      }
      const { data: profiles } = await database
        .from("profiles")
        .select("id,full_name,email")
        .in("id", userIds);
      if (!active) return;
      const names = new Map(
        (profiles ?? []).map((profile) => [
          String(profile.id),
          String(profile.full_name || profile.email || "Participante"),
        ]),
      );
      setMembers(
        (memberships ?? [])
          .map((entry) => ({
            userId: String(entry.user_id),
            role: String(entry.role),
            name: names.get(String(entry.user_id)) ?? "Participante",
          }))
          .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
      );
    })();
    return () => {
      active = false;
    };
  }, [sceneId]);

  useEffect(() => {
    setTabletopFogAudience(audienceValue(audience));
  }, [audience]);

  const finishPolygon = useCallback(() => {
    if (!polygonOperation || polygonPoints.length < 3) return;
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const engine = runtime.engine as unknown as CommitVisibilityTool;
    setTabletopFogAudience(audienceValue(audience));
    engine.options?.onCommitVisibilityTool?.({
      kind: polygonOperation === "reveal" ? "fog_reveal" : "fog_hide",
      shape: "polygon",
      points: polygonPoints.slice(0, 64),
      radius: 160,
    });
    setPolygonOperation(null);
    setPolygonPoints([]);
    setPolygonHover(null);
    runtime.engine.setToolMode("select");
  }, [audience, polygonOperation, polygonPoints]);

  useEffect(() => {
    if (!polygonOperation) return;
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const canvas = runtime.host.querySelector("canvas");
    if (!canvas) return;

    const stop = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      stop(event);
      const world = runtime.clientToWorld({ x: event.clientX, y: event.clientY });
      setPolygonPoints((current) =>
        closePoint(current, world) || current.length >= 64 ? current : [...current, world],
      );
      setPolygonHover(world);
    };
    const onPointerMove = (event: PointerEvent) => {
      stop(event);
      setPolygonHover(runtime.clientToWorld({ x: event.clientX, y: event.clientY }));
    };
    const onDoubleClick = (event: MouseEvent) => {
      stop(event);
      finishPolygon();
    };
    const onContextMenu = (event: MouseEvent) => stop(event);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishPolygon();
      } else if (event.key === "Escape") {
        event.preventDefault();
        setPolygonOperation(null);
        setPolygonPoints([]);
        setPolygonHover(null);
        runtime.engine.setToolMode("select");
      } else if ((event.key === "Backspace" || event.key === "Delete") && polygonPoints.length) {
        event.preventDefault();
        setPolygonPoints((current) => current.slice(0, -1));
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown, true);
    canvas.addEventListener("pointermove", onPointerMove, true);
    canvas.addEventListener("dblclick", onDoubleClick, true);
    canvas.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown, true);
      canvas.removeEventListener("pointermove", onPointerMove, true);
      canvas.removeEventListener("dblclick", onDoubleClick, true);
      canvas.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [finishPolygon, polygonOperation, polygonPoints.length]);

  const polygonScreenPoints = useMemo(() => {
    const runtime = currentTabletopRuntime();
    if (!runtime || !polygonOperation) return [];
    return [...polygonPoints, ...(polygonHover ? [polygonHover] : [])].map((point) =>
      runtime.worldToClient(point),
    );
  }, [polygonHover, polygonOperation, polygonPoints]);

  if (!host) return null;

  const activate = (operation: FogOperation) => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    setTabletopFogAudience(audienceValue(audience));
    if (shape === "polygon") {
      runtime.engine.setToolMode("select");
      setPolygonOperation(operation);
      setPolygonPoints([]);
      setPolygonHover(null);
      return;
    }
    setPolygonOperation(null);
    runtime.engine.setFogToolShape(shape);
    runtime.engine.setToolMode(operation === "reveal" ? "fog_reveal" : "fog_hide");
    if (window.innerWidth < 1180) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
  };

  const controls = createPortal(
    <div className="tadeon-fog-geometry-tool" aria-label="Geometria da névoa">
      <div className="tadeon-fog-geometry-tool__shapes" role="radiogroup" aria-label="Forma da região">
        {SHAPES.map(({ id, label, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={shape === id}
            aria-pressed={shape === id}
            title={`${label}: ${description}`}
            onClick={() => {
              setShape(id);
              if (id !== "polygon") {
                setPolygonOperation(null);
                setPolygonPoints([]);
                setPolygonHover(null);
              }
            }}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="tadeon-fog-audience" role="radiogroup" aria-label="Quem recebe esta memória de névoa">
        {AUDIENCES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={audience === id}
            aria-pressed={audience === id}
            onClick={() => setAudience(id)}
            title={`Aplicar a: ${label}`}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {members.length > 0 && (
        <label className="tadeon-fog-audience__person">
          <UserRound aria-hidden="true" />
          <span>Participante específico</span>
          <select
            value={audience.startsWith("user:") ? audience : ""}
            onChange={(event) =>
              setAudience(
                event.target.value
                  ? (`user:${event.target.value}` as AudienceChoice)
                  : "global",
              )
            }
            aria-label="Aplicar névoa a um participante específico"
          >
            <option value="">Nenhum · usar grupo acima</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name} · {member.role}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="tadeon-fog-geometry-tool__operations" aria-label="Operação da névoa">
        <button type="button" onClick={() => activate("reveal")}>
          <Eye aria-hidden="true" />
          Revelar região
        </button>
        <button type="button" onClick={() => activate("hide")}>
          <EyeOff aria-hidden="true" />
          Cobrir região
        </button>
      </div>
      <small>
        {polygonOperation
          ? `Polígono: ${polygonPoints.length} vértice(s) · Enter/duplo clique fecha · Backspace desfaz · Esc cancela.`
          : audience.startsWith("user:")
            ? "Esta operação de névoa ficará registrada apenas para o participante escolhido."
            : "A primeira operação do andar define a base; as seguintes só alteram as regiões desenhadas."}
      </small>
    </div>,
    host,
  );

  const overlay = polygonOperation
    ? createPortal(
        <svg className="tadeon-fog-polygon-preview" aria-hidden="true">
          {polygonScreenPoints.length >= 2 && (
            <polyline
              points={polygonScreenPoints.map((point) => `${point.x},${point.y}`).join(" ")}
            />
          )}
          {polygonScreenPoints.slice(0, -1).map((point, index) => (
            <circle key={`${point.x}:${point.y}:${index}`} cx={point.x} cy={point.y} r="4" />
          ))}
        </svg>,
        document.body,
      )
    : null;

  return <>{controls}{overlay}</>;
}
