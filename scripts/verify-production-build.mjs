import { pathToFileURL } from "node:url";

/** Reads only the controlled release marker, not an arbitrary SHA elsewhere in HTML. */
export function productionBuildSha(html) {
  const values = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = {};
    for (const match of tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    }
    if (attrs.name === "tadeon-build-sha") values.push(attrs.content);
  }
  // Missing or conflicting duplicate markers cannot certify a deployment.
  return values.length === 1 ? (values[0] ?? null) : null;
}

export async function verifyProductionBuild({
  url,
  sha,
  attempts = 12,
  intervalMs = 5000,
  fetchPage = fetch,
  pause = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = console.log,
}) {
  if (!/^[a-f0-9]{40}$/i.test(sha ?? "")) throw new Error("A full commit SHA is required.");
  const endpoint = new URL("/login", url);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    endpoint.searchParams.set("deploy_sha", sha);
    endpoint.searchParams.set("attempt", String(attempt));
    try {
      const response = await fetchPage(endpoint, {
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(15000),
      });
      const observed = response.ok ? productionBuildSha(await response.text()) : null;
      log(
        `Attempt ${attempt}/${attempts}: HTTP ${response.status}, build ${observed ?? "missing or ambiguous"}.`,
      );
      if (response.ok && observed === sha) {
        log(`Production confirmed at SHA ${sha}.`);
        return;
      }
    } catch (error) {
      log(`Attempt ${attempt}/${attempts}: ${error.name ?? "request error"}.`);
    }
    if (attempt < attempts) await pause(intervalMs);
  }
  throw new Error(`Public endpoint did not confirm SHA ${sha}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await verifyProductionBuild({
      url: process.env.TADEON_PUBLIC_APP_URL,
      sha: process.env.TADEON_DEPLOY_SHA,
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
