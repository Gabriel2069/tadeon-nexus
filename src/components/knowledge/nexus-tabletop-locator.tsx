import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MapPinned, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/nexus-tabletop-locator.css";

const database = supabase as unknown as SupabaseClient;

interface TabletopLocation {
  id: string;
  sceneId: string;
  name: string;
  sceneName: string;
}

export function NexusTabletopLocator({ nodeId }: { nodeId?: string }) {
  const [locations, setLocations] = useState<TabletopLocation[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    setLocations([]);
    if (!nodeId || !/^[0-9a-f-]{36}$/i.test(nodeId)) return;
    let active = true;
    void (async () => {
      const { data: entities, error } = await database
        .from("tabletop_entities")
        .select("id,scene_id,name")
        .eq("linked_knowledge_node_id", nodeId)
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error || !entities?.length || !active) return;
      const sceneIds = [...new Set(entities.map((entity) => String(entity.scene_id)))];
      const { data: scenes } = await database
        .from("tabletop_scenes")
        .select("id,name")
        .in("id", sceneIds);
      if (!active) return;
      const sceneNames = new Map((scenes ?? []).map((scene) => [String(scene.id), String(scene.name)]));
      setLocations(
        entities.map((entity) => ({
          id: String(entity.id),
          sceneId: String(entity.scene_id),
          name: String(entity.name || "Entidade"),
          sceneName: sceneNames.get(String(entity.scene_id)) ?? "Cena",
        })),
      );
    })();
    return () => {
      active = false;
    };
  }, [nodeId]);

  if (dismissed || locations.length === 0) return null;

  const primary = locations[0];
  return (
    <aside className="tadeon-nexus-tabletop-locator" aria-label="Presença desta página na Mesa Nexus">
      <span><MapPinned aria-hidden="true" /></span>
      <div>
        <small>Presente na Mesa</small>
        <strong>{primary.sceneName}</strong>
        <span>{primary.name}{locations.length > 1 ? ` +${locations.length - 1}` : ""}</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          window.open(
            `/tabletop?scene=${encodeURIComponent(primary.sceneId)}&locate=${encodeURIComponent(primary.id)}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Localizar
      </Button>
      <button type="button" aria-label="Ocultar localização" onClick={() => setDismissed(true)}>
        <X aria-hidden="true" />
      </button>
    </aside>
  );
}
