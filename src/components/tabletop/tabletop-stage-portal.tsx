import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function TabletopStagePortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const syncTarget = () => {
      const next = document.querySelector<HTMLElement>(
        "[data-tabletop-stage-portal]",
      );
      setTarget((current) => (current === next ? current : next));
    };
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(syncTarget);
    window.addEventListener("tadeon-tabletop-render", syncTarget);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("tadeon-tabletop-render", syncTarget);
    };
  }, []);

  return target ? createPortal(children, target) : null;
}
