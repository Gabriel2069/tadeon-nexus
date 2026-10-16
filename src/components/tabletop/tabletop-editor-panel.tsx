import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** One editor: a persistent pane when there is room, a focus-contained dialog otherwise. */
export function TabletopEditorPanel({
  children,
  open,
  collapsed,
  onOpenChange,
}: {
  children: ReactNode;
  open: boolean;
  collapsed: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1199px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  if (compact)
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="tadeon-tabletop-panel" data-mobile-open={open}>
          <DialogTitle className="sr-only">Editor da Mesa</DialogTitle>
          <DialogDescription className="sr-only">
            Montagem, ambiente, bastidores, cena e inspeção. Alterações ficam na cena atual.
          </DialogDescription>
          {children}
        </DialogContent>
      </Dialog>
    );
  return (
    <aside
      className="tadeon-tabletop-panel"
      data-collapsed={collapsed}
      aria-label="Painel de edição da Mesa Nexus"
    >
      {children}
    </aside>
  );
}
