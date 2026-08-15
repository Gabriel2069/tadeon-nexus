import { useEffect } from "react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";

export function TabletopLocateBridge() {
  useEffect(() => {
    const entityId = new URLSearchParams(window.location.search).get("locate");
    if (!entityId || !/^[0-9a-f-]{36}$/i.test(entityId)) return;
    let done = false;
    let frame = 0;
    let attempts = 0;

    const locate = () => {
      if (done) return;
      const runtime = currentTabletopRuntime();
      const entity = runtime?.snapshot().scene.entities.find((item) => item.id === entityId);
      if (runtime && entity) {
        done = true;
        runtime.engine.selectEntityById(entityId);
        runtime.engine.focusSelection();
        const url = new URL(window.location.href);
        url.searchParams.delete("locate");
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        return;
      }
      if (attempts++ < 120) frame = window.requestAnimationFrame(locate);
    };

    const onRender = () => locate();
    window.addEventListener("tadeon-tabletop-render", onRender);
    locate();
    return () => {
      done = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
    };
  }, []);

  return null;
}
