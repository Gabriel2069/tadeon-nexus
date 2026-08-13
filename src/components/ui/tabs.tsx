import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

type TabsMotionDirection = "forward" | "backward";

function composeRefs<T>(...refs: Array<React.ForwardedRef<T>>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, onValueChange, value, defaultValue, ...props }, ref) => {
  const rootRef = React.useRef<React.ElementRef<typeof TabsPrimitive.Root>>(null);
  const currentValueRef = React.useRef(value ?? defaultValue);
  const [motionDirection, setMotionDirection] = React.useState<TabsMotionDirection>("forward");

  React.useEffect(() => {
    if (value !== undefined) currentValueRef.current = value;
  }, [value]);

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      const triggers = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]') ?? [],
      );
      const previousIndex = triggers.findIndex(
        (trigger) => trigger.dataset.tabValue === currentValueRef.current,
      );
      const nextIndex = triggers.findIndex((trigger) => trigger.dataset.tabValue === nextValue);

      if (previousIndex >= 0 && nextIndex >= 0 && previousIndex !== nextIndex) {
        setMotionDirection(nextIndex > previousIndex ? "forward" : "backward");
      }

      currentValueRef.current = nextValue;
      onValueChange?.(nextValue);
    },
    [onValueChange],
  );

  return (
    <TabsPrimitive.Root
      ref={composeRefs(rootRef, ref)}
      data-slot="tabs"
      data-motion-direction={motionDirection}
      className={cn("min-w-0", className)}
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      {...props}
    />
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<React.ElementRef<typeof TabsPrimitive.List>>(null);
  const [indicator, setIndicator] = React.useState({
    left: 0,
    width: 0,
    visible: false,
  });

  const measureIndicator = React.useCallback(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-state="active"]',
    );
    if (!list || !active) {
      setIndicator((current) => (current.visible ? { ...current, visible: false } : current));
      return;
    }

    setIndicator({
      left: active.offsetLeft,
      width: active.offsetWidth,
      visible: true,
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    measureIndicator();
    const mutationObserver =
      typeof MutationObserver === "undefined" ? null : new MutationObserver(measureIndicator);
    mutationObserver?.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureIndicator);
    resizeObserver?.observe(list);
    list
      .querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')
      .forEach((trigger) => resizeObserver?.observe(trigger));
    list.addEventListener("scroll", measureIndicator, { passive: true });

    return () => {
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      list.removeEventListener("scroll", measureIndicator);
    };
  }, [measureIndicator, children]);

  return (
    <TabsPrimitive.List
      ref={composeRefs(listRef, ref)}
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1 rounded-[0.9rem] border border-border/60 bg-muted/78 p-1 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_16px_44px_-38px_rgba(0,0,0,.95)] backdrop-blur",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="tabs-indicator"
        data-visible={indicator.visible ? "true" : "false"}
        style={{
          width: `${indicator.width}px`,
          transform: `translate3d(${indicator.left}px, 0, 0)`,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, value, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    data-slot="tabs-trigger"
    data-tab-value={value}
    value={value}
    className={cn(
      "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-[0.65rem] border border-transparent px-3 py-1.5 text-sm font-semibold ring-offset-background cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.97] data-[state=active]:border-primary/20 data-[state=active]:bg-[linear-gradient(145deg,rgba(217,215,164,.14),rgba(255,255,255,.035))] data-[state=active]:text-primary data-[state=active]:shadow-[0_10px_28px_-20px_var(--primary),inset_0_1px_0_rgba(255,255,255,.08)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    data-slot="tabs-content"
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
