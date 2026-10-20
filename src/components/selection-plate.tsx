import { useEffect, useRef, type HTMLAttributes, type ReactNode, type RefObject } from "react";

// Bounded, client-only presentation memory. Logical destinations are measured
// again in the new shell; viewport coordinates and application data are never cached.
const navigationSelection = new Map<string, string>();
const controlKey = (node: HTMLElement) =>
  node.getAttribute("href") ?? node.getAttribute("aria-label") ?? node.textContent?.trim();

/** One moving surface; controls and their hit regions stay in place. */
export function SelectionPlate({
  host,
  activeKey,
  selector,
  motionId,
}: {
  host: RefObject<HTMLElement | null>;
  activeKey: string | undefined;
  selector: string;
  motionId?: string;
}) {
  const plate = useRef<HTMLSpanElement>(null);
  const mounted = useRef(false);
  // Parent host refs are attached after child layout effects. Measure only
  // after that commit, then keep the local geometry current via ResizeObserver.
  useEffect(() => {
    const group = host.current;
    const element = plate.current;
    if (!group || !element) return;
    let disposed = false;
    let frame = 0;
    const position = (selected: HTMLElement) => {
      const bounds = group.getBoundingClientRect();
      const target = selected.getBoundingClientRect();
      const x = target.left - bounds.left + group.scrollLeft - group.clientLeft;
      const y = target.top - bounds.top + group.scrollTop - group.clientTop;
      element.style.width = `${target.width}px`;
      element.style.height = `${target.height}px`;
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      element.dataset.ready = "true";
    };
    const measure = () => {
      if (disposed || !group.isConnected) return;
      const selected = group.querySelector<HTMLElement>(selector);
      if (!selected || !selected.getClientRects().length) {
        element.dataset.ready = "false";
        return;
      }
      position(selected);
    };
    const schedule = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const selected = group.querySelector<HTMLElement>(selector);
    const priorKey = motionId ? navigationSelection.get(motionId) : undefined;
    const prior =
      priorKey &&
      Array.from(group.querySelectorAll<HTMLElement>("a,button")).find(
        (node) => controlKey(node) === priorKey,
      );
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (
      !mounted.current &&
      !reducedMotion &&
      prior &&
      selected &&
      prior !== selected &&
      prior.getClientRects().length
    ) {
      position(prior);
      // Commit the departure frame before the next route's target is applied.
      element.getBoundingClientRect();
      frame = requestAnimationFrame(measure);
    } else measure();
    // ResizeObserver does not report an ancestor's animated transform. Reconcile
    // when a containing entrance settles, including one started after this effect.
    const entranceHost = group.closest(".tadeon-shell") ?? group.parentElement ?? group;
    const settleEntrance = (event: Event) => {
      if (event.target instanceof Element && event.target.contains(group)) schedule();
    };
    entranceHost.addEventListener("animationend", settleEntrance);
    mounted.current = true;
    const nextKey = selected && controlKey(selected);
    if (motionId && nextKey) {
      navigationSelection.set(motionId, nextKey);
      if (navigationSelection.size > 16)
        navigationSelection.delete(navigationSelection.keys().next().value!);
    }
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(group);
    // Label/font changes may resize a control without changing the rail itself.
    group.querySelectorAll<HTMLElement>("a,button").forEach((node) => observer?.observe(node));
    window.addEventListener("resize", schedule, { passive: true });
    void document.fonts?.ready.then(() => {
      if (!disposed) schedule();
    });
    return () => {
      disposed = true;
      entranceHost.removeEventListener("animationend", settleEntrance);
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    };
  }, [host, activeKey, selector, motionId]);
  return <span ref={plate} className="tadeon-selection-plate" aria-hidden="true" />;
}

export function SelectionGroup({
  activeKey,
  selector,
  motionId,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  activeKey: string;
  selector: string;
  motionId?: string;
  children: ReactNode;
}) {
  const host = useRef<HTMLElement>(null);
  return (
    <nav {...props} ref={host} data-selection-rail="">
      <SelectionPlate host={host} activeKey={activeKey} selector={selector} motionId={motionId} />
      {children}
    </nav>
  );
}
