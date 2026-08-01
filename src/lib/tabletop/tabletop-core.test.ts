import { describe, expect, it, vi } from "vitest";
import { Container } from "pixi.js";
import { CameraController } from "./camera-controller";
import { CommandHistory } from "./command-history";
import { clampEntityToScene, pointInRotatedRect } from "./geometry";
import { LayerManager } from "./layer-manager";
import { SceneManager } from "./scene-manager";
import { SelectionManager } from "./selection-manager";
import { EMPTY_TABLETOP_SCENE } from "./types";

describe("CommandHistory", () => {
  it("desfaz e refaz comandos locais sem persistência", () => {
    let value = 0;
    const history = new CommandHistory();
    history.execute({
      label: "somar",
      execute: () => (value = 2),
      undo: () => (value = 0),
    });
    expect(value).toBe(2);
    expect(history.undo()).toBe(true);
    expect(value).toBe(0);
    expect(history.redo()).toBe(true);
    expect(value).toBe(2);
  });

  it("limpa redo quando um novo comando é executado", () => {
    const history = new CommandHistory();
    history.execute({ label: "a", execute: vi.fn(), undo: vi.fn() });
    history.undo();
    history.execute({ label: "b", execute: vi.fn(), undo: vi.fn() });
    expect(history.canRedo).toBe(false);
  });
});

describe("CameraController", () => {
  it("converte coordenadas de tela e mundo de forma reversível", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setPosition({ x: 100, y: 50 });
    camera.zoomAt(2, { x: 100, y: 50 });
    const screen = camera.worldToScreen({ x: 25, y: 40 });
    expect(camera.screenToWorld(screen)).toEqual({ x: 25, y: 40 });
  });

  it("limita zoom para proteger navegação", () => {
    const camera = new CameraController(new Container());
    camera.zoomAt(100, { x: 0, y: 0 });
    expect(camera.zoom).toBe(4);
    camera.zoomAt(0, { x: 0, y: 0 });
    expect(camera.zoom).toBe(0.15);
  });
});

describe("gestores de cena, camadas e seleção", () => {
  it("mantém a cena vazia válida e poda seleções removidas", () => {
    const scenes = new SceneManager();
    const selection = new SelectionManager();
    scenes.replace(EMPTY_TABLETOP_SCENE);
    selection.replace(["ausente"]);
    selection.prune(scenes.scene.entities.map((entity) => entity.id));
    expect(scenes.scene.entities).toEqual([]);
    expect(selection.ids).toEqual([]);
  });

  it("impede edição em camada ou entidade bloqueada", () => {
    const layers = new LayerManager(() => EMPTY_TABLETOP_SCENE.layers);
    const entity = {
      id: "mapa",
      layerId: "map",
      type: "object" as const,
      label: "Mapa",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: 0,
      hidden: false,
      locked: false,
      color: 0,
    };
    expect(layers.canEdit(entity)).toBe(false);
    expect(
      layers.canEdit({ ...entity, layerId: "objects", locked: true }),
    ).toBe(false);
    expect(layers.canEdit({ ...entity, layerId: "objects" })).toBe(true);
  });
});

describe("geometria de entidades", () => {
  const entity = {
    id: "rotacionada",
    layerId: "objects",
    type: "object" as const,
    label: "Objeto",
    x: 10,
    y: 20,
    width: 100,
    height: 20,
    rotation: 90,
    zIndex: 0,
    hidden: false,
    locked: false,
    color: 0,
  };

  it("faz hit test respeitando a rotação ao redor do centro", () => {
    expect(pointInRotatedRect({ x: 60, y: 70 }, entity)).toBe(true);
    expect(pointInRotatedRect({ x: 100, y: 30 }, entity)).toBe(false);
  });

  it("mantém tamanho, posição e rotação dentro de limites válidos", () => {
    expect(
      clampEntityToScene(
        {
          ...entity,
          x: Number.POSITIVE_INFINITY,
          y: -20,
          width: 500,
          height: -1,
          rotation: -90,
        },
        200,
        100,
      ),
    ).toMatchObject({ x: 0, y: 0, width: 200, height: 8, rotation: 270 });
  });
});
