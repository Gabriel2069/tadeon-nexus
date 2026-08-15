from pathlib import Path

path = Path("src/lib/tabletop/tabletop-engine.ts")
text = path.read_text(encoding="utf-8")

old_import = '''import {
  createTabletopDrawingEntity,
  type TabletopDrawingStyle,
} from "./tabletop-drawing";'''
new_import = '''import {
  createTabletopDrawingEntity,
  readTabletopDrawingPoints,
  type TabletopDrawingStyle,
} from "./tabletop-drawing";'''
if text.count(old_import) != 1:
    raise RuntimeError("drawing import contract changed")
text = text.replace(old_import, new_import, 1)

old_snap = '''  private snap(point: Point): Point {
    const scene = this.scenes.scene;
    if (!scene.snap || scene.gridMode === "none") return point;
    return snapPointToGrid(
      point,
      scene.gridMode,
      scene.gridSize * scene.gridScale,
    );
  }'''
new_snap = '''  private snap(point: Point): Point {
    const scene = this.scenes.scene;
    if (!scene.snap) return point;

    const gridUnit = Math.max(8, scene.gridSize * scene.gridScale);
    const gridPoint =
      scene.gridMode === "none"
        ? { ...point }
        : snapPointToGrid(point, scene.gridMode, gridUnit);
    const threshold = Math.max(
      2.5,
      Math.min(gridUnit * 0.24, 12 / Math.max(this.camera.zoom, 0.12)),
    );
    const fallbackLevelId = activeTabletopLevel(scene).id;
    const activeLevelId = activeTabletopLevel(scene, this.activeLevelId).id;
    const selected = new Set(this.selection.ids);
    const xCandidates: number[] = [];
    const yCandidates: number[] = [];
    const pointCandidates: Point[] = [];

    for (const entity of scene.entities.slice(0, 220)) {
      if (
        selected.has(entity.id) ||
        entity.hidden ||
        tabletopItemLevelId(entity, fallbackLevelId) !== activeLevelId
      )
        continue;
      const xs = [entity.x, entity.x + entity.width / 2, entity.x + entity.width];
      const ys = [entity.y, entity.y + entity.height / 2, entity.y + entity.height];
      xCandidates.push(...xs);
      yCandidates.push(...ys);
      pointCandidates.push(
        { x: xs[0], y: ys[0] },
        { x: xs[2], y: ys[0] },
        { x: xs[2], y: ys[2] },
        { x: xs[0], y: ys[2] },
        { x: xs[1], y: ys[1] },
      );
    }

    for (const wall of this.visibilityState.walls.slice(0, 320)) {
      if (tabletopItemLevelId(wall, fallbackLevelId) !== activeLevelId) continue;
      const midpoint = { x: (wall.x1 + wall.x2) / 2, y: (wall.y1 + wall.y2) / 2 };
      for (const candidate of [
        { x: wall.x1, y: wall.y1 },
        { x: wall.x2, y: wall.y2 },
        midpoint,
      ]) {
        xCandidates.push(candidate.x);
        yCandidates.push(candidate.y);
        pointCandidates.push(candidate);
      }
    }

    for (const light of this.visibilityState.lights.slice(0, 96)) {
      if (tabletopItemLevelId(light, fallbackLevelId) !== activeLevelId) continue;
      xCandidates.push(light.x);
      yCandidates.push(light.y);
      pointCandidates.push({ x: light.x, y: light.y });
    }

    let exact: Point | null = null;
    let exactDistance = threshold;
    for (const candidate of pointCandidates) {
      const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (distance <= exactDistance) {
        exact = candidate;
        exactDistance = distance;
      }
    }
    if (exact) return { ...exact };

    const nearestAxis = (value: number, candidates: number[]) => {
      let nearest: number | null = null;
      let distance = threshold;
      for (const candidate of candidates) {
        const nextDistance = Math.abs(candidate - value);
        if (nextDistance <= distance) {
          nearest = candidate;
          distance = nextDistance;
        }
      }
      return nearest;
    };

    const x = nearestAxis(point.x, xCandidates);
    const y = nearestAxis(point.y, yCandidates);
    return {
      x: x ?? gridPoint.x,
      y: y ?? gridPoint.y,
    };
  }'''
if text.count(old_snap) != 1:
    raise RuntimeError("snap contract changed")
text = text.replace(old_snap, new_snap, 1)

anchor = '''  duplicateSelected() {
    if (this.readOnly) return;'''
method = '''  createStructuresFromSelectedDrawing() {
    if (this.readOnly || this.selection.ids.length !== 1) return 0;
    const drawing = this.selectedEntities[0];
    if (!drawing || drawing.type !== "drawing" || !this.layers.canEdit(drawing)) return 0;
    const properties =
      drawing.properties && typeof drawing.properties === "object" && !Array.isArray(drawing.properties)
        ? (drawing.properties as Record<string, unknown>)
        : {};
    const points = readTabletopDrawingPoints(properties.drawing_points);
    if (points.length < 2) return 0;
    const sourceWidth = Math.max(1, Number(properties.drawing_source_width) || drawing.width);
    const sourceHeight = Math.max(1, Number(properties.drawing_source_height) || drawing.height);
    const center = { x: drawing.x + drawing.width / 2, y: drawing.y + drawing.height / 2 };
    const angle = (drawing.rotation * Math.PI) / 180;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const worldPoints = points.map((point) => {
      const unrotated = {
        x: drawing.x + (point.x / sourceWidth) * drawing.width,
        y: drawing.y + (point.y / sourceHeight) * drawing.height,
      };
      const dx = unrotated.x - center.x;
      const dy = unrotated.y - center.y;
      return this.snap({
        x: center.x + dx * cosine - dy * sine,
        y: center.y + dx * sine + dy * cosine,
      });
    });
    const minimumSegment = Math.max(3, this.scenes.scene.gridSize * 0.08);
    let created = 0;
    let previous = worldPoints[0];
    const stride = Math.max(1, Math.ceil(worldPoints.length / 72));
    for (let index = stride; index < worldPoints.length; index += stride) {
      const current = worldPoints[Math.min(index, worldPoints.length - 1)];
      if (Math.hypot(current.x - previous.x, current.y - previous.y) >= minimumSegment) {
        this.options.onCreateStructure?.({ start: previous, end: current });
        previous = current;
        created += 1;
      }
    }
    const last = worldPoints[worldPoints.length - 1];
    if (
      created < 72 &&
      Math.hypot(last.x - previous.x, last.y - previous.y) >= minimumSegment
    ) {
      this.options.onCreateStructure?.({ start: previous, end: last });
      created += 1;
    }
    return created;
  }

  duplicateSelected() {
    if (this.readOnly) return;'''
if text.count(anchor) != 1:
    raise RuntimeError("duplicate anchor changed")
text = text.replace(anchor, method, 1)

path.write_text(text, encoding="utf-8")
print("smart snap patch applied")
