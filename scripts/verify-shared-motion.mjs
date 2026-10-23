/** Shared motion lab: read-only client fixtures, real primitives, no live writes.
 * Counts geometry work under fixed input; timings are CSS contracts, not INP/FPS.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { installDesignFonts } from "./design-font-fixtures.mjs";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const baseline = process.argv.includes("baseline");
const repo = resolve(process.env.NEXUS_AUDIT_REPO || ".");
const output = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-shared-motion");
const port = Number(process.env.NEXUS_AUDIT_PORT || 5188);
mkdirSync(output, { recursive: true });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)], { cwd: repo, detached: true, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "", browser;
server.stdout.on("data", data => { serverLog = (serverLog + data).slice(-8000); });
server.stderr.on("data", data => { serverLog = (serverLog + data).slice(-8000); });
const rows = [];
const id = "00000000-0000-4000-8000-000000000001";
const user = { id, email: "fixture@nexus.test", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01" };
const token = [{ alg: "HS256", typ: "JWT" }, { sub: id, aud: "authenticated", role: "authenticated", exp: 2000000000 }, "fixture"].map(x => typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")).join(".");
try {
  let ready = false;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try { ready = (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(3000) })).status < 500; } catch { /* compiling */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  assert(ready, `Vite readiness: ${serverLog}`);
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]")) {
    browser = await chromium.launch({ executablePath: process.env.NEXUS_CHROMIUM_PATH, args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]") });
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: width < 768, reducedMotion: "no-preference" });
    const setMotion = async reducedMotion => {
      await page.emulateMedia({ reducedMotion });
      // CDP updates matching before delivering MediaQueryList change events.
      // Let the browser apply that change before asserting React presence.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(({ user, token }) => localStorage.setItem("sb-nkxpstyfrzufsnowjrdi-auth-token", JSON.stringify({ access_token: token, refresh_token: "fixture", expires_at: 2000000000, user })), { user, token });
    await page.route("**/*.supabase.co/**", async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      assert(request.method() === "GET" || path.includes("/auth/"), `Unexpected write: ${path}`);
      let body = [];
      if (path.endsWith("/user")) body = user;
      else if (path.includes("/profiles")) body = [{ id, email: user.email, full_name: "Conta de teste" }];
      else if (path.includes("/user_roles")) body = [{ user_id: id, role: "mestre" }];
      else if (path.includes("/feature_flags")) body = [{ key: "nexus_knowledge_enabled", enabled: true }, { key: "nexus_tabletop_enabled", enabled: true }];
      if (Array.isArray(body) && request.headers().accept?.includes("vnd.pgrst.object")) body = body[0] || null;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.route("**/_serverFn/**", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    await installDesignFonts(page);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.locator(".tadeon-continuity-hero").waitFor();
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.waitForTimeout(800);
    const measureScroll = () => page.evaluate(async () => {
      const frame = document.querySelector("#tadeon-main .tadeon-page");
      const original = frame.getBoundingClientRect;
      let reads = 0;
      frame.getBoundingClientRect = function () { reads++; return original.call(this); };
      try {
        for (let i = 0; i < 12; i++) {
          document.getElementById("tadeon-main").dispatchEvent(new Event("scroll"));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
      } finally { frame.getBoundingClientRect = original; }
      return { events: 12, frameReads: reads };
    });
    const closedScroll = await measureScroll();
    if (!baseline) assert(closedScroll.frameReads === 0, `Closed popup geometry: ${JSON.stringify(closedScroll)}`);
    const sampleMotion = selector => page.locator(selector).evaluate(element => ({
      animation: getComputedStyle(element).animationName,
      duration: getComputedStyle(element).animationDuration,
      keyframes: element.getAnimations().flatMap(animation => animation.effect.getKeyframes()),
    }));
    const account = page.getByRole("button", { name: width < 768 ? "Conta" : "Abrir configurações da conta", exact: true });
    await account.click();
    const dialog = page.locator('[data-slot="dialog-content"]');
    await dialog.waitFor();
    const backdrop = await sampleMotion('[data-slot="dialog-overlay"][data-state="open"]');
    if (!baseline) {
      assert(backdrop.animation === "tadeon-backdrop-in", "Backdrop has one motion owner");
      assert(!backdrop.keyframes.some(frame => "filter" in frame || "backdropFilter" in frame), "Backdrop must animate only opacity");
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/${width}-account.png` });
    const openScroll = await measureScroll();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert(await account.evaluate(element => element === document.activeElement), "Account focus return");
    // Reopen during the exit, without Playwright waiting for a settled overlay.
    await account.click();
    await page.keyboard.press("Escape");
    await account.evaluate(element => element.click());
    await dialog.waitFor();
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    await page.locator('[data-motion-surface="backdrop"]').waitFor({ state: "detached", timeout: 1000 });
    // A Select inside a dialog exercises nested portals, keyboard and motion owner.
    await page.getByRole("button", { name: "Nova ficha", exact: true }).click();
    const select = page.getByRole("combobox");
    await page.waitForTimeout(350);
    const selectPointerReachable = await select.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    });
    if (baseline && !selectPointerReachable) {
      // Record the existing touch-target defect, then inspect the same menu by keyboard.
      await select.focus();
      await page.keyboard.press("Space");
    } else {
      assert(selectPointerReachable, "Another control intercepts the Select trigger");
      await select.click();
    }
    const menu = await sampleMotion('[data-slot="select-content"]');
    if (!baseline) assert(menu.animation === "tadeon-popup-anchored-in", `Select owner: ${menu.animation}`);
    await page.keyboard.press("Escape");
    await page.locator('[data-slot="select-content"]').waitFor({ state: "detached" });
    assert(await select.evaluate(element => element === document.activeElement), "Select focus return");
    await page.keyboard.press("Escape");
    await page.locator('[data-slot="dialog-content"]').waitFor({ state: "detached" });
    if (width < 768) {
      const more = page.getByRole("button", { name: "Mais", exact: true });
      await more.click();
      await page.locator(".tadeon-mobile-more").waitFor();
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${output}/${width}-more.png` });
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Escape");
      if (!baseline) await setMotion("reduce");
      await page.locator(".tadeon-mobile-more").waitFor({ state: "detached", timeout: 1500 });
      if (!baseline) await setMotion("no-preference");
      assert(await more.evaluate(element => element === document.activeElement), "Radial focus return");
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
      await page.locator(".tadeon-mobile-drawer").waitFor();
      await page.keyboard.press("Escape");
      if (!baseline) await setMotion("reduce");
      await page.locator(".tadeon-mobile-drawer").waitFor({ state: "detached", timeout: 1500 });
      if (!baseline) await setMotion("no-preference");
    }
    await setMotion("reduce");
    await account.click();
    const reducedBackdrop = await sampleMotion('[data-slot="dialog-overlay"][data-state="open"]');
    const reducedDialog = await sampleMotion('[data-slot="dialog-content"][data-state="open"]');
    assert(reducedBackdrop.animation === "none" && reducedDialog.animation === "none", "Reduced motion reaches state directly");
    await page.keyboard.press("Escape");
    await page.locator('[data-slot="dialog-content"]').waitFor({ state: "detached" });
    await page.locator('[data-slot="dialog-overlay"]').waitFor({ state: "detached", timeout: 1000 }).catch(error => { if (!baseline) throw error; });
    // Repeat the preference change during an actual exit to catch event races.
    const preferenceExitRepeats = 5;
    for (let repeat = 0; repeat < preferenceExitRepeats; repeat++) {
      await setMotion("no-preference");
      await account.click();
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape");
      await setMotion("reduce");
      await page.locator('[data-slot="dialog-content"]').waitFor({ state: "detached", timeout: 1000 }).catch(error => { if (!baseline) throw error; });
      await page.locator('[data-slot="dialog-overlay"]').waitFor({ state: "detached", timeout: 1000 }).catch(error => { if (!baseline) throw error; });
    }
    const retiredBackdrops = await page.locator('[data-slot="dialog-overlay"]').count();
    const scrollLocked = await page.evaluate(() => document.body.hasAttribute("data-scroll-locked"));
    if (!baseline) assert(!scrollLocked && retiredBackdrops === 0, "Preference change retained modal presence or scroll lock");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert(!overflow && errors.length === 0, `${width}: overflow/errors ${JSON.stringify(errors)}`);
    rows.push({ width, closedScroll, openScroll, backdrop, menu, selectPointerReachable, retiredBackdrops, scrollLocked, preferenceExitRepeats, mobilePreferenceExit: width < 768 && !baseline, rapidReopen: true, focusReturn: true, reducedMotion: true, overflow, errors });
    writeFileSync(`${output}/results.json`, JSON.stringify(rows, null, 2));
    console.log(JSON.stringify({ width, closedScroll, openScroll, backdrop: backdrop.animation, menu: menu.animation, selectPointerReachable, errors }));
    await browser.close(); browser = null;
  }
} finally {
  await browser?.close();
  try { process.kill(-server.pid, "SIGTERM"); } catch { /* already closed */ }
}
