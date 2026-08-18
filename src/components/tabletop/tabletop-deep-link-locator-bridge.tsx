import { useEffect } from "react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";

export function TabletopDeepLinkLocatorBridge({ entityId }: { entityId?: string }) {
  useEffect(() => {
    if (!entityId) return;
    let complete = false;
    let attempts = 0;

    const locate = () => {
      if (complete) return true;
      const runtime = currentTabletopRuntime();
      attempts += 1;
      if (!runtime) return false;
      if (!runtime.snapshot().scene.entities.some((entity) => entity.id === entityId)) return false;

      runtime.engine.selectEntityById(entityId);
      runtime.engine.focusSelection();
      complete = true;
      document.documentElement.dataset.tadeonTabletopLocated = entityId;
      window.setTimeout(() => {
        if (document.documentElement.dataset.tadeonTabletopLocated === entityId) {
          delete document.documentElement.dataset.tadeonTabletopLocated;
        }
      }, 1800);
      return true;
    };

    if (locate()) return;
    const onRender = () => {
      if (locate()) window.clearInterval(timer);
    };
    const timer = window.setInterval(() => {
      if (locate() || attempts >= 160) window.clearInterval(timer);
    }, 100);
    window.addEventListener("tadeon-tabletop-render", onRender);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      if (document.documentElement.dataset.tadeonTabletopLocated === entityId) {
        delete document.documentElement.dataset.tadeonTabletopLocated;
      }
    };
  }, [entityId]);

  return null;
}
