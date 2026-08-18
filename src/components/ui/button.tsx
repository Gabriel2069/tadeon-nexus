import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import "@/styles/interaction-polish.css";
import "@/styles/viewport-fit-final.css";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.7rem] text-sm font-semibold cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary/70 bg-primary text-primary-foreground shadow-[0_10px_28px_-18px_var(--primary),inset_0_1px_0_rgba(255,255,255,.35)] hover:bg-primary/90 hover:shadow-[0_14px_32px_-20px_var(--primary),inset_0_1px_0_rgba(255,255,255,.4)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background/70 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] hover:border-primary/35 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-border/70 bg-secondary text-secondary-foreground shadow-sm hover:border-primary/20 hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
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
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const ariaLabel = typeof props["aria-label"] === "string" ? props["aria-label"] : "";
    const isProjectionToggle =
      ariaLabel === "Ativar projeção espacial 3D" || ariaLabel === "Voltar à planta 2D";
    const effectiveVariant = isProjectionToggle ? "outline" : variant;
    return (
      <Comp
        data-slot="button"
        data-size={size ?? "default"}
        data-variant={effectiveVariant ?? "default"}
        className={cn(buttonVariants({ variant: effectiveVariant, size, className }))}
        ref={ref}
        {...(!asChild ? { type: type ?? "button" } : {})}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
