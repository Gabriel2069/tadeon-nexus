import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tabletopMediaKind } from "./tabletop-media";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Tabletop world systems v2", () => {
  it("recognizes spatial audio and GLTF assets without sending them to the 2D texture path", () => {
    expect(tabletopMediaKind("audio/mpeg", "ambience.mp3")).toBe("audio");
    expect(tabletopMediaKind("model/gltf-binary", "token.glb")).toBe("model");
    expect(tabletopMediaKind("", "https://example.invalid/model.gltf?sig=x")).toBe("model");

    const runtime = source("src/lib/tabletop/tabletop-rich-media-runtime.ts");
    expect(runtime).toContain('kind === "audio" || kind === "model"');
    expect(runtime).toContain("assetUrl: undefined");
  });

  it("keeps secret doors wall-like until the master reveals them", () => {
    const spatial = source("src/lib/tabletop/tabletop-spatial.ts");
    expect(spatial).toContain('"door_secret"');
    expect(spatial).toContain('door: ["door_closed", "door_open", "door_locked", "door_secret"]');
    expect(spatial).toContain('case "door_secret"');
    expect(spatial).toContain("blocksVision: true, blocksMovement: true");
  });

  it("persists fog audience and true polygon geometry", () => {
    const visibility = source("src/lib/tabletop/tabletop-visibility-service.ts");
    const fog = source("src/components/tabletop/tabletop-fog-geometry-bridge.tsx");
    expect(visibility).toContain('scope: "users"');
    expect(visibility).toContain('scope: "roles"');
    expect(visibility).toContain("normalizeTabletopFogAudience");
    expect(visibility).toContain("audience: normalizeTabletopFogAudience(stroke.audience)");
    expect(fog).toContain('id: "polygon"');
    expect(fog).toContain('shape: "polygon"');
    expect(fog).toContain('event.key === "Enter"');
    expect(fog).toContain('event.key === "Backspace"');
    expect(fog).toContain('roles: ["player"]');
    expect(fog).toContain('scope: "users"');
    expect(fog).toContain("Participante específico");
  });

  it("filters participant fog on the server before returning the player projection", () => {
    const edge = source("supabase/functions/tabletop-view/index.ts");
    expect(edge).toContain("function fogVisibleToParticipant");
    expect(edge).toContain("sequence_index,audience");
    expect(edge).toContain("fogVisibleToParticipant(stroke.audience, user.id, participant.role)");
    expect(edge).toContain('role === "master" || role === "co_master"');
    expect(edge).toContain("signedAsset.mimeType");
    expect(edge).not.toContain("audience: stroke.audience");
  });

  it("uses one deliberate radial instead of an automatic observer clone", () => {
    const radial = source("src/components/tabletop/tabletop-radial-actions-bridge.tsx");
    expect(radial).toContain('event.key.toLowerCase() === "q"');
    expect(radial).toContain("tadeon-radial-trigger");
    expect(radial).toContain("safeAnchor(selected)");
    expect(radial).not.toContain("MutationObserver");
  });

  it("routes radial Nexus capture back into a persistent scene/entity backlink", () => {
    const capture = source("src/components/tabletop/tabletop-nexus-capture-bridge.tsx");
    expect(capture).toContain("tadeon-tabletop-open-integration-tools");
    expect(capture).toContain("scene_id: scene.id");
    expect(capture).toContain("entity_id: entity.id");
    expect(capture).toContain("linkedKnowledgeNodeId: result.node.id");
    expect(capture).toContain('"capture-clue"');
    expect(capture).toContain('"capture-event"');
  });

  it("attenuates audio by distance, floor, structures and region absorption", () => {
    const audio = source("src/components/tabletop/tabletop-spatial-audio-bridge.tsx");
    expect(audio).toContain("createStereoPanner");
    expect(audio).toContain("soundTransmission");
    expect(audio).toContain("soundAbsorption");
    expect(audio).toContain("entity.levelId === activeLevelId");
    expect(audio).toContain("audio_radius");
  });

  it("versions DB support for secret doors, barriers, fog audience and non-retryable conflicts", () => {
    const migration = source(
      "supabase/migrations/20260816005500_tabletop_secret_doors_and_fog_audience.sql",
    );
    expect(migration).toContain("'barrier'::text");
    expect(migration).toContain("'door_secret'::text");
    expect(migration).toContain("add column if not exists audience jsonb");
    expect(migration).toContain("TABLETOP_INVALID_FOG_AUDIENCE");
    expect(migration).toContain("errcode = 'P0001'");
    expect(migration).not.toContain("serialization_failure");
  });

  it("loads expensive world systems through deferred bridges", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    expect(deferred).toContain("TabletopSpatialAudioBridge");
    expect(deferred).toContain("TabletopRadialActionsBridge");
    expect(deferred).toContain("TabletopNexusCaptureBridge");
  });
});
