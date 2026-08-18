import { describe, expect, it } from "vitest";

const EXPECTED_SHA = "e64e0fe821d10d58c7b3e7bb8a33a4e42e47340b";
const URL = "https://tadeon-nexus.gtadeusz.workers.dev/login";

async function fetchProduction() {
  const response = await fetch(`${URL}?deploy-probe=${Date.now()}`, {
    headers: { "cache-control": "no-cache" },
  });
  expect(response.ok).toBe(true);
  return response.text();
}

describe("production probe 170", () => {
  it(
    "serves the exact merged SHA",
    async () => {
      let page = "";
      for (let attempt = 0; attempt < 18; attempt += 1) {
        page = await fetchProduction();
        if (page.includes(EXPECTED_SHA)) break;
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }
      expect(page).toContain('name="tadeon-build-sha"');
      expect(page).toContain(EXPECTED_SHA);
    },
    100_000,
  );
});
