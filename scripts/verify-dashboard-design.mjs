/** NEX-003 browser fixtures. No credentials, live backend or persisted writes.
 * Uses the same externally supplied Playwright/Chromium as the header audit.
 * Run after `npm run check`; artifacts stay outside the repository by default.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const root = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-dashboard-design");
const port = Number(process.env.NEXUS_AUDIT_PORT || 5174);
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.NEXUS_CHROMIUM_PATH, args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]") });
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
const userId = "00000000-0000-4000-8000-000000000001";
const user = { id: userId, aud: "authenticated", role: "authenticated", email: "fixture@nexus.test", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const token = [{ alg: "HS256", typ: "JWT" }, { sub: userId, aud: "authenticated", role: "authenticated", exp: 2000000000 }, "fixture"].map(x => typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")).join(".");
const sheets = Array.from({ length: 5 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`, owner_id: userId, name: i === 0 ? "A guardiã dos vestígios que permaneceram além do último limiar" : `Personagem de exemplo ${i + 1}`, occupation: "Leitora de vestígios", exposure: i * 5 }));
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  await new Promise((ok, fail) => {
    server.stdout.on("data", b => { if (b.toString().includes("Local:")) ok(); });
    server.on("exit", code => fail(new Error("Vite exited: " + code)));
    setTimeout(() => fail(new Error("Vite timeout")), 30000).unref();
  });
  for (const width of [320, 390, 820, 1440]) for (const state of ["empty", "loading", "error", "populated"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    let currentState = state, release;
    await page.addInitScript(({ user, token }) => localStorage.setItem("sb-nkxpstyfrzufsnowjrdi-auth-token", JSON.stringify({ access_token: token, refresh_token: "fixture", token_type: "bearer", expires_in: 86400, expires_at: 2000000000, user })), { user, token });
    await page.route("**/*.supabase.co/**", async route => {
      const url = new URL(route.request().url());
      let body = [], status = 200;
      if (url.pathname.endsWith("/user")) body = user;
      else if (url.pathname.includes("/character_sheets")) {
        assert(route.request().method() === "GET", "Fixture must not persist mutations");
        if (currentState === "loading") await new Promise(ok => { release = ok; });
        if (currentState === "error") { status = 500; body = { message: "Fixture read failed", code: "fixture" }; }
        else body = currentState === "populated" ? sheets : [];
      } else if (url.pathname.includes("/profiles")) body = [{ id: userId, email: user.email, full_name: "Tadeu de exemplo" }];
      else if (url.pathname.includes("/user_roles")) body = [{ user_id: userId, role: "mestre" }];
      else if (url.pathname.includes("/feature_flags")) body = [{ key: "nexus_tabletop_enabled", enabled: true }, { key: "nexus_knowledge_enabled", enabled: true }];
      if (Array.isArray(body) && route.request().headers().accept?.includes("vnd.pgrst.object")) body = body[0] || null;
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.route("**/_serverFn/**", r => r.fulfill({ status: 503, contentType: "application/json", body: '{}' }));
    if (process.env.NEXUS_FONT_FIXTURES) {
      const dir = process.env.NEXUS_FONT_FIXTURES;
      const faces = [["EB Garamond",500,0],["EB Garamond",600,1],["Inter",400,2],["Inter",500,3],["Inter",600,4],["PT Mono",400,5]].map(([family,weight,index]) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/ttf;base64,${readFileSync(`${dir}/font-${index}.ttf`).toString("base64")}) format("truetype");font-display:swap}`).join("\n");
      await page.route("https://fonts.googleapis.com/**", r => r.fulfill({contentType:"text/css",body:faces}));
    }
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.locator(".tadeon-continuity-hero").waitFor();
    if (state === "loading") await page.getByText("Reunindo os fios do arquivo…").waitFor();
    else if (state === "error") await page.getByText("O arquivo não pôde ser carregado.").waitFor();
    else if (state === "empty") await page.getByText("O arquivo ainda está vazio.").waitFor();
    else await page.locator(".tadeon-character-card").first().waitFor();
    await page.evaluate(async () => {
      await Promise.all(['500 16px "EB Garamond"','400 16px "Inter"','400 16px "PT Mono"'].map(f=>document.fonts.load(f)));
      await document.fonts.ready;
    });
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, h1: document.querySelectorAll("h1").length, main: document.querySelectorAll("main").length, cards: document.querySelectorAll(".tadeon-character-card").length, facts: Array.from(document.querySelectorAll(".tadeon-continuity-facts dd:not(.tadeon-continuity-facts__detail)")).map(e => e.textContent), headingFont: getComputedStyle(document.querySelector("#continuity-title")).fontFamily, navAfter: (() => { const s=getComputedStyle(document.querySelector(".tadeon-nav-item[aria-current]"),"::after"); return {width:s.width,height:s.height,inset:s.inset,background:s.background,zIndex:s.zIndex}; })(), fontsLoaded: ['EB Garamond','Inter','PT Mono'].map(f => ({family:f,loaded:document.fonts.check(`${f === "EB Garamond" ? 500 : 400} 16px "${f}"`)})), navContrast: (()=>{const n=document.querySelector(".tadeon-nav-item[aria-current]");return {color:getComputedStyle(n).color,base:getComputedStyle(n).getPropertyValue("--sidebar-accent").trim()};})(), heroHeight: document.querySelector(".tadeon-continuity-hero").getBoundingClientRect().height }));
    assert(!metrics.overflow && metrics.h1 === 1 && metrics.main === 1 && errors.length === 0, `${width}/${state}: structure or overflow failure`);
    assert(metrics.headingFont.includes("EB Garamond"), "Editorial heading must preserve its approved family");
    assert(metrics.navContrast.base === "#1c2026", "Navigation surface must not inherit its text accent");
    if (process.env.NEXUS_FONT_FIXTURES) assert(metrics.fontsLoaded.every(f=>f.loaded), "Font fixtures must load");
    if (state === "populated") assert(metrics.facts.join() === "05,05,20" && metrics.cards === 5, "Metrics must use query data");
    if (state === "error" || state === "loading") assert(metrics.facts.every(x => x === "--"), "Unknown counts must not appear as zero");
    await page.screenshot({ path: `${root}/${state}-${width}.png`, fullPage: true });
    if (state === "error") {
      currentState = "populated";
      await page.getByRole("button", { name: "Tentar novamente" }).click();
      await page.locator(".tadeon-character-card").first().waitFor();
      assert(await page.locator(".tadeon-character-card").count() === 5, "Retry must recover the archive");
    }
    if (state === "loading") { currentState = "empty"; release(); }
    if (state === "populated") {
      assert(await page.locator(".tadeon-nav-item > .tadeon-pointer-sheen").count() === 0, "Navigation must own its light layer");
      const trigger = page.getByRole("button", { name: "Nova ficha" });
      await trigger.focus(); await page.keyboard.press("Enter");
      await page.getByLabel("Nome da personagem").waitFor();
      await page.keyboard.press("Escape");
      assert(await trigger.evaluate(e => document.activeElement === e), "Create dialog must return focus");
      await page.getByRole("button", { name: /Excluir ficha/ }).first().click();
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      assert(await page.locator(".tadeon-character-card").count() === 5, "Cancel must preserve cards");
      if (width === 1440) {
        await page.getByRole("button", { name: "Recolher menu" }).click();
        await page.getByRole("button", { name: "Expandir menu" }).click();
      }
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.locator(".tadeon-continuity-hero a").hover();
      const moving = await page.locator(".tadeon-continuity-hero__weave").evaluate(e => getComputedStyle(e).transitionDuration);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok))));
      const reduced = await page.locator(".tadeon-continuity-hero__weave").evaluate(e => ({ duration: getComputedStyle(e).transitionDuration, transform: getComputedStyle(e).transform }));
      assert(parseFloat(reduced.duration) <= .001 && reduced.transform === "none", `Reduced motion must settle immediately: ${JSON.stringify(reduced)}`);
      metrics.motion = { moving, reduced };
    }
    results.push({ width, state, ...metrics, errors });
    await context.close();
  }
  writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  try { process.kill(-server.pid, "SIGTERM"); } catch { /* already stopped */ }
}
