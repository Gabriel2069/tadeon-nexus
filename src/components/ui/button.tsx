import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { useMaterialLight } from "@/lib/use-material-light";
import { cn } from "@/lib/utils";
import "@/styles/button.css";
import "@/styles/viewport.css";
const buttonVariants = cva(
  "tadeon-material-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.7rem] text-sm font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border",
        destructive: "border",
        outline: "border",
        secondary: "border",
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2 sm:h-10",
        sm: "h-11 rounded-[0.65rem] px-3 text-xs sm:h-9",
        lg: "h-11 rounded-[0.8rem] px-8",
        icon: "h-11 w-11 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, type, onPointerMove, onPointerLeave, ...props },
    ref,
  ) => {
    const light = useMaterialLight<HTMLButtonElement>();
    const Comp = asChild ? Slot : "button";
    const ariaLabel = typeof props["aria-label"] === "string" ? props["aria-label"] : "";
    const isProjectionToggle =
      ariaLabel === "Ativar projeção espacial 3D" || ariaLabel === "Voltar à planta 2D";
    const effectiveVariant = isProjectionToggle ? "outline" : variant;
    const renderedProps = isProjectionToggle ? { ...props, "aria-pressed": undefined } : props;

    return (
      <Comp
        data-slot="button"
        data-tone={
          variant === "destructive" || className?.includes("text-destructive")
            ? "destructive"
            : undefined
        }
        data-material-surface="control"
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (!event.defaultPrevented) light.onPointerMove(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          light.onPointerLeave();
        }}
        data-size={size ?? "default"}
        data-variant={effectiveVariant ?? "default"}
        className={cn(buttonVariants({ variant: effectiveVariant, size, className }))}
        ref={ref}
        {...(!asChild ? { type: type ?? "button" } : {})}
        {...renderedProps}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
