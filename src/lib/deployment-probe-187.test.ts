import { describe, expect, it } from "vitest";

const EXPECTED_SHA = "47759a95ac097bfd4bef87f3d0c6b9af3837c0c1";
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

describe("production probe current main", () => {
  it(
    "serves the exact current main SHA",
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
