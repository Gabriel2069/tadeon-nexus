import { useEffect } from "react";

/** Local chrome geometry: shell and sheet headers may grow when controls or conditions wrap. */
export function useSheetChrome(host: HTMLElement | null) {
  useEffect(() => {
    if (!host) return;
    const toolbar = host.querySelector<HTMLElement>(".tadeon-sheet-commandbar");
    if (!toolbar) return;
    const headers = Array.from(
      host
        .closest(".tadeon-shell")
        ?.querySelectorAll<HTMLElement>(".tadeon-desktop-toolbar, .tadeon-mobile-header") ?? [],
    );
    const measure = () => {
      const shellHeight = Math.max(
        0,
        ...headers.map((header) => header.getBoundingClientRect().height),
      );
      const toolbarHeight =
        getComputedStyle(toolbar).position === "sticky"
          ? toolbar.getBoundingClientRect().height
          : 0;
      host.style.setProperty("--sheet-sticky-top", `${shellHeight}px`);
      host.style.setProperty("--sheet-toolbar-height", `${toolbarHeight}px`);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    for (const element of [...headers, toolbar]) observer?.observe(element);
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      host.style.removeProperty("--sheet-sticky-top");
      host.style.removeProperty("--sheet-toolbar-height");
    };
  }, [host]);
}
