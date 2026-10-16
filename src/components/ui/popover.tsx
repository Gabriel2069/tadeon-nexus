import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";
import { useRoutePopupFrame } from "@/components/ui/route-popup-frame";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>((props, ref) => (
  <PopoverPrimitive.Trigger ref={ref} data-trigger-slot="popover-trigger" {...props} />
));
PopoverTrigger.displayName = PopoverPrimitive.Trigger.displayName;

const PopoverAnchor = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>
>((props, ref) => (
  <PopoverPrimitive.Anchor ref={ref} data-trigger-slot="popover-anchor" {...props} />
));
PopoverAnchor.displayName = PopoverPrimitive.Anchor.displayName;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
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
      style,
      ...props
    },
    ref,
  ) => {
    const routeFrame = useRoutePopupFrame();
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          data-slot="popover-content"
          data-motion-surface="popup"
          align={align}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          collisionBoundary={routeFrame.boundary}
          avoidCollisions={avoidCollisions}
          sticky={sticky}
          hideWhenDetached={hideWhenDetached}
          data-route-bounded={routeFrame.boundary ? "true" : undefined}
          style={{ ...routeFrame.style, ...style }}
          className={cn(
            "z-50 max-h-[min(38rem,var(--radix-popover-content-available-height))] w-[min(18rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain  p-4 text-popover-foreground backdrop-blur-xl outline-none duration-[160ms] ease-[var(--ease-out)] origin-(--radix-popover-content-transform-origin)",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  },
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
