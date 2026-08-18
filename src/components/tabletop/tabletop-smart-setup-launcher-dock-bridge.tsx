import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WandSparkles } from "lucide-react";

export function TabletopSmartSetupLauncherDockBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/tabletop") return;

    let frame = 0;
    const sync = () => {
      frame = 0;
      const canvas = document.querySelector<HTMLElement>(".tadeon-tabletop-canvas-host");
      const mapSurface = canvas?.parentElement;
      if (!mapSurface) {
        setHost(null);
        document.getElementById("tadeon-smart-setup-launcher-host")?.remove();
        return;
      }

      let portalHost = document.getElementById("tadeon-smart-setup-launcher-host");
      if (!portalHost) {
        portalHost = document.createElement("span");
        portalHost.id = "tadeon-smart-setup-launcher-host";
        portalHost.className = "tadeon-smart-setup-launcher-host tadeon-smart-setup-map-host";
        portalHost.style.position = "absolute";
        portalHost.style.top = "max(0.75rem, env(safe-area-inset-top))";
        portalHost.style.right = "max(0.75rem, env(safe-area-inset-right))";
        portalHost.style.zIndex = "38";
        portalHost.style.pointerEvents = "auto";
      }
      if (portalHost.parentElement !== mapSurface || portalHost.previousSibling !== canvas) {
        canvas.insertAdjacentElement("afterend", portalHost);
      }
      setHost((current) => (current === portalHost ? current : portalHost));
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      document.getElementById("tadeon-smart-setup-launcher-host")?.remove();
    };
  }, []);

  if (!host) return null;

  return createPortal(
    <button
      type="button"
      className="tadeon-smart-setup-docked-launcher tadeon-smart-setup-map-launcher"
      onClick={() => window.dispatchEvent(new Event("tadeon-tabletop-smart-setup"))}
      title="Setup inteligente do mapa"
      aria-label="Abrir setup inteligente do mapa"
    >
      <WandSparkles aria-hidden="true" />
      <span>Setup</span>
    </button>,
    host,
  );
}
