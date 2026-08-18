import { WandSparkles } from "lucide-react";

export function TabletopSmartSetupLauncherDockBridge() {
  if (typeof window === "undefined" || window.location.pathname !== "/tabletop") return null;

  return (
    <button
      type="button"
      className="tadeon-smart-setup-docked-launcher tadeon-smart-setup-map-launcher"
      style={{
        position: "fixed",
        right: "max(0.85rem, env(safe-area-inset-right))",
        bottom: "max(0.85rem, env(safe-area-inset-bottom))",
        zIndex: 60,
        pointerEvents: "auto",
      }}
      onClick={() => window.dispatchEvent(new Event("tadeon-tabletop-smart-setup"))}
      title="Setup inteligente do mapa"
      aria-label="Abrir setup inteligente do mapa"
    >
      <WandSparkles aria-hidden="true" />
      <span>Setup</span>
    </button>
  );
}
