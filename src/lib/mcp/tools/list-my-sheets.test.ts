import { beforeEach, expect, it, vi } from "vitest";
import { newTdvCharacter, addMilestone, finishCreation } from "@/lib/tdv2";
import type { ToolContext } from "@lovable.dev/mcp-js";
const fixture = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  client: vi.fn(),
  order: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    fixture.client(...args);
    return { from: () => ({ select: () => ({ order: fixture.order }) }) };
  },
}));
import tool from "./list-my-sheets";
const context = {
  isAuthenticated: () => true,
  getToken: () => "caller-fixture-token",
} as unknown as ToolContext;
beforeEach(() => {
  fixture.rows = [];
  fixture.client.mockClear();
  fixture.order.mockImplementation(async () => ({ data: fixture.rows, error: null }));
});
it("returns edition-specific progress without leaking the character payload or applying legacy Rank", async () => {
  let c = newTdvCharacter();
  Object.assign(c.face, {
    origin: "Cais",
    occupation: "Registradora",
    conviction: "Preservar",
    limit: "Não entregar inocentes",
  });
  c.face.anchor.detail = "A promessa";
  Object.assign(c.face.links[0], { node: "Elen", nature: "Confiança" });
  c = finishCreation(c);
  c = addMilestone(c, "O arquivo", "Mudança reconhecida");
  c.notes = "SEGREDO";
  fixture.rows = [
    { id: "v1", name: "Anterior", owner_id: "owner", rules_version: 1, exposure: 35 },
    { id: "v2", name: "Atual", owner_id: "owner", rules_version: 2, exposure: 95, tdv2_data: c },
  ];
  const result = await tool.handler({}, context);
  expect(result.structuredContent?.sheets).toEqual([
    { id: "v1", name: "Anterior", owner_id: "owner", rules_version: 1, exposure: 35 },
    { id: "v2", name: "Atual", owner_id: "owner", rules_version: 2, development: 5 },
  ]);
  expect(JSON.stringify(result)).not.toContain("SEGREDO");
  expect(fixture.client.mock.calls[0][2].global.headers.Authorization).toBe(
    "Bearer caller-fixture-token",
  );
});
it("does not query without authentication and flags malformed versioned data for review", async () => {
  const denied = await tool.handler({}, {
    ...context,
    isAuthenticated: () => false,
  } as ToolContext);
  expect(denied.isError).toBe(true);
  expect(fixture.client).not.toHaveBeenCalled();
  fixture.rows = [
    {
      id: "bad",
      name: "Revisar",
      owner_id: "owner",
      rules_version: 2,
      tdv2_data: {},
      exposure: 99,
    },
  ];
  const result = await tool.handler({}, context);
  expect(result.structuredContent?.sheets).toEqual([
    { id: "bad", name: "Revisar", owner_id: "owner", rules_version: 2, requires_review: true },
  ]);
});
