import { installDesignFonts } from "./design-font-fixtures.mjs";
/** NEX-003 browser fixtures. No credentials, live backend or persisted writes.
 * Uses the same externally supplied Playwright/Chromium as the header audit.
 * Run after `npm run check`; artifacts stay outside the repository by default.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const root = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-dashboard-design");
const port = Number(process.env.NEXUS_AUDIT_PORT || 5174);
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.NEXUS_CHROMIUM_PATH, args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]") });
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
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
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]")) for (const state of JSON.parse(process.env.NEXUS_AUDIT_STATES || '["empty","loading","error","populated"]')) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 768, reducedMotion: "reduce" });
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
    await installDesignFonts(page);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
    await page.locator(".tadeon-continuity-hero").waitFor();
    if (state === "loading") await page.getByText("Reunindo os fios do arquivo…").waitFor();
    else if (state === "error") await page.getByText("O arquivo não pôde ser carregado.").waitFor();
    else if (state === "empty") await page.getByText("O arquivo ainda está vazio.").waitFor();
    else await page.locator(".tadeon-character-card").first().waitFor();
    await page.evaluate(async () => {
      await Promise.all(['500 16px "Cormorant Garamond"','italic 500 16px "Cormorant Garamond"','400 16px "Inter"','500 16px "Inter"','400 16px "PT Mono"'].map(f=>document.fonts.load(f)));
      await document.fonts.ready;
    });
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, h1: document.querySelectorAll("h1").length, main: document.querySelectorAll("main").length, cards: document.querySelectorAll(".tadeon-character-card").length, facts: Array.from(document.querySelectorAll(".tadeon-continuity-facts dd:not(.tadeon-continuity-facts__detail)")).map(e => e.textContent), headingFont: getComputedStyle(document.querySelector("#continuity-title")).fontFamily, metricFont: getComputedStyle(document.querySelector(".tadeon-continuity-facts dd")).fontFamily, metricFigures: getComputedStyle(document.querySelector(".tadeon-continuity-facts dd")).fontVariantNumeric, dock: (() => { const n=document.querySelector(".tadeon-mobile-dock"); if(!n)return null;const s=getComputedStyle(n);return {shadow:s.boxShadow,border:s.border,bottomBorder:s.borderBottom,outline:s.outline,filter:s.filter,animation:s.animationName}; })(), navAfter: (() => { const s=getComputedStyle(document.querySelector(".tadeon-nav-item[aria-current]"),"::after"); return {width:s.width,height:s.height,inset:s.inset,background:s.background,zIndex:s.zIndex}; })(), fontsLoaded: ['Cormorant Garamond','Inter','PT Mono'].map(f => ({family:f,loaded:document.fonts.check(`${f === "Cormorant Garamond" ? 500 : 400} 16px "${f}"`)})), navContrast: (()=>{const n=document.querySelector(".tadeon-nav-item[aria-current]");return {color:getComputedStyle(n).color,base:getComputedStyle(n).getPropertyValue("--sidebar-accent").trim()};})(), heroHeight: document.querySelector(".tadeon-continuity-hero").getBoundingClientRect().height }));
    assert(!metrics.overflow && metrics.h1 === 1 && metrics.main === 1 && errors.length === 0, `${width}/${state}: structure or overflow failure`);
    assert(metrics.metricFont.includes("Inter") && metrics.metricFigures.includes("tabular-nums"), "Dashboard metrics use readable aligned figures");
    assert(metrics.headingFont.includes("Cormorant Garamond"), "Editorial heading must preserve its approved family");
    assert(metrics.navContrast.color === "rgb(233, 227, 213)", "Navigation label stays ivory while the symbol carries the section color");
    assert(metrics.navContrast.base === "#1c2026", "Navigation surface must not inherit its text accent");
    if (process.env.NEXUS_FONT_FIXTURES) assert(metrics.fontsLoaded.every(f=>f.loaded), `Font fixtures must load: ${JSON.stringify(metrics.fontsLoaded)}`);
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
      if (width < 768) {
        const opener = page.getByRole("button", { name: "Abrir menu", exact: true });
        await opener.focus(); await page.keyboard.press("Enter");
        const drawer = page.getByRole("dialog", { name: "Navegação principal" });
        await drawer.waitFor();
        assert(await drawer.evaluate(e => e.contains(document.activeElement)), "Drawer must contain opening focus");
        await page.keyboard.press("Escape"); await drawer.waitFor({state:"hidden"});
        assert(await opener.evaluate(e => document.activeElement === e), "Drawer must return focus");
        const more = page.getByRole("button", { name: "Mais", exact: true });
        await more.focus(); await page.keyboard.press("Enter");
        const menu = page.getByRole("menu", { name: "Outras áreas" });
        await menu.waitFor();
        await page.keyboard.press("ArrowDown");
        assert(await menu.evaluate(e => e.contains(document.activeElement)), "Menu arrow focus must stay inside");
        const menuRect = await menu.boundingBox();
        assert(menuRect.x >= 0 && menuRect.x + menuRect.width <= width && menuRect.y >= 0, "More menu must fit viewport");
        const targets = await menu.getByRole("menuitem").evaluateAll(es => es.map(e => {const r=e.getBoundingClientRect();return {w:r.width,h:r.height};}));
        assert(targets.every(t => t.w >= 44 && t.h >= 44), "More menu targets must be at least 44px");
        await page.screenshot({path:`${root}/more-${width}.png`,fullPage:true});
        await page.keyboard.press("Escape"); await menu.waitFor({state:"hidden"});
        assert(await more.evaluate(e => document.activeElement === e), "More menu must return focus");
        await opener.tap(); await drawer.waitFor();
        await drawer.getByRole("button",{name:"Conta",exact:true}).click();
        const account = page.getByRole("dialog",{name:"Configurações da Conta"});
        await account.waitFor(); await drawer.waitFor({state:"hidden"});
        await page.waitForTimeout(300);
        assert(await account.evaluate(e => e.contains(document.activeElement)), "Drawer must not steal account focus");
        await page.screenshot({path:`${root}/account-${width}.png`,fullPage:true});
        await page.keyboard.press("Escape"); await account.waitFor({state:"hidden"});
        const accountTrigger = page.locator(".tadeon-mobile-header").getByRole("button",{name:"Conta",exact:true});
        assert(await accountTrigger.evaluate(e => document.activeElement === e), "Account handoff must return to persistent header control");
        await more.tap(); await menu.waitFor();
        await menu.getByRole("menuitem",{name:"Consulta offline",exact:true}).focus();
        await page.keyboard.press("Enter"); await page.waitForURL("**/offline");
        await menu.waitFor({state:"hidden"});
        await page.getByRole("heading",{name:"Consulta offline",exact:true}).waitFor();
        await page.waitForTimeout(250);
        assert(await page.locator("#tadeon-main").evaluate(e => document.activeElement === e), "Route selection must focus main, not retired menu");
        await page.getByRole("link",{name:"Início",exact:true}).tap();
        await page.locator(".tadeon-continuity-hero").waitFor();
        await page.getByRole("button",{name:"Mais",exact:true}).tap(); await menu.waitFor();
        await page.setViewportSize({width:820,height:1000});
        await menu.waitFor({state:"hidden"});
        assert(await page.locator("#tadeon-main").evaluate(e => document.activeElement === e), "Desktop transition must close more and focus main");
        await page.setViewportSize({width,height:1000});
        metrics.navigation = { menuRect, targets, drawerFocus:true, moreReturn:true, accountHandoff:true, accountReturn:true, touchOpening:true, routeMainFocus:true, desktopTransition:true };
      }
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.locator(".tadeon-continuity-hero a").hover();
      const moving = await page.locator(".tadeon-continuity-hero__weave").evaluate(e => getComputedStyle(e).transitionDuration);
      if (width === 1440) {
        const card = page.locator(".tadeon-character-card").first();
        const before = await card.locator("h3").boundingBox();
        await card.hover({ position: { x: 100, y: 90 } });
        await page.waitForFunction(() => { const e=document.querySelector(".tadeon-character-card"); return e?.style.getPropertyValue("--material-x") && Number(getComputedStyle(e,"::before").opacity) >= .8; });
        const light = await card.evaluate(e=>({x:e.style.getPropertyValue("--material-x"),opacity:getComputedStyle(e,"::before").opacity,hover:e.matches(":hover"),fine:matchMedia("(hover:hover) and (pointer:fine)").matches}));
        const after = await card.locator("h3").boundingBox();
        assert(light.x !== "" && Number(light.opacity) >= .8, `Card reflection must respond to the pointer: ${JSON.stringify(light)}`);
        assert(Math.abs(before.x-after.x)<.1 && Math.abs(before.y-after.y)<.1, "Card content stays stable during reflection");
        await page.screenshot({path:`${root}/interaction-1440.png`,fullPage:true});
        const nav = await page.locator(".tadeon-nav-item[aria-current]").evaluate(e=>({before:getComputedStyle(e,"::before").content,background:getComputedStyle(e).backgroundImage}));
        assert(nav.before === "none", "Navigation has no competing light plane");
        metrics.material = {light, stableText:true, nav};
      }
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
