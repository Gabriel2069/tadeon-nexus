import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Circle, Eye, EyeOff, Paintbrush, Square } from "lucide-react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopFogShape } from "@/lib/tabletop/tabletop-visibility-service";

type PracticalFogShape = Extract<TabletopFogShape, "rectangle" | "ellipse" | "brush">;

const SHAPES: Array<{
  id: PracticalFogShape;
  label: string;
  description: string;
  icon: typeof Square;
}> = [
  {
    id: "rectangle",
    label: "Área",
    description: "arraste dois cantos",
    icon: Square,
  },
  {
    id: "ellipse",
    label: "Elipse",
    description: "arraste o diâmetro",
    icon: Circle,
  },
  {
    id: "brush",
    label: "Pincel",
    description: "traço livre",
    icon: Paintbrush,
  },
];

function fogOperationsHost() {
  return document.querySelector<HTMLElement>(".tadeon-visibility__fog-operations");
}

export function TabletopFogGeometryBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [shape, setShape] = useState<PracticalFogShape>("rectangle");

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

  if (!host) return null;

  const activate = (operation: "reveal" | "hide") => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    runtime.engine.setFogToolShape(shape);
    runtime.engine.setToolMode(operation === "reveal" ? "fog_reveal" : "fog_hide");
    if (window.innerWidth < 1180) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    }
  };

  return createPortal(
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
            onClick={() => setShape(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
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
        A primeira operação do andar define a base; as seguintes só alteram as regiões desenhadas.
      </small>
    </div>,
    host,
  );
}
