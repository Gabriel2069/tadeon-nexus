import { useEffect, useSyncExternalStore } from "react";

type InstallStatus = "checking" | "installable" | "manual" | "installed";
type InstallPlatform = "ios" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaInstallSnapshot {
  status: InstallStatus;
  platform: InstallPlatform;
}

const SERVER_SNAPSHOT: PwaInstallSnapshot = {
  status: "checking",
  platform: "other",
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function publish(next: PwaInstallSnapshot) {
  if (next.status === snapshot.status && next.platform === snapshot.platform) {
    return;
  }
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "other";
  const classicIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const ipadDesktopMode =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return classicIos || ipadDesktopMode ? "ios" : "other";
}

export function usePwaInstall() {
  const current = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );

  return {
    ...current,
    installed: current.status === "installed",
    install: async () => {
      if (!deferredPrompt) return "manual" as const;
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        deferredPrompt = null;
        publish({ status: "installed", platform: detectPlatform() });
      }
      return choice.outcome;
    },
  };
}

export function PwaRegistration() {
  useEffect(() => {
    const platform = detectPlatform();
    publish({
      status: isStandalone() ? "installed" : "manual",
      platform,
    });

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then((registration) => {
        void registration.update();
      });
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      publish({ status: "installable", platform });
    };
    const onInstalled = () => {
      deferredPrompt = null;
      publish({ status: "installed", platform });
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const onDisplayModeChange = () => {
      if (displayMode.matches) onInstalled();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    displayMode.addEventListener?.("change", onDisplayModeChange);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      displayMode.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  return null;
}
