import { useEffect } from "react";
import { toast } from "sonner";
import { TADEON_UNIFIED_DRAG_MIME, decodeTadeonUnifiedItem, unifiedItemToEntitySeed } from "@/lib/tabletop/tabletop-asset-flow";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";

export function TabletopUnifiedDropBridge() {
  useEffect(() => {
    const accepts = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes(TADEON_UNIFIED_DRAG_MIME);
    const onDragOver = (event: DragEvent) => {
      const runtime = currentTabletopRuntime();
      if (!runtime || !runtime.host.contains(event.target as Node) || !accepts(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      runtime.host.dataset.unifiedDrop = "active";
    };
    const onDragLeave = (event: DragEvent) => {
      const runtime = currentTabletopRuntime();
      if (!runtime) return;
      if (!event.relatedTarget || !runtime.host.contains(event.relatedTarget as Node)) delete runtime.host.dataset.unifiedDrop;
    };
    const onDrop = (event: DragEvent) => {
      const runtime = currentTabletopRuntime();
      if (!runtime || !runtime.host.contains(event.target as Node)) return;
      const raw = event.dataTransfer?.getData(TADEON_UNIFIED_DRAG_MIME);
      if (!raw) return;
      const item = decodeTadeonUnifiedItem(raw);
      if (!item) return;
      event.preventDefault();
      delete runtime.host.dataset.unifiedDrop;
      const point = runtime.engine.clientToWorld({ x: event.clientX, y: event.clientY });
      const seed = unifiedItemToEntitySeed(item);
      runtime.engine.addEntityAt(seed, point);
      toast.success(`${item.label} entrou na cena mantendo seus vínculos com o Nexus.`);
      window.dispatchEvent(new CustomEvent("tadeon-tabletop-unified-drop", { detail: { item, point } }));
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      const runtime = currentTabletopRuntime();
      if (runtime) delete runtime.host.dataset.unifiedDrop;
    };
  }, []);
  return null;
}
