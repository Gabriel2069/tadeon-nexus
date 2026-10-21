import { describe, expect, it } from "vitest";
import {
  isTabletopBackgroundMime,
  normalizeTabletopPlayback,
  tabletopMediaKind,
  tabletopModelAnimationTime,
  tabletopModelPausePatch,
  tabletopModelSpeedPatch,
} from "./tabletop-media";

it("pauses and resumes a model at its current pose instead of restarting the clip", () => {
  const source = { model_animation_speed: 2, model_animation_offset: 3 };
  const paused = { ...source, ...tabletopModelPausePatch(source, true, 10) };
  expect(tabletopModelAnimationTime(paused, 50)).toBe(23);
  const resumed = { ...paused, ...tabletopModelPausePatch(paused, false, 50) };
  expect(tabletopModelAnimationTime(resumed, 50)).toBe(23);
  expect(tabletopModelAnimationTime(resumed, 51)).toBe(25);
});

it("changes speed without a phase jump and constrains malformed playback values", () => {
  const source = { model_animation_speed: 2, model_animation_offset: 3 };
  const next = { ...source, ...tabletopModelSpeedPatch(source, 0.5, 30) };
  expect(tabletopModelAnimationTime(next, 30)).toBe(63);
  expect(tabletopModelAnimationTime(next, 32)).toBe(64);
  expect(tabletopModelSpeedPatch(source, 100, 30).model_animation_speed).toBe(4);
});

describe("tabletopMediaKind", () => {
  it("reconhece GIF e vídeo mesmo em URLs assinadas", () => {
    expect(tabletopMediaKind("", "/assets/token.gif?token=secret")).toBe("gif");
    expect(tabletopMediaKind("", "https://cdn.test/fire.webm#frame")).toBe("video");
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
