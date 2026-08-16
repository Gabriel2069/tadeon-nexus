import { Assets, Texture } from "pixi.js";
import { GifSource } from "pixi.js/gif";

interface TextureEntry {
  request: Promise<Texture>;
  bytes: number;
  touchedAt: number;
}

interface GifEntry {
  request: Promise<GifSource>;
  bytes: number;
  touchedAt: number;
}

const managers = new Set<TextureManager>();

function textureBytes(texture: Texture) {
  const width = Math.max(1, Number(texture.width) || 1);
  const height = Math.max(1, Number(texture.height) || 1);
  return width * height * 4;
}

function gifBytes(source: GifSource) {
  const candidate = source as unknown as { width?: number; height?: number; totalFrames?: number };
  const width = Math.max(1, Number(candidate.width) || 512);
  const height = Math.max(1, Number(candidate.height) || 512);
  const frames = Math.max(1, Math.min(8, Number(candidate.totalFrames) || 2));
  return width * height * 4 * frames;
}

export function configureTabletopTextureBudget(activeUrls: Iterable<string>, budgetMb: number) {
  const active = new Set([...activeUrls].filter(Boolean));
  for (const manager of managers) manager.configureBudget(active, budgetMb);
}

export class TextureManager {
  private readonly cache = new Map<string, TextureEntry>();
  private readonly gifCache = new Map<string, GifEntry>();
  private activeUrls = new Set<string>();
  private budgetBytes = 384 * 1024 * 1024;
  private trimming = false;

  constructor() {
    managers.add(this);
  }

  async load(url: string) {
    const cached = this.cache.get(url);
    if (cached) {
      cached.touchedAt = performance.now();
      return cached.request;
    }

    const entry: TextureEntry = { request: Promise.resolve(Texture.EMPTY), bytes: 4 * 1024 * 1024, touchedAt: performance.now() };
    const request = Assets.load<Texture>(url)
      .then((texture) => {
        entry.bytes = textureBytes(texture);
        entry.touchedAt = performance.now();
        void this.trim();
        return texture;
      })
      .catch((error: unknown) => {
        this.cache.delete(url);
        throw new Error("Não foi possível carregar a imagem deste asset.", { cause: error });
      });
    entry.request = request;
    this.cache.set(url, entry);
    return request;
  }

  async loadGif(url: string) {
    const cached = this.gifCache.get(url);
    if (cached) {
      cached.touchedAt = performance.now();
      return cached.request;
    }

    const entry: GifEntry = { request: Promise.resolve(null as unknown as GifSource), bytes: 8 * 1024 * 1024, touchedAt: performance.now() };
    const request = Assets.load<GifSource>(url)
      .then((source) => {
        entry.bytes = gifBytes(source);
        entry.touchedAt = performance.now();
        void this.trim();
        return source;
      })
      .catch((error: unknown) => {
        this.gifCache.delete(url);
        throw new Error("Não foi possível carregar a animação deste asset.", { cause: error });
      });
    entry.request = request;
    this.gifCache.set(url, entry);
    return request;
  }

  configureBudget(activeUrls: Set<string>, budgetMb: number) {
    this.activeUrls = new Set(activeUrls);
    this.budgetBytes = Math.max(96, Math.min(1024, Number(budgetMb) || 384)) * 1024 * 1024;
    void this.trim();
  }

  private async trim() {
    if (this.trimming) return;
    this.trimming = true;
    try {
      const entries = [
        ...[...this.cache.entries()].map(([url, entry]) => ({ url, bytes: entry.bytes, touchedAt: entry.touchedAt, kind: "texture" as const })),
        ...[...this.gifCache.entries()].map(([url, entry]) => ({ url, bytes: entry.bytes, touchedAt: entry.touchedAt, kind: "gif" as const })),
      ];
      let total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
      if (total <= this.budgetBytes) return;
      const evictable = entries
        .filter((entry) => !this.activeUrls.has(entry.url))
        .sort((left, right) => left.touchedAt - right.touchedAt);
      for (const entry of evictable) {
        if (total <= this.budgetBytes) break;
        if (entry.kind === "texture") this.cache.delete(entry.url);
        else this.gifCache.delete(entry.url);
        total -= entry.bytes;
        await Assets.unload(entry.url).catch(() => undefined);
      }
    } finally {
      this.trimming = false;
    }
  }

  async clear() {
    const urls = [...new Set([...this.cache.keys(), ...this.gifCache.keys()])];
    this.cache.clear();
    this.gifCache.clear();
    this.activeUrls.clear();
    managers.delete(this);
    await Promise.allSettled(urls.map((url) => Assets.unload(url)));
  }

  get size() {
    return this.cache.size + this.gifCache.size;
  }
}
