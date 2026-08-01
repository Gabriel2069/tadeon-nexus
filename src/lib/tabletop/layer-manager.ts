import type { TabletopEntity, TabletopLayer } from "./types";

export class LayerManager {
  constructor(private readonly getLayers: () => TabletopLayer[]) {}

  get(id: string) {
    return this.getLayers().find((layer) => layer.id === id);
  }

  canEdit(entity: TabletopEntity) {
    const layer = this.get(entity.layerId);
    return !entity.locked && Boolean(layer?.visible) && !layer?.locked;
  }

  ordered() {
    return [...this.getLayers()].sort((a, b) => a.order - b.order);
  }
}
