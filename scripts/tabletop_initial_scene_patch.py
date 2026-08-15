from pathlib import Path

path = Path("src/components/tabletop/tabletop-workspace.tsx")
text = path.read_text(encoding="utf-8")


def once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 occurrence, got {count}")
    text = text.replace(old, new, 1)

once(
'''export function TabletopWorkspace({
  realtimeEnabled = false,
  lightingEnabled = false,
}: {
  realtimeEnabled?: boolean;
  lightingEnabled?: boolean;
}) {''',
'''export function TabletopWorkspace({
  initialSceneId,
  realtimeEnabled = false,
  lightingEnabled = false,
}: {
  initialSceneId?: string;
  realtimeEnabled?: boolean;
  lightingEnabled?: boolean;
}) {''',
"workspace initial scene prop",
)

once(
'''  const persistedSceneRef = useRef<PersistedTabletopScene | null>(null);
  const visibilityRef = useRef<TabletopVisibilityState>(createEmptyVisibilityState());''',
'''  const persistedSceneRef = useRef<PersistedTabletopScene | null>(null);
  const requestedSceneIdRef = useRef<string | null>(initialSceneId ?? null);
  const visibilityRef = useRef<TabletopVisibilityState>(createEmptyVisibilityState());''',
"requested scene ref",
)

once(
'''  useEffect(() => {
    if (contextMenu) {''',
'''  useEffect(() => {
    if (initialSceneId) requestedSceneIdRef.current = initialSceneId;
  }, [initialSceneId]);

  useEffect(() => {
    if (contextMenu) {''',
"requested scene sync",
)

old_campaigns = '''  useEffect(() => {
    let active = true;
    void tabletopPersistenceService
      .listCampaigns()
      .then((next) => {
        if (!active) return;
        setCampaigns(next);
        setCampaignId((current) => current || next[0]?.id || "");
        if (next.length === 0) setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(errorMessage(error));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);'''
new_campaigns = '''  useEffect(() => {
    let active = true;
    void tabletopPersistenceService
      .listCampaigns()
      .then(async (next) => {
        if (!active) return;
        setCampaigns(next);
        const requestedSceneId = requestedSceneIdRef.current;
        if (requestedSceneId) {
          try {
            const requestedScene = await tabletopPersistenceService.loadScene(requestedSceneId);
            if (
              active &&
              next.some((campaign) => campaign.id === requestedScene.campaignId)
            ) {
              setCampaignId(requestedScene.campaignId);
              return;
            }
          } catch {
            requestedSceneIdRef.current = null;
          }
        }
        setCampaignId((current) => current || next[0]?.id || "");
        if (next.length === 0) setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(errorMessage(error));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);'''
once(old_campaigns, new_campaigns, "campaign bootstrap")

old_scene_select = '''        const preferred = next.find((scene) => scene.status !== "archived") ?? next[0];
        if (preferred) await loadScene(preferred.id);
        else clearScene();'''
new_scene_select = '''        const requestedSceneId = requestedSceneIdRef.current;
        const preferred =
          next.find((scene) => scene.id === requestedSceneId) ??
          next.find((scene) => scene.status !== "archived") ??
          next[0];
        if (preferred) {
          if (preferred.id === requestedSceneId) requestedSceneIdRef.current = null;
          await loadScene(preferred.id);
        } else clearScene();'''
once(old_scene_select, new_scene_select, "requested scene selection")

path.write_text(text, encoding="utf-8")
print("initial scene patch applied")
