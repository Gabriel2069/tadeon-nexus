import { describe, expect, it } from "vitest";

const EXPECTED_SHA = "bbc741a3d180b8b1edc6e976394007f6ed867f55";
const LOGIN_URL = "https://tadeon-nexus.gtadeusz.workers.dev/login";

describe("production SHA probe bbc741a3", () => {
  it(
    "serves the exact approved main SHA from the public Worker",
    async () => {
      const response = await fetch(LOGIN_URL, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
        headers: { "user-agent": "tadeon-production-sha-probe/1.0" },
      });
      expect(response.ok).toBe(true);
      const html = await response.text();
      expect(html).toContain('name="tadeon-build-sha"');
      expect(html).toContain(EXPECTED_SHA);
    },
    20_000,
  );
});
