import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";
import { SelectionPlate } from "@/components/selection-plate";

const SelectionContext = React.createContext<string | undefined>(undefined);

type TabsMotionDirection = "forward" | "backward";

function composeRefs<T>(...refs: Array<React.ForwardedRef<T>>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }
  };
}

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, onValueChange, value, defaultValue, ...props }, ref) => {
  const rootRef = React.useRef<React.ElementRef<typeof TabsPrimitive.Root>>(null);
  const currentValueRef = React.useRef(value ?? defaultValue);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
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
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <SelectionContext.Provider value={value ?? internalValue}>
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
    </SelectionContext.Provider>
  );
});
Tabs.displayName = TabsPrimitive.Root.displayName;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const host = React.useRef<React.ElementRef<typeof TabsPrimitive.List>>(null);
  const activeKey = React.useContext(SelectionContext);
  return (
    <TabsPrimitive.List
      ref={composeRefs(host, ref)}
      data-slot="tabs-list"
      data-selection-rail=""
      data-material-surface="tablist"
      className={cn(
        "tadeon-material-tabs inline-flex min-h-11 items-center gap-1 rounded-xl p-1",
        className,
      )}
      {...props}
    >
      <SelectionPlate
        host={host}
        activeKey={activeKey}
        selector='[role="tab"][data-state="active"]'
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
    data-material-surface="tab"
    data-tab-value={value}
    value={value}
    className={cn(
      "inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-[0.65rem] border border-transparent px-3 py-1.5 text-sm font-semibold ring-offset-background cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:text-foreground",
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
    data-motion-surface="tabpanel"
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
