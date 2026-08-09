import { describe, expect, it, vi } from "vitest";
import {
  loadOfficialKnowledgePack,
  type OfficialKnowledgePack,
} from "./official-knowledge-packs";

const TEST_PACK: OfficialKnowledgePack = {
  id: "test-pack",
  title: "Pacote de teste",
  eyebrow: "Fixture",
  description: "Fixture mínima.",
  assetPath: "/test-pack.zip",
  fileName: "test-pack.zip",
  pages: 1,
  relations: 0,
  expectedBytes: 3,
  sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
};

describe("official knowledge packs", () => {
  it("loads a versioned pack only when size and SHA-256 match", async () => {
    const fetcher = vi.fn(async () =>
      Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
    );

    const file = await loadOfficialKnowledgePack(TEST_PACK, fetcher);

    expect(fetcher).toHaveBeenCalledWith(TEST_PACK.assetPath, {
      cache: "no-store",
    });
    expect(file.name).toBe(TEST_PACK.fileName);
    expect(file.type).toBe("application/zip");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  it("rejects a missing or corrupted official pack", async () => {
    await expect(
      loadOfficialKnowledgePack(
        TEST_PACK,
        vi.fn(async () => new Response(null, { status: 404 })),
      ),
    ).rejects.toThrow("KNOWLEDGE_OFFICIAL_PACK_LOAD_FAILED");

    await expect(
      loadOfficialKnowledgePack(
        TEST_PACK,
        vi.fn(async () => new Response(new Uint8Array([1, 2]))),
      ),
    ).rejects.toThrow("KNOWLEDGE_OFFICIAL_PACK_INTEGRITY_FAILED");
  });
});
