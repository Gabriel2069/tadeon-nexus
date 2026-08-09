import { describe, expect, it } from "vitest";
import {
  isTabletopBackgroundMime,
  normalizeTabletopPlayback,
  tabletopMediaKind,
} from "./tabletop-media";

describe("tabletopMediaKind", () => {
  it("reconhece GIF e vídeo mesmo em URLs assinadas", () => {
    expect(tabletopMediaKind("", "/assets/token.gif?token=secret")).toBe("gif");
    expect(tabletopMediaKind("", "https://cdn.test/fire.webm#frame")).toBe(
      "video",
    );
  });

  it("mantém fundos limitados a imagens estáticas", () => {
    expect(isTabletopBackgroundMime("image/webp")).toBe(true);
    expect(isTabletopBackgroundMime("image/gif")).toBe(false);
    expect(isTabletopBackgroundMime("video/mp4")).toBe(false);
  });
});

describe("normalizeTabletopPlayback", () => {
  it("aplica defaults seguros e limita a velocidade", () => {
    expect(normalizeTabletopPlayback({})).toEqual({
      paused: false,
      loop: true,
      muted: true,
      speed: 1,
    });
    expect(normalizeTabletopPlayback({ playback_speed: 99 }).speed).toBe(4);
    expect(normalizeTabletopPlayback({ playback_speed: 0 }).speed).toBe(0.1);
  });
});
