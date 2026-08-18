import { describe, expect, it } from "vitest";

const EXPECTED_SHA = "ac609efe95366f32ef9b3e03f0ffc2fa58f00d93";
const PUBLIC_LOGIN = "https://tadeon-nexus.gtadeusz.workers.dev/login";

async function readProduction() {
  const response = await fetch(PUBLIC_LOGIN, { redirect: "follow" });
  if (!response.ok) return "";
  return response.text();
}

describe("production probe 168", () => {
  it(
    "serves the exact merged SHA",
    async () => {
      let page = "";
      for (let attempt = 0; attempt < 12; attempt += 1) {
        page = await readProduction();
        if (page.includes(EXPECTED_SHA) && page.includes('name="tadeon-build-sha"')) break;
        await new Promise((resolve) => setTimeout(resolve, 5_000));
      }
      expect(page).toContain('name="tadeon-build-sha"');
      expect(page).toContain(EXPECTED_SHA);
    },
    75_000,
  );
});
