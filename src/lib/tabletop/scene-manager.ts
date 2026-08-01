import {
  cloneScene,
  EMPTY_TABLETOP_SCENE,
  type TabletopEntity,
  type TabletopScene,
} from "./types";

export class SceneManager {
  private currentScene = cloneScene(EMPTY_TABLETOP_SCENE);

  get scene() {
    return this.currentScene;
  }

  replace(scene: TabletopScene) {
    this.currentScene = cloneScene(scene);
  }

  getEntity(id: string) {
    return this.currentScene.entities.find((entity) => entity.id === id);
  }

  setEntities(entities: TabletopEntity[]) {
    this.currentScene = {
      ...this.currentScene,
      entities: entities.map((entity) => ({ ...entity })),
    };
  }

  updateEntities(ids: Iterable<string>, patch: Partial<TabletopEntity>) {
    const selected = new Set(ids);
    this.setEntities(
      this.currentScene.entities.map((entity) =>
        selected.has(entity.id)
          ? { ...entity, ...patch, id: entity.id }
          : entity,
      ),
    );
  }
}
