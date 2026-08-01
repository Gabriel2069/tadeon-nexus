import { Assets, Texture } from "pixi.js";

export class TextureManager {
  private readonly cache = new Map<string, Promise<Texture>>();

  async load(url: string) {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const request = Assets.load<Texture>(url).catch((error: unknown) => {
      this.cache.delete(url);
      throw new Error("Não foi possível carregar a imagem deste asset.", {
        cause: error,
      });
    });
    this.cache.set(url, request);
    return request;
  }

  async clear() {
    const urls = [...this.cache.keys()];
    this.cache.clear();
    await Promise.allSettled(urls.map((url) => Assets.unload(url)));
  }

  get size() {
    return this.cache.size;
  }
}
