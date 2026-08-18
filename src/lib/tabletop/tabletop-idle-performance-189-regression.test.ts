import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("tabletop idle performance 189", () => {
  it("does not rerender atmosphere on every global pointer move while power mode is inactive", () => {
    const atmosphere = source("src/components/tabletop/tabletop-atmosphere-bridge.tsx");
    expect(atmosphere).toContain("if (!active) return;");
    expect(atmosphere).toContain('window.addEventListener("pointermove", pointerMove, { passive: true })');
    expect(atmosphere).toContain("window.requestAnimationFrame(flush)");
    expect(atmosphere).toContain("}, [active]);");
  });

  it("samples adaptive quality in bounded bursts instead of owning a perpetual RAF", () => {
    const adaptive = source("src/components/tabletop/tabletop-adaptive-performance-bridge.tsx");
    expect(adaptive).toContain("const SAMPLE_WINDOW_MS = 1600");
    expect(adaptive).toContain("const IDLE_BETWEEN_SAMPLES_MS = 6500");
    expect(adaptive).toContain("scheduleSample(ACTIVE_RESAMPLE_DELAY_MS)");
    expect(adaptive).toContain('document.addEventListener("visibilitychange", onVisibilityChange)');
    expect(adaptive).not.toContain("const frame = (now: number) =>");
  });

  it("invalidates spatial streaming from scene/camera changes before rebuilding heavy visibility state", () => {
    const streaming = source("src/components/tabletop/tabletop-spatial-streaming-bridge.tsx");
    expect(streaming).toContain("if (invalidated || viewportChanged)");
    expect(streaming).toContain('window.addEventListener("tadeon-tabletop-render", onRender)');
    expect(streaming).toContain("schedule(viewportChanged ? 140 : 700)");
    expect(streaming).not.toContain("window.setTimeout(tick, 220)");
  });

  it("keeps spatial audio asleep and off the database until a scene actually has audio", () => {
    const audio = source("src/components/tabletop/tabletop-spatial-audio-bridge.tsx");
    expect(audio).toContain("const hasAudio = audioSources.length > 0");
    expect(audio).toContain("const needsOcclusion = audioSources.some");
    expect(audio).toContain('if (!sceneId || sceneId === "local-scene" || !needsOcclusion)');
    expect(audio).toContain("if (!hasAudio) return;");
    expect(audio).toContain('element.preload = "metadata"');
    expect(audio).toContain("if (!audioUnlocked || !hasAudio) return;");
  });
});
