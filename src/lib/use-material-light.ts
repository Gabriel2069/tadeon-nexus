import { useEffect, useRef, type PointerEvent } from "react";

/** A local light coordinate, never a transform or a global animation loop. */
export function useMaterialLight<T extends HTMLElement>() {
  const frame = useRef<number | null>(null);
  const target = useRef<T | null>(null);
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
      if (
        event.pointerType !== "mouse" ||
        document.hidden ||
        !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const element = event.currentTarget;
      const { clientX, clientY } = event;
      target.current = element;
      cancel();
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (!element.isConnected) return;
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
