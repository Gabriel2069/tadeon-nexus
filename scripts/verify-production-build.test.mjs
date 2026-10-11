import { expect, it, vi } from "vitest";
import { productionBuildSha, verifyProductionBuild } from "./verify-production-build.mjs";
const sha = "a".repeat(40),
  old = "b".repeat(40);
const marker = (value) => `<meta name="tadeon-build-sha" content="${value}">`;
const response = (html, status = 200) => ({ ok: status === 200, status, text: async () => html });
it("reads large multiline documents without a short-lived grep pipeline", () => {
  expect(productionBuildSha(marker(sha) + "\n" + "large body\n".repeat(30000))).toBe(sha);
});
it("handles attribute order, quoting and spacing", () => {
  expect(productionBuildSha(`<META content = '${sha}' NAME='tadeon-build-sha'/>`)).toBe(sha);
});
it("rejects missing and ambiguous markers and ignores lookalike attributes", () => {
  expect(productionBuildSha(`<meta data-name="tadeon-build-sha" content="${sha}">`)).toBeNull();
  expect(productionBuildSha(marker(sha) + marker(old))).toBeNull();
  expect(productionBuildSha(`<meta name="tadeon-build-sha">`)).toBeNull();
});
it("does not certify a SHA found outside its release marker", async () => {
  const fetchPage = vi.fn().mockResolvedValue(response(marker(old) + sha));
  await expect(
    verifyProductionBuild({
      url: "https://example.test",
      sha,
      attempts: 1,
      fetchPage,
      log: vi.fn(),
    }),
  ).rejects.toThrow("did not confirm");
});
it("retries bounded propagation and reports the matching marker", async () => {
  const fetchPage = vi
    .fn()
    .mockResolvedValueOnce(response(marker(old)))
    .mockResolvedValueOnce(response(marker(sha)));
  const pause = vi.fn(),
    log = vi.fn();
  await verifyProductionBuild({
    url: "https://example.test",
    sha,
    attempts: 2,
    fetchPage,
    pause,
    log,
  });
  expect(fetchPage).toHaveBeenCalledTimes(2);
  expect(pause).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenLastCalledWith(`Production confirmed at SHA ${sha}.`);
  expect(String(fetchPage.mock.calls[1][0])).toContain(`deploy_sha=${sha}`);
});
it("keeps network and HTTP failures closed and never accepts an error body", async () => {
  const fetchPage = vi
    .fn()
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(response(marker(sha), 503));
  const pause = vi.fn();
  await expect(
    verifyProductionBuild({
      url: "https://example.test",
      sha,
      attempts: 2,
      fetchPage,
      pause,
      log: vi.fn(),
    }),
  ).rejects.toThrow("did not confirm");
  expect(fetchPage).toHaveBeenCalledTimes(2);
  expect(pause).toHaveBeenCalledTimes(1);
});
it("rejects a malformed expected SHA before making any request", async () => {
  const fetchPage = vi.fn();
  await expect(
    verifyProductionBuild({ url: "https://example.test", sha: "short", fetchPage }),
  ).rejects.toThrow("full commit SHA");
  expect(fetchPage).not.toHaveBeenCalled();
});
