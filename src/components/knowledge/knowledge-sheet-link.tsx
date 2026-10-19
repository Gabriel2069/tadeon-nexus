import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NEXUS_DRAG_MIME } from "@/lib/knowledge/knowledge-transfer";

export function KnowledgeSheetLink({ nodeId, title }: { nodeId: string; title: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      draggable
      title={`Arraste “${title}” para uma ficha aberta para criar um vínculo persistente`}
      onDragStart={(event) => {
        event.dataTransfer.setData(NEXUS_DRAG_MIME, JSON.stringify({ id: nodeId, label: title }));
        event.dataTransfer.setData("text/plain", `${title} ~ /nexus?node=${nodeId}`);
        event.dataTransfer.effectAllowed = "link";
      }}
    >
      <GripVertical className="h-4 w-4" />
      Arrastar para ficha
    </Button>
  );
}
