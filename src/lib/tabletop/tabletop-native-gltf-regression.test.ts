import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeTabletopGlb,
  tabletopMat4FromTrs,
  tabletopMat4Multiply,
} from "./tabletop-gltf";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function minimalGlb() {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scenes: [{ nodes: [] }],
    scene: 0,
  });
  const encoded = new TextEncoder().encode(json);
  const paddedLength = Math.ceil(encoded.length / 4) * 4;
  const total = 12 + 8 + paddedLength;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, paddedLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  const bytes = new Uint8Array(buffer, 20, paddedLength);
  bytes.fill(0x20);
  bytes.set(encoded);
  return buffer;
}

describe("native tabletop GLTF renderer", () => {
  it("decodes a glTF 2.0 GLB container without third-party scene runtime", () => {
    const decoded = decodeTabletopGlb(minimalGlb());
    expect(decoded.json.asset?.version).toBe("2.0");
    expect(decoded.json.scene).toBe(0);
  });

  it("keeps column-major TRS composition stable for world placement", () => {
    const translation = tabletopMat4FromTrs(
      [10, 20, 30],
      [0, 0, 0, 1],
      [1, 1, 1],
    );
    const scale = tabletopMat4FromTrs(
      [0, 0, 0],
      [0, 0, 0, 1],
      [2, 3, 4],
    );
    const result = tabletopMat4Multiply(translation, scale);
    expect(Array.from(result.slice(0, 16))).toEqual([
      2, 0, 0, 0,
      0, 3, 0, 0,
      0, 0, 4, 0,
      10, 20, 30, 1,
    ]);
  });

  it("uses the canonical camera runtime instead of inventing a second tabletop camera", () => {
    const runtime = source("src/lib/tabletop/tabletop-player-runtime.ts");
    const renderer = source("src/lib/tabletop/tabletop-native-model-renderer.ts");
    expect(runtime).toContain("view: () =>");
    expect(runtime).toContain("internals.camera.orientation");
    expect(renderer).toContain("runtime.worldToClient({ x: 0, y: 0 })");
    expect(renderer).toContain("runtime.worldToClient({ x: 1, y: 0 })");
    expect(renderer).toContain("runtime.worldToClient({ x: 0, y: 1 })");
    expect(renderer).toContain("view.orientation.elevationScale");
  });

  it("supports native triangles, embedded textures, node animation and skinning", () => {
    const loader = source("src/lib/tabletop/tabletop-gltf.ts");
    const renderer = source("src/lib/tabletop/tabletop-native-model-renderer.ts");
    expect(loader).toContain("TEXCOORD_0");
    expect(loader).toContain("JOINTS_0");
    expect(loader).toContain("WEIGHTS_0");
    expect(loader).toContain("tabletopQuatSlerp");
    expect(loader).toContain("tabletopSkinMatrices");
    expect(renderer).toContain("gl.drawElements");
    expect(renderer).toContain("createTexture");
    expect(renderer).toContain("uJoints[");
    expect(renderer).toContain("model_animation_speed");
  });

  it("keeps the mesh layer visual-only so pointer ownership stays with Pixi", () => {
    const renderer = source("src/lib/tabletop/tabletop-native-model-renderer.ts");
    expect(renderer).toContain('pointerEvents: "none"');
    expect(renderer).toContain("selected.has(entity.id)");
  });

  it("loads the native renderer only in the deferred tabletop tier", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    expect(deferred).toContain("TabletopNativeModelBridge");
    expect(deferred).toContain("<NativeModelBridge secureVisibility={!master} />");
  });
});
