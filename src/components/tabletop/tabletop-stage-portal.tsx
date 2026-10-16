import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function TabletopStagePortal({
  children,
  selector = "[data-tabletop-stage-portal]",
}: {
  children: ReactNode;
  selector?: string;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncTarget = () => {
      const next = document.querySelector<HTMLElement>(selector);
      setTarget((current) => (current === next ? current : next));
    };
    syncTarget();
    window.addEventListener("tadeon-tabletop-render", syncTarget);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", syncTarget);

    return () => {
      window.removeEventListener("tadeon-tabletop-render", syncTarget);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", syncTarget);
    };
  }, [selector]);

  return target ? createPortal(children, target) : null;
}
