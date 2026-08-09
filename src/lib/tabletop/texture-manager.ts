import { Assets, Texture } from "pixi.js";
import { GifSource } from "pixi.js/gif";

export class TextureManager {
  private readonly cache = new Map<string, Promise<Texture>>();
  private readonly gifCache = new Map<string, Promise<GifSource>>();

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

  async loadGif(url: string) {
    const cached = this.gifCache.get(url);
    if (cached) return cached;

    const request = Assets.load<GifSource>(url).catch((error: unknown) => {
      this.gifCache.delete(url);
      throw new Error("Não foi possível carregar a animação deste asset.", {
        cause: error,
      });
    });
    this.gifCache.set(url, request);
    return request;
  }

  async clear() {
    const urls = [...new Set([...this.cache.keys(), ...this.gifCache.keys()])];
    this.cache.clear();
    this.gifCache.clear();
    await Promise.allSettled(urls.map((url) => Assets.unload(url)));
  }

  get size() {
    return this.cache.size + this.gifCache.size;
  }
}
