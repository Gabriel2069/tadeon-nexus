import { useEffect } from "react";

function setRange(label: string, value: number) {
  const row = Array.from(document.querySelectorAll<HTMLLabelElement>(".tadeon-brain-slider")).find(
    (candidate) => candidate.textContent?.includes(label),
  );
  const input = row?.querySelector<HTMLInputElement>('input[type="range"]');
  if (!input) return false;
  const next = String(value);
  if (input.value === next) return true;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/**
 * The graph exposes its physics as controlled sliders. This bridge applies a
 * spacious-library preset without forking the graph component: links use
 * nearly the full supported distance, nodes repel much harder and center/domain
 * compression is deliberately weak. The user can still override every value
 * immediately in “Física e leitura”.
 */
export function NexusGraphDeclutterBridge() {
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let observer: MutationObserver | null = null;

    const calibrate = () => {
      if (!alive) return;
      const toggle = document.querySelector<HTMLButtonElement>(".tadeon-brain-settings-toggle");
      if (!toggle) return;
      const surface = toggle.closest<HTMLElement>("[class*='tadeon-brain']") ?? toggle.parentElement;
      if (!surface || surface.dataset.denseGraphCalibrated === "true") return;

      const wasOpen = toggle.getAttribute("aria-expanded") === "true";
      if (!wasOpen) toggle.click();

      window.requestAnimationFrame(() => {
        if (!alive) return;
        const changed = [
          setRange("Distância-base", 250),
          setRange("Repulsão", 2.3),
          setRange("Centro", 0.38),
          setRange("Agrupamento por domínio", 0.15),
          setRange("Aparecimento dos rótulos", 0.76),
        ].every(Boolean);
        if (changed) surface.dataset.denseGraphCalibrated = "true";
        if (!wasOpen && toggle.getAttribute("aria-expanded") === "true") toggle.click();
      });
    };

    const scan = () => {
      calibrate();
      timer = window.setTimeout(scan, 700);
    };

    observer = new MutationObserver(calibrate);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return null;
}
