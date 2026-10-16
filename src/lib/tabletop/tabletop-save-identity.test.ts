import "./tabletop-grid-origin-runtime";
import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TabletopPersistenceService } from "./tabletop-persistence-service";
import { TabletopViewPreferenceService } from "./tabletop-view-preference-service";
import {
  TabletopVisibilityService,
  createEmptyVisibilityState,
} from "./tabletop-visibility-service";
const auth = {
  getSession: vi.fn(async () => ({
    data: { session: { user: { id: "second-account" } } },
    error: null,
  })),
} as unknown as SupabaseClient["auth"];
it("does not submit an old scene draft under the next signed-in account", async () => {
  const rpc = vi.fn(),
    database = { rpc } as unknown as SupabaseClient;
  const service = new TabletopPersistenceService(database, auth);
  await expect(
    service.saveWorkspace(undefined as never, undefined as never, {}, "first-account"),
  ).rejects.toMatchObject({ code: "TABLETOP_AUTH_REQUIRED" });
  expect(rpc).not.toHaveBeenCalled();
});
it("does not submit an old environment preview under the next account", async () => {
  const rpc = vi.fn(),
    database = { rpc } as unknown as SupabaseClient;
  const service = new TabletopVisibilityService(database, auth);
  await expect(
    service.save("scene", createEmptyVisibilityState(), "first-account"),
  ).rejects.toMatchObject({ code: "TABLETOP_VISIBILITY_FORBIDDEN" });
  expect(rpc).not.toHaveBeenCalled();
});
it("does not attribute a deferred camera preference to the next account", async () => {
  const from = vi.fn(),
    database = { from } as unknown as SupabaseClient;
  const service = new TabletopViewPreferenceService(database, auth);
  await expect(service.save("scene", undefined as never, "first-account")).rejects.toThrow(
    "TABLETOP_VIEW_PREFERENCE_ERROR",
  );
  expect(from).not.toHaveBeenCalled();
});
