import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

const HoverCard = ({
  openDelay = 450,
  closeDelay = 120,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) => (
  <HoverCardPrimitive.Root openDelay={openDelay} closeDelay={closeDelay} {...props} />
);
HoverCard.displayName = HoverCardPrimitive.Root.displayName;

const HoverCardTrigger = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>
>((props, ref) => (
  <HoverCardPrimitive.Trigger ref={ref} data-trigger-slot="hover-card-trigger" {...props} />
));
HoverCardTrigger.displayName = HoverCardPrimitive.Trigger.displayName;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(
  (
    {
      className,
      align = "center",
      sideOffset = 6,
      collisionPadding = 16,
      avoidCollisions = true,
      sticky = "always",
      hideWhenDetached = true,
      ...props
    },
    ref,
  ) => (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        ref={ref}
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        avoidCollisions={avoidCollisions}
        sticky={sticky}
        hideWhenDetached={hideWhenDetached}
        className={cn(
          "z-50 max-h-[min(36rem,var(--radix-hover-card-content-available-height))] w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl rounded-br-sm border border-border/80 bg-popover/95 p-4 text-popover-foreground shadow-[0_24px_70px_-30px_rgba(0,0,0,.95)] backdrop-blur-xl outline-none duration-[160ms] ease-[var(--ease-out)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-[120ms] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-hover-card-content-transform-origin)",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  ),
);
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };
