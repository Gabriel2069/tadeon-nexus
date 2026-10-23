import * as React from "react";

const query = "(prefers-reduced-motion: reduce)";
const serverSnapshot = () => false;
export function useReducedPopupMotion() {
  const media = React.useMemo(
    () => (typeof window === "undefined" ? null : window.matchMedia?.(query)),
    [],
  );
  const subscribe = React.useCallback(
    (notify: () => void) => {
      media?.addEventListener?.("change", notify);
      return () => media?.removeEventListener?.("change", notify);
    },
    [media],
  );
  const snapshot = React.useCallback(() => media?.matches ?? false, [media]);
  return React.useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

type PopupRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** One open state for Radix and exit presence. A preference change must not
 * leave a closed modal waiting for an animation event that was cancelled. */
export function createPopupRoot<Props extends PopupRootProps>(
  Primitive: React.ComponentType<Props>,
  name: string,
) {
  const OpenContext = React.createContext<boolean | undefined>(undefined);
  function PopupRoot({ open, defaultOpen = false, onOpenChange, ...props }: Props) {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const currentOpen = open ?? internalOpen;
    const change = (next: boolean) => {
      if (open === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    };
    return (
      <OpenContext.Provider value={currentOpen}>
        <Primitive {...(props as Props)} open={currentOpen} onOpenChange={change} />
      </OpenContext.Provider>
    );
  }
  PopupRoot.displayName = name;
  function usePopupPresence(forceMount?: boolean) {
    const open = React.useContext(OpenContext);
    const reduced = useReducedPopupMotion();
    return forceMount || open !== false || !reduced;
  }
  return [PopupRoot, usePopupPresence] as const;
}
