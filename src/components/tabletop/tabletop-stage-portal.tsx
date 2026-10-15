import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function TabletopStagePortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncTarget = () => {
      const next = document.querySelector<HTMLElement>("[data-tabletop-stage-portal]");
      setTarget((current) => (current === next ? current : next));
    };
    syncTarget();
    window.addEventListener("tadeon-tabletop-render", syncTarget);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", syncTarget);

    return () => {
      window.removeEventListener("tadeon-tabletop-render", syncTarget);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", syncTarget);
    };
  }, []);

  return target ? createPortal(children, target) : null;
}
