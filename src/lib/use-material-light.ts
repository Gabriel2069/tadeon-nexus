import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";

/** A local light coordinate, never a transform or a global animation loop. */
export function useMaterialLight<T extends HTMLElement>() {
  const frame = useRef<number | null>(null);
  const target = useRef<T | null>(null);
  const point = useRef({ x: 0, y: 0 });
  const cancel = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return {
    onPointerMove(event: PointerEvent<T>) {
      if (event.pointerType !== "mouse" || document.hidden) return;
      // A nested control owns its light. Do not repaint every containing panel.
      const owner =
        event.target instanceof Element
          ? event.target.closest("[data-material-surface]")
          : null;
      if (owner && owner !== event.currentTarget) {
        cancel();
        return;
      }
      target.current = event.currentTarget;
      point.current = { x: event.clientX, y: event.clientY };
      if (frame.current !== null) return;
      if (
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const element = target.current;
        if (
          !element?.isConnected ||
          document.hidden ||
          !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const { x: clientX, y: clientY } = point.current;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
        element.style.setProperty("--material-x", `${x.toFixed(1)}%`);
        element.style.setProperty("--material-y", `${y.toFixed(1)}%`);
        element.style.setProperty("--material-tilt-x", `${((50 - y) * 0.06).toFixed(2)}deg`);
        element.style.setProperty("--material-tilt-y", `${((x - 50) * 0.08).toFixed(2)}deg`);
      });
    },
    onPointerLeave() {
      cancel();
      target.current?.style.removeProperty("--material-x");
      target.current?.style.removeProperty("--material-y");
      target.current?.style.removeProperty("--material-tilt-x");
      target.current?.style.removeProperty("--material-tilt-y");
    },
  };
}

/** React portals retain their route's material tone without observing the DOM. */
export const MaterialToneContext = createContext("217 215 164");
export function useMaterialToneStyle(): CSSProperties {
  return { "--material-rgb": useContext(MaterialToneContext) } as CSSProperties;
}
