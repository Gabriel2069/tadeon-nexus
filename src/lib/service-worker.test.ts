import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker(cached?: object, response = { ok: true, clone: () => ({ copied: true }) }) {
  const handlers = new Map<string, (event: unknown) => void>();
  const put = vi.fn(async () => {});
  const fetch = vi.fn(async () => response);
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    fetch,
    self: {
      location: { origin: "https://nexus.test" },
      addEventListener: (name: string, handler: (event: unknown) => void) =>
        handlers.set(name, handler),
    },
    caches: { open: async () => ({ match: async () => cached, put }) },
  });
  const request = (path: string, method = "GET") => {
    let result: Promise<object> | undefined;
    handlers.get("fetch")!({
      request: { url: `https://nexus.test${path}`, method },
      respondWith: (promise: Promise<object>) => {
        result = promise;
      },
    });
    return result;
  };
  return { request, fetch, put };
}

describe("offline immutable assets", () => {
  it("serves a cached asset without starting a failing background network request", async () => {
    const cached = { cached: true };
    const sw = worker(cached);
    sw.fetch.mockRejectedValue(new Error("offline"));
    expect(await sw.request("/assets/app-a1b2.js")).toBe(cached);
    expect(sw.fetch).not.toHaveBeenCalled();
  });
  it("fetches and persists a successful uncached asset before returning it", async () => {
    const sw = worker();
    await sw.request("/assets/app-a1b2.js");
    expect(sw.fetch).toHaveBeenCalledTimes(1);
    expect(sw.put).toHaveBeenCalledTimes(1);
  });
  it("does not cache errors or intercept authenticated navigation and mutations", async () => {
    const sw = worker(undefined, { ok: false, clone: () => ({ copied: true }) });
    await sw.request("/assets/missing.js");
    expect(sw.put).not.toHaveBeenCalled();
    expect(sw.request("/master-panel")).toBeUndefined();
    expect(sw.request("/assets/app.js", "POST")).toBeUndefined();
  });
});
