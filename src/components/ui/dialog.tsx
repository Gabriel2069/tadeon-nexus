"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import "@/styles/dialog-visual-viewport-180.css";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>((props, ref) => (
  <DialogPrimitive.Trigger ref={ref} data-trigger-slot="dialog-trigger" {...props} />
));
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>((props, ref) => <DialogPrimitive.Close ref={ref} data-trigger-slot="dialog-close" {...props} />);
DialogClose.displayName = DialogPrimitive.Close.displayName;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/78 duration-[180ms] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type VisualViewportStyle = React.CSSProperties & {
  "--tadeon-vv-top"?: string;
  "--tadeon-vv-left"?: string;
  "--tadeon-vv-width"?: string;
  "--tadeon-vv-height"?: string;
};

function useVisualViewportStyle(openContentRef: React.RefObject<HTMLElement | null>) {
  const [viewportStyle, setViewportStyle] = React.useState<VisualViewportStyle>({});

  React.useEffect(() => {
    const viewport = window.visualViewport;

    const sync = () => {
      const next: VisualViewportStyle = viewport
        ? {
            "--tadeon-vv-top": `${viewport.offsetTop}px`,
            "--tadeon-vv-left": `${viewport.offsetLeft}px`,
            "--tadeon-vv-width": `${viewport.width}px`,
            "--tadeon-vv-height": `${viewport.height}px`,
          }
        : {
            "--tadeon-vv-top": "0px",
            "--tadeon-vv-left": "0px",
            "--tadeon-vv-width": `${window.innerWidth}px`,
            "--tadeon-vv-height": `${window.innerHeight}px`,
          };

      setViewportStyle(next);

      window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement && openContentRef.current?.contains(active)) {
          active.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      });
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
    };
  }, [openContentRef]);

  return viewportStyle;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, forwardedRef) => {
  const localRef = React.useRef<React.ElementRef<typeof DialogPrimitive.Content> | null>(null);
  const viewportStyle = useVisualViewportStyle(localRef);

  const setRef = React.useCallback(
    (node: React.ElementRef<typeof DialogPrimitive.Content> | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setRef}
        data-slot="dialog-content"
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid max-h-[calc(100dvh_-_1rem)] w-[calc(100%_-_1rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-[1.15rem_.45rem_1.15rem_.45rem] border border-primary/15 bg-background/96 p-5 shadow-[0_32px_90px_-28px_rgba(0,0,0,.96),inset_0_1px_0_rgba(255,255,255,.045)] backdrop-blur-xl duration-200 ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-h-[calc(100dvh_-_2rem)] sm:w-[calc(100%_-_2rem)] sm:p-6",
          className,
        )}
        style={{ ...viewportStyle, ...style }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="dialog-close"
          className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-[0.7rem] border border-transparent text-muted-foreground transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-border hover:bg-accent hover:text-foreground active:scale-[.97] focus:outline-none focus:ring-2 focus:ring-ring/60 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent sm:right-4 sm:top-4"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-header"
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-footer"
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn("font-cinzel text-xl font-semibold leading-tight tracking-[-0.015em]", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
