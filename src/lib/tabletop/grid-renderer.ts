import { Graphics } from "pixi.js";
import type { TabletopScene } from "./types";

export class GridRenderer {
  readonly view = new Graphics();

  render(scene: TabletopScene) {
    this.view.clear();
    if (scene.gridMode === "none") return;

    const spacing = Math.max(8, scene.gridSize * scene.gridScale);
    for (let x = 0; x <= scene.width; x += spacing) {
      this.view.moveTo(x, 0).lineTo(x, scene.height);
    }
    for (let y = 0; y <= scene.height; y += spacing) {
      this.view.moveTo(0, y).lineTo(scene.width, y);
    }
    this.view.stroke({ color: 0x9c7a4f, alpha: 0.22, width: 1 });
  }

  destroy() {
    this.view.destroy();
  }
}
