import { Container, Graphics, Sprite, Text } from "pixi.js";
import type { TabletopEntity, TabletopLayer } from "./types";
import { TextureManager } from "./texture-manager";

export class EntityRenderer {
  readonly view = new Container();
  private readonly displays = new Map<string, Container>();
  private readonly assetUrls = new Map<string, string | undefined>();

  constructor(
    private readonly textures: TextureManager,
    private readonly onAssetError: (message: string) => void,
    private readonly invalidate: () => void,
  ) {}

  render(
    entities: TabletopEntity[],
    layers: TabletopLayer[],
    selectedIds: string[],
  ) {
    const live = new Set(entities.map((entity) => entity.id));
    for (const [id, display] of this.displays) {
      if (!live.has(id)) {
        this.displays.delete(id);
        this.assetUrls.delete(id);
        display.destroy({ children: true });
      }
    }

    const layerMap = new Map(layers.map((layer) => [layer.id, layer]));
    const selected = new Set(selectedIds);
    const ordered = [...entities].sort((a, b) => {
      const layerOrder =
        (layerMap.get(a.layerId)?.order ?? 0) -
        (layerMap.get(b.layerId)?.order ?? 0);
      return layerOrder || a.zIndex - b.zIndex;
    });

    for (const entity of ordered) {
      let display = this.displays.get(entity.id);
      if (!display) {
        display = this.createDisplay(entity);
        this.displays.set(entity.id, display);
        this.view.addChild(display);
      }
      const layer = layerMap.get(entity.layerId);
      display.visible = !entity.hidden && Boolean(layer?.visible);
      display.pivot.set(entity.width / 2, entity.height / 2);
      display.position.set(
        entity.x + entity.width / 2,
        entity.y + entity.height / 2,
      );
      display.rotation = (entity.rotation * Math.PI) / 180;
      display.zIndex = (layer?.order ?? 0) * 100_000 + entity.zIndex;
      this.syncAsset(display, entity);
      this.paint(display, entity, selected.has(entity.id));
    }
    this.view.sortableChildren = true;
    this.view.sortChildren();
  }

  private createDisplay(entity: TabletopEntity) {
    const display = new Container({ label: entity.id });
    display.addChild(new Graphics({ label: "shape" }));
    display.addChild(new Graphics({ label: "outline" }));
    const label = new Text({
      text: entity.label,
      style: {
        fill: 0xf4ead7,
        fontFamily: "serif",
        fontSize: 13,
        fontWeight: "600",
      },
    });
    label.label = "label";
    display.addChild(label);

    return display;
  }

  private paint(display: Container, entity: TabletopEntity, selected: boolean) {
    const shape = display.getChildByLabel("shape") as Graphics;
    shape.clear();
    shape.roundRect(0, 0, entity.width, entity.height, 8).fill({
      color: entity.color,
      alpha: entity.locked ? 0.45 : 0.78,
    });

    const outline = display.getChildByLabel("outline") as Graphics;
    outline.clear();
    outline.roundRect(0, 0, entity.width, entity.height, 8).stroke({
      color: selected ? 0xf3be63 : 0x292f3a,
      alpha: selected ? 1 : 0.9,
      width: selected ? 4 : 2,
    });
    const label = display.getChildByLabel("label") as Text;
    label.text = entity.label;
    label.position.set(8, Math.max(5, entity.height - 24));

    const sprite = display.getChildByLabel("asset") as Sprite | null;
    if (sprite) {
      sprite.position.set(0, 0);
      sprite.width = entity.width;
      sprite.height = entity.height;
    }
  }

  private syncAsset(display: Container, entity: TabletopEntity) {
    if (
      this.assetUrls.has(entity.id) &&
      this.assetUrls.get(entity.id) === entity.assetUrl
    )
      return;

    this.assetUrls.set(entity.id, entity.assetUrl);
    const current = display.getChildByLabel("asset");
    if (current) {
      display.removeChild(current);
      current.destroy();
    }
    if (entity.assetUrl)
      void this.attachAsset(display, entity.id, entity.assetUrl);
  }

  private async attachAsset(display: Container, entityId: string, url: string) {
    try {
      const texture = await this.textures.load(url);
      if (display.destroyed || this.assetUrls.get(entityId) !== url) return;
      const previous = display.getChildByLabel("asset");
      if (previous) {
        display.removeChild(previous);
        previous.destroy();
      }
      const sprite = new Sprite({ texture, label: "asset" });
      display.addChildAt(sprite, 1);
      this.invalidate();
    } catch (error) {
      if (this.assetUrls.get(entityId) !== url) return;
      this.onAssetError(
        error instanceof Error ? error.message : "Asset inválido.",
      );
    }
  }

  destroy() {
    this.displays.clear();
    this.assetUrls.clear();
    this.view.destroy({ children: true });
  }
}
