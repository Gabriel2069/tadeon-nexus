import { installDesignFonts } from "./design-font-fixtures.mjs";
/** Read-only browser fixture audit. No account credentials or live data required.
 * Install playwright-core outside the app and provide NEXUS_BROWSER_MODULE (file URL).
 * For a custom browser set NEXUS_CHROMIUM_PATH and optional NEXUS_CHROMIUM_ARGS (JSON).
 * NEXUS_AUDIT_REPO may point at a baseline worktree; output defaults to /tmp.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const phase = process.argv[2] || "current";
const port = Number(process.env.NEXUS_AUDIT_PORT || 5173);
const repo = resolve(process.env.NEXUS_AUDIT_REPO || ".");
const root = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-header-audit");
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.NEXUS_CHROMIUM_PATH || undefined,
  args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]"),
});
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)], {
  cwd: repo,
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
try {
  await new Promise((ok, fail) => {
    server.stdout.on("data", (b) => {
      if (b.toString().includes("Local:")) ok();
    });
    server.on("exit", (code) => fail(new Error("Vite exited: " + code)));
    setTimeout(() => fail(new Error("Vite startup timeout")), 30000).unref();
  });
  const id = "00000000-0000-4000-8000-000000000001";
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@nexus.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Conta de teste" },
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = [
    { alg: "HS256", typ: "JWT" },
    { sub: id, aud: "authenticated", role: "authenticated", exp: 2000000000 },
    "fixture",
  ]
    .map((x) => (typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")))
    .join(".");
  const results = [];
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]"))
    for (const route of JSON.parse(process.env.NEXUS_AUDIT_ROUTES || JSON.stringify([
      "/",
      "/nexus",
      "/master-panel",
      "/offline",
      "/nexus-tools",
      "/manage-users",
      "/tabletop",
    ]))) {
      const captureScreenshots = process.env.NEXUS_SKIP_SCREENSHOTS !== "1"
        && (!process.env.NEXUS_AUDIT_SCREENSHOT_WIDTHS || JSON.parse(process.env.NEXUS_AUDIT_SCREENSHOT_WIDTHS).includes(width))
        && (!process.env.NEXUS_AUDIT_SCREENSHOT_ROUTES || JSON.parse(process.env.NEXUS_AUDIT_SCREENSHOT_ROUTES).includes(route));
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: process.env.NEXUS_MATERIAL_AUDIT === "1" ? "no-preference" : "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.stack));
      await page.addInitScript(
        ({ user, token }) =>
          localStorage.setItem(
            "sb-nkxpstyfrzufsnowjrdi-auth-token",
            JSON.stringify({
              access_token: token,
              refresh_token: "fixture",
              token_type: "bearer",
              expires_in: 86400,
              expires_at: 2000000000,
              user,
            }),
          ),
        { user, token },
      );
      await page.route("**/*.supabase.co/**", async (req) => {
        const url = new URL(req.request().url());
        let body = [];
        if (url.pathname.endsWith("/user")) body = user;
        else if (url.pathname.includes("/profiles"))
          body = [{ id, email: user.email, full_name: "Conta de teste" }];
        else if (url.pathname.includes("/user_roles")) body = [{ user_id: id, role: "mestre" }];
        else if (url.pathname.includes("/feature_flags"))
          body = ["knowledge", "graph", "assets_v2", "tabletop", "realtime", "lighting", "r2"].map(
            (x) => ({
              key: "nexus_" + x + "_enabled",
              enabled: ["knowledge", "tabletop"].includes(x),
            }),
          );
        else if (url.pathname.includes("/functions/v1/admin-users")) body = { users: [] };
        if (Array.isArray(body) && req.request().headers().accept?.includes("vnd.pgrst.object"))
          body = body[0] || null;
        await req.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });
      await page.route("**/_serverFn/**", (r) =>
        r.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Read-only browser fixture: admin service unavailable" }),
        }),
      );
      await installDesignFonts(page);
      await page.goto(`http://127.0.0.1:${port}${route}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.locator("#tadeon-main").waitFor({ timeout: 15000 });
      if (route === "/tabletop")
        await page
          .locator('canvas[aria-label="Canvas da Mesa Nexus"]')
          .waitFor({ state: "attached", timeout: 20000 })
          .catch((e) => errors.push("Canvas readiness: " + e.message));
      if (process.env.NEXUS_MATERIAL_AUDIT !== "1") await page.addStyleTag({
        content:
          "*,*::before,*::after { animation:none!important; transition:none!important; caret-color:transparent!important; }",
      });
      await page.evaluate(async () => {
        await Promise.all(['500 16px "Cormorant Garamond"', '600 16px "Cormorant Garamond"', '700 16px "Cormorant Garamond"'].map(font => document.fonts.load(font)));
        await document.fonts.ready;
      });
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        mainCount: document.querySelectorAll("main").length,
        titleColor: document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).color : null,
        activeNavigation: Array.from(document.querySelectorAll('.tadeon-nav-item[aria-current="page"],.tadeon-mobile-dock__item[aria-current="page"]')).filter(e => e.getBoundingClientRect().width > 0).map(e => ({ label: e.textContent.trim(), color: getComputedStyle(e).color })),
        material: Array.from(document.querySelectorAll('.tadeon-material-card,.tadeon-material-button')).slice(0, 8).map(element => {
          const style = getComputedStyle(element);
          return { slot: element.dataset.slot, background: style.backgroundColor, shadow: style.boxShadow, radius: style.borderRadius, transform: style.transform, translate: style.translate };
        }),
        hosts: [
          ...document.querySelectorAll(
            ".tadeon-focus-section-mark-host,.tadeon-page-hero-mark-host,.tadeon-tabletop-brand-mark-host",
          ),
        ].map((e) => {
          const r = e.getBoundingClientRect(),
            style = getComputedStyle(e);
          return {
            className: e.className,
            rect: [r.x, r.y, r.width, r.height],
            color: style.color,
            display: style.display,
          };
        }),
        landmarks: [
          ...document.querySelectorAll(
            "h1,.tadeon-page-hero,.tadeon-desktop-toolbar,.tadeon-mobile-header__identity",
          ),
        ].map((e) => {
          const r = e.getBoundingClientRect();
          return {
            className: e.className,
            text: e.tagName === "H1" ? e.textContent : null,
            rect: [r.x, r.y, r.width, r.height],
          };
        }),
        focusStyle: (() => {
          const e = document.querySelector(".tadeon-desktop-toolbar > .min-w-0");
          if (!e) return null;
          const s = getComputedStyle(e);
          return [s.display, s.gridTemplateColumns, s.columnGap];
        })(),
      }));
      if (process.env.NEXUS_MATERIAL_AUDIT === "1" && width >= 820) {
        const card = page.locator('.tadeon-material-card').filter({ visible: true }).first();
        if (await card.count()) {
          await card.scrollIntoViewIfNeeded();
          const before = await card.boundingBox();
          await card.hover({ position: { x: 28, y: 20 } });
          await page.waitForTimeout(300);
          const after = await card.boundingBox();
          metrics.cardResponse = await card.evaluate(e => ({ lightX: e.style.getPropertyValue('--material-x'), transform: getComputedStyle(e).transform }));
          if (!metrics.cardResponse.lightX || metrics.cardResponse.transform !== 'none' || Math.abs(before.x - after.x) > .1 || Math.abs(before.y - after.y) > .1) errors.push('Card light moved the content plane');
        }
      }
      if (captureScreenshots) {
        await page.mouse.move(0, 0);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      if (metrics.activeNavigation.some(item => item.color !== "rgb(233, 227, 213)")) errors.push("Active navigation label lost its ivory contrast");
      const name = route.slice(1) || "dashboard";
      if (captureScreenshots) await page.screenshot({ path: `${root}/${phase}-${name}-${width}.png`, fullPage: false, timeout: 20000 });
      const interactions = [];
      if (route === "/offline") {
        for (const label of [
          "Abrir busca global",
          width < 768 ? "Conta" : "Abrir configurações da conta",
        ]) {
          const trigger = page
            .getByRole("button", { name: label, exact: true })
            .filter({ visible: true })
            .first();
          await trigger.focus();
          await page.keyboard.press("Enter");
          const dialog =
            label === "Abrir busca global"
              ? page.getByRole("dialog", { name: "Busca global", exact: true })
              : page.getByRole("dialog").last();
          await dialog.waitFor({ state: "visible" });
          await dialog.evaluate(element => Promise.all(element.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))));
          let keyboardFixture = null;
          if (label === "Abrir busca global" && width <= 820) {
            await dialog.locator("input").first().focus();
            await page.evaluate(() => {
              Object.defineProperty(window.visualViewport, "height", {
                value: 600,
                configurable: true,
              });
              window.dispatchEvent(new Event("resize"));
            });
            await page.waitForFunction(() => document.documentElement.style.getPropertyValue("--tadeon-vv-height") === "600px" && document.documentElement.dataset.tadeonKeyboardOpen === "true");
            await page.waitForFunction(() => { const dialog = document.querySelector('.tadeon-global-search-dialog'); const rect = dialog.getBoundingClientRect(); return rect.y >= -1 && rect.bottom <= 601; });
            const keyboardRect = await dialog.boundingBox();
            const contract = await dialog.evaluate((element) => ({
              open: document.documentElement.dataset.tadeonKeyboardOpen,
              rootHeight: document.documentElement.style.getPropertyValue("--tadeon-vv-height"),
              searchHeight: getComputedStyle(element)
                .getPropertyValue("--tadeon-search-vv-height")
                .trim(),
            }));
            const contained =
              !!keyboardRect && keyboardRect.y >= -1 && keyboardRect.y + keyboardRect.height <= 601;
            keyboardFixture = { keyboardRect, contract, contained };
            if (
              !contained ||
              contract.open !== "true" ||
              contract.rootHeight !== "600px" ||
              contract.searchHeight !== "600px"
            )
              errors.push("Simulated keyboard viewport failed: " + JSON.stringify(keyboardFixture));
            await page.evaluate(() => {
              delete window.visualViewport.height;
              window.dispatchEvent(new Event("resize"));
            });
            await page.waitForTimeout(150);
          }
          const material = await dialog.evaluate(element => {
            const style = getComputedStyle(element);
            return { animation: style.animationName, duration: style.animationDuration, scale: style.scale, origin: style.transformOrigin, shadow: style.boxShadow, radius: style.borderRadius, tone: style.getPropertyValue("--material-rgb").trim() };
          });
          const rect = await dialog.boundingBox();
          const contained =
            !!rect &&
            rect.x >= -1 &&
            rect.y >= -1 &&
            rect.x + rect.width <= width + 1 &&
            rect.y + rect.height <= 1001;
          if (captureScreenshots) await page.screenshot({
            path: `${root}/${phase}-portal-${label === "Abrir busca global" ? "search" : "account"}-${width}.png`,
            fullPage: true,
          });
          const focusInside = await page.evaluate(
            () => !!document.activeElement?.closest('[role="dialog"]'),
          );
          await page.keyboard.press("Tab");
          const tabInside = await page.evaluate(
            () => !!document.activeElement?.closest('[role="dialog"]'),
          );
          await page.keyboard.press("Escape");
          await dialog.waitFor({ state: "detached" });
          await page.waitForFunction(element => document.activeElement === element, await trigger.elementHandle());
          const returned = await trigger.evaluate((e) => document.activeElement === e);
          interactions.push({
            label,
            rect,
            contained,
            focusInside,
            tabInside,
            returned,
            keyboardFixture,
            material,
          });
          if (![contained, focusInside, tabInside, returned].every(Boolean))
            errors.push("Portal/focus failed: " + JSON.stringify(interactions.at(-1)));
        }
      }
      if (route === "/offline" && process.env.NEXUS_MATERIAL_AUDIT === "1") {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setEmulatedMedia", { features: [
          { name: "prefers-reduced-motion", value: "reduce" },
          { name: "prefers-reduced-transparency", value: "reduce" },
          { name: "prefers-contrast", value: "more" },
        ] });
        const preferences = await page.evaluate(() => {
          const nav = document.querySelector(innerWidth < 768 ? ".tadeon-mobile-header" : ".tadeon-desktop-toolbar");
          return { motion: matchMedia("(prefers-reduced-motion: reduce)").matches, transparency: matchMedia("(prefers-reduced-transparency: reduce)").matches, contrast: matchMedia("(prefers-contrast: more)").matches, filter: getComputedStyle(nav).backdropFilter };
        });
        if (!preferences.motion || !preferences.transparency || !preferences.contrast || preferences.filter !== "none") errors.push("Material preferences failed: " + JSON.stringify(preferences));
        const trigger = page.getByRole("button", { name: width < 768 ? "Conta" : "Abrir configurações da conta", exact: true }).filter({ visible: true }).first();
        await trigger.click();
        const dialog = page.getByRole("dialog").last();
        await dialog.waitFor();
        preferences.popup = await dialog.evaluate(e => ({ animation: getComputedStyle(e).animationName, border: getComputedStyle(e).borderColor }));
        if (preferences.popup.animation !== "none") errors.push("Reduced popup retained animation");
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached" });
        metrics.preferences = preferences;
        await cdp.detach();
      }
      results.push({ route, width, errors, interactions, ...metrics });
      console.log(JSON.stringify({ route, width, errors, preferences: metrics.preferences }));
      await context.close();
    }
  writeFileSync(`${root}/${phase}.json`, JSON.stringify(results, null, 2));
  if (results.some((result) => result.errors.length || result.overflow)) process.exitCode = 1;
  console.log(
    JSON.stringify(
      results.map((r) => ({
        route: r.route,
        width: r.width,
        hosts: r.hosts.length,
        errors: r.errors,
        overflow: r.overflow,
      })),
    ),
  );
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
