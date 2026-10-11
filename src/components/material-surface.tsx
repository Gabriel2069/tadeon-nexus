import type { HTMLAttributes } from "react";
import { useMaterialLight } from "@/lib/use-material-light";

/** Semantic surface with an event-driven reflection; content stays in place. */
export function MaterialSurface({
  as: Element = "div",
  onPointerMove,
  onPointerLeave,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" }) {
  const light = useMaterialLight<HTMLElement>();
  return (
    <Element
      {...props}
      data-material-surface="panel"
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (!event.defaultPrevented) light.onPointerMove(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        light.onPointerLeave();
      }}
    />
  );
}
