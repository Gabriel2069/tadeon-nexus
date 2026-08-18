import { describe, expect, it } from "vitest";

const EXPECTED_SHA = "aa7306d1eb2547689921fc50585ce0e146fe14f9";
const TARGET = "https://tadeon-nexus.gtadeusz.workers.dev/login";

async function fetchProduction() {
  const response = await fetch(`${TARGET}?probe=${Date.now()}`, {
    headers: {
      "cache-control": "no-cache, no-store, max-age=0",
      pragma: "no-cache",
    },
  });
  expect(response.ok).toBe(true);
  return response.text();
}

describe("production probe 178", () => {
  it(
    "serves the exact merged SHA",
    async () => {
      let page = "";
      for (let attempt = 0; attempt < 20; attempt += 1) {
        page = await fetchProduction();
        if (page.includes(EXPECTED_SHA)) break;
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }
      expect(page).toContain('name="tadeon-build-sha"');
      expect(page).toContain(EXPECTED_SHA);
    },
    110_000,
  );
});
