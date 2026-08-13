import { Container, Graphics, Matrix, Sprite, Text } from "pixi.js";
import { GifSprite } from "pixi.js/gif";
import type { TabletopProjectionMode } from "./camera-controller";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  tabletopProjectionMatrix,
  type TabletopViewOrientation,
} from "./tabletop-projection";
import {
  inverseIsometricEntityMatrix,
  tabletopBillboardAppearance,
  tabletopEntityRenderMode,
} from "./isometric-billboard";
import { readTabletopDrawingPoints } from "./tabletop-drawing";
import {
  activeTabletopLevel,
  elevateIsometricPoint,
  tabletopEntityWorldElevation,
  tabletopItemLevelId,
} from "./tabletop-levels";
import type { TabletopEntity, TabletopScene } from "./types";
import { TextureManager } from "./texture-manager";
import { normalizeTabletopPlayback, tabletopMediaKind } from "./tabletop-media";

function entityProperties(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
    scene: TabletopScene,
    selectedIds: string[],
    projection: TabletopProjectionMode = "plan",
    activeLevelId?: string | null,
    orientation: TabletopViewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION,
  ) {
    const entities = scene.entities;
    const layers = scene.layers;
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
    const activeLevel = activeTabletopLevel(scene, activeLevelId);
    const fallbackLevelId = activeTabletopLevel(scene).id;
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
      const onActiveLevel =
        tabletopItemLevelId(entity, fallbackLevelId) === activeLevel.id;
      display.visible =
        !entity.hidden &&
        Boolean(layer?.visible) &&
        activeLevel.visible &&
        onActiveLevel;
      display.pivot.set(entity.width / 2, entity.height / 2);
      const center = {
        x: entity.x + entity.width / 2,
        y: entity.y + entity.height / 2,
      };
      const position =
        projection === "isometric"
          ? elevateIsometricPoint(
              center,
              tabletopEntityWorldElevation(entity, activeLevel),
              orientation,
            )
          : center;
      display.position.set(position.x, position.y);
      display.rotation = (entity.rotation * Math.PI) / 180;
      display.zIndex =
        (layer?.order ?? 0) * 1_000_000 +
        (projection === "isometric"
          ? Math.round((entity.x + entity.y) * 10)
          : 0) +
        entity.zIndex;
      this.syncAsset(display, entity);
      this.paint(
        display,
        entity,
        selected.has(entity.id),
        projection,
        orientation,
      );
    }
    this.view.sortableChildren = true;
    this.view.sortChildren();
  }

  private createDisplay(entity: TabletopEntity) {
    const display = new Container({ label: entity.id });
    display.addChild(new Graphics({ label: "shape" }));
    display.addChild(new Graphics({ label: "ground-shadow" }));
    display.addChild(new Graphics({ label: "outline" }));
    const hud = new Container({ label: "hud" });
    hud.addChild(new Graphics({ label: "label-plate" }));
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
    hud.addChild(label);
    const badge = new Text({
      text: "",
      style: {
        fill: 0xffe0a3,
        fontFamily: "sans-serif",
        fontSize: 9,
        fontWeight: "700",
      },
    });
    badge.label = "badge";
    hud.addChild(badge);
    const icons = new Text({
      text: "",
      style: {
        fill: 0xf4ead7,
        fontFamily: "sans-serif",
        fontSize: 12,
      },
    });
    icons.label = "icons";
    hud.addChild(icons);
    hud.addChild(new Graphics({ label: "bar" }));
    display.addChild(hud);

    return display;
  }

  private paint(
    display: Container,
    entity: TabletopEntity,
    selected: boolean,
    projection: TabletopProjectionMode,
    orientation: TabletopViewOrientation,
  ) {
    const shape = display.getChildByLabel("shape") as Graphics;
    shape.clear();
    const outline = display.getChildByLabel("outline") as Graphics;
    outline.clear();
    const properties = entityProperties(entity.properties);
    const renderMode = tabletopEntityRenderMode(entity);
    const billboardAppearance = tabletopBillboardAppearance(entity);
    const billboard =
      projection === "isometric" && renderMode === "billboard" && Boolean(entity.assetUrl);
    const groundShadow = display.getChildByLabel("ground-shadow") as Graphics;
    groundShadow.clear();
    groundShadow.visible = billboard && billboardAppearance.shadow;
    if (groundShadow.visible) {
      const shadowWidth = Math.max(12, entity.width * 0.42 * billboardAppearance.scale);
      const shadowDepth = Math.max(4, Math.min(entity.height * 0.13, shadowWidth * 0.34));
      groundShadow
        .ellipse(entity.width / 2, entity.height, shadowWidth, shadowDepth)
        .fill({ color: 0x020305, alpha: 0.34 });
    }
    const drawingPoints =
      entity.type === "drawing"
        ? readTabletopDrawingPoints(properties.drawing_points)
        : [];
    const isPathDrawing = entity.type === "drawing" && drawingPoints.length > 1;

    if (isPathDrawing) {
      const sourceWidth = Math.max(
        1,
        finiteNumber(properties.drawing_source_width, entity.width),
      );
      const sourceHeight = Math.max(
        1,
        finiteNumber(properties.drawing_source_height, entity.height),
      );
      const scaleX = entity.width / sourceWidth;
      const scaleY = entity.height / sourceHeight;
      const scaleStroke = Math.max(0.1, Math.sqrt(scaleX * scaleY));
      const strokeWidth = Math.max(
        1,
        Math.min(48, finiteNumber(properties.stroke_width, 5)),
      );
      const strokeOpacity = Math.max(
        0.1,
        Math.min(1, finiteNumber(properties.stroke_opacity, 1)),
      );
      shape.moveTo(drawingPoints[0].x * scaleX, drawingPoints[0].y * scaleY);
      for (const point of drawingPoints.slice(1))
        shape.lineTo(point.x * scaleX, point.y * scaleY);
      shape.stroke({
        color: entity.color,
        alpha: entity.locked ? strokeOpacity * 0.55 : strokeOpacity,
        width: strokeWidth * scaleStroke,
        cap: "round",
        join: "round",
      });
      if (selected)
        outline.roundRect(0, 0, entity.width, entity.height, 6).stroke({
          color: 0xf3be63,
          alpha: 0.88,
          width: 2,
        });
    } else {
      shape.roundRect(0, 0, entity.width, entity.height, 8).fill({
        color: entity.color,
        alpha: entity.locked ? 0.45 : 0.78,
      });
      outline.roundRect(0, 0, entity.width, entity.height, 8).stroke({
        color: selected ? 0xf3be63 : 0x292f3a,
        alpha: selected ? 1 : 0.9,
        width: selected ? 4 : 2,
      });
    }
    const status =
      typeof properties.status === "string" ? properties.status.trim() : "";
    const conditions = Array.isArray(properties.visual_conditions)
      ? properties.visual_conditions.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    const icons = Array.isArray(properties.icons)
      ? properties.icons
          .filter((value): value is string => typeof value === "string")
          .slice(0, 4)
      : [];
    const badgeParts = [status, ...conditions].filter(Boolean).slice(0, 2);
    const hud = display.getChildByLabel("hud") as Container;
    const labelPlate = hud.getChildByLabel("label-plate") as Graphics;
    labelPlate.clear();
    const badge = hud.getChildByLabel("badge") as Text;
    badge.text = badgeParts.join(" · ").slice(0, 30);
    badge.visible =
      !isPathDrawing && badge.text.length > 0 && entity.width >= 56;

    const iconText = hud.getChildByLabel("icons") as Text;
    iconText.text = icons.join(" ").slice(0, 20);
    iconText.visible =
      !isPathDrawing && iconText.text.length > 0 && entity.width >= 48;

    const barMax = Math.max(0, finiteNumber(properties.bar_max));
    const barCurrent = Math.max(
      0,
      Math.min(barMax, finiteNumber(properties.bar_current)),
    );
    const bar = hud.getChildByLabel("bar") as Graphics;
    bar.clear();
    bar.visible =
      !isPathDrawing && barMax > 0 && entity.width >= 32 && entity.height >= 32;
    const ratio = barMax > 0 ? barCurrent / barMax : 0;
    if (bar.visible && projection !== "isometric") {
      const width = Math.max(8, entity.width - 10);
      bar.roundRect(5, entity.height - 9, width, 5, 3).fill({
        color: 0x191d24,
        alpha: 0.92,
      });
      if (ratio > 0)
        bar
          .roundRect(5, entity.height - 9, width * ratio, 5, 3)
          .fill({ color: 0x57b77a, alpha: 1 });
    }

    const label = hud.getChildByLabel("label") as Text;
    const maxLabelLength = Math.max(4, Math.floor((entity.width - 16) / 7));
    label.text =
      entity.label.length > maxLabelLength
        ? `${entity.label.slice(0, Math.max(1, maxLabelLength - 1))}…`
        : entity.label;
    label.visible = !isPathDrawing;
    hud.visible = !isPathDrawing;
    if (!isPathDrawing && projection === "isometric") {
      const matrix = inverseIsometricEntityMatrix(
        entity.rotation,
        tabletopProjectionMatrix("isometric", orientation),
      );
      hud.setFromMatrix(
        new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, entity.width / 2, entity.height + 7),
      );
      label.position.set(-label.width / 2, 5);
      const imageHeight = billboard
        ? entity.height * billboardAppearance.scale
        : entity.height * 0.5;
      badge.position.set(-badge.width / 2, -imageHeight - 14);
      iconText.position.set(-iconText.width / 2, badge.visible ? -imageHeight : -12);
      if (bar.visible) {
        const width = Math.max(34, Math.min(150, entity.width * billboardAppearance.scale));
        bar.roundRect(-width / 2, -3, width, 5, 3).fill({
          color: 0x11151b,
          alpha: 0.94,
        });
        if (ratio > 0)
          bar
            .roundRect(-width / 2, -3, width * ratio, 5, 3)
            .fill({ color: 0x57b77a, alpha: 1 });
      }
    } else {
      hud.setFromMatrix(new Matrix());
      badge.position.set(7, 5);
      iconText.position.set(
        Math.max(6, entity.width - iconText.width - 7),
        badge.visible ? 19 : 5,
      );
      label.position.set(8, Math.max(5, entity.height - (bar.visible ? 30 : 24)));
    }
    if (label.visible) {
      labelPlate
        .roundRect(label.x - 5, label.y - 2, label.width + 10, label.height + 4, 6)
        .fill({ color: 0x080b10, alpha: 0.76 })
        .stroke({ color: selected ? 0xf3be63 : 0xd9d7a4, alpha: selected ? 0.62 : 0.14, width: 1 });
    }

    const assetFrame = display.getChildByLabel("asset") as Container | null;
    const sprite = assetFrame?.getChildByLabel("asset-sprite") as Sprite | null;
    if (assetFrame && sprite) {
      const playback = normalizeTabletopPlayback(properties);
      if (sprite instanceof GifSprite) {
        sprite.animationSpeed = playback.speed;
        sprite.loop = playback.loop;
        if (playback.paused && sprite.playing) sprite.stop();
        else if (!playback.paused && !sprite.playing) sprite.play();
      } else {
        const resource = sprite.texture.source.resource;
        if (
          typeof HTMLVideoElement !== "undefined" &&
          resource instanceof HTMLVideoElement
        ) {
          resource.muted = playback.muted;
          resource.loop = playback.loop;
          resource.playbackRate = playback.speed;
          if (playback.paused && !resource.paused) resource.pause();
          else if (!playback.paused && resource.paused)
            void resource.play().catch(() => undefined);
        }
      }
      sprite.width = billboard ? entity.width * billboardAppearance.scale : entity.width;
      sprite.height = billboard ? entity.height * billboardAppearance.scale : entity.height;
      if (billboard) {
        const matrix = inverseIsometricEntityMatrix(
          entity.rotation,
          tabletopProjectionMatrix("isometric", orientation),
        );
        sprite.anchor.set(
          0.5,
          billboardAppearance.anchor === "base" ? 1 : 0.5,
        );
        sprite.position.set(0, 0);
        const anchorY =
          billboardAppearance.anchor === "base" ? entity.height : entity.height / 2;
        assetFrame.setFromMatrix(
          new Matrix(
            matrix.a,
            matrix.b,
            matrix.c,
            matrix.d,
            entity.width / 2,
            anchorY,
          ),
        );
      } else {
        sprite.anchor.set(0);
        sprite.position.set(0, 0);
        assetFrame.setFromMatrix(new Matrix());
      }
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
      void this.attachAsset(display, entity, entity.assetUrl);
  }

  private async attachAsset(
    display: Container,
    entity: TabletopEntity,
    url: string,
  ) {
    try {
      const properties = entityProperties(entity.properties);
      const playback = normalizeTabletopPlayback(properties);
      const assetSprite =
        tabletopMediaKind(properties.mime_type, url) === "gif"
          ? new GifSprite({
              source: await this.textures.loadGif(url),
              label: "asset-sprite",
              autoPlay: !playback.paused,
              loop: playback.loop,
              animationSpeed: playback.speed,
            })
          : new Sprite({
              texture: await this.textures.load(url),
              label: "asset-sprite",
            });
      if (display.destroyed || this.assetUrls.get(entity.id) !== url) {
        assetSprite.destroy();
        return;
      }
      const previous = display.getChildByLabel("asset");
      if (previous) {
        display.removeChild(previous);
        previous.destroy({ children: true });
      }
      const resource = assetSprite.texture.source.resource;
      if (
        typeof HTMLVideoElement !== "undefined" &&
        resource instanceof HTMLVideoElement
      ) {
        resource.muted = playback.muted;
        resource.loop = playback.loop;
        resource.playsInline = true;
        resource.playbackRate = playback.speed;
        if (playback.paused) resource.pause();
        else void resource.play().catch(() => undefined);
      }
      const assetFrame = new Container({ label: "asset" });
      assetFrame.addChild(assetSprite);
      display.addChildAt(assetFrame, 2);
      this.invalidate();
    } catch (error) {
      if (this.assetUrls.get(entity.id) !== url) return;
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
