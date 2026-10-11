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
const server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)], {
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
  for (const width of [390, 820, 1440])
    for (const route of [
      "/",
      "/nexus",
      "/master-panel",
      "/offline",
      "/nexus-tools",
      "/manage-users",
      "/tabletop",
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
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
      await page.addStyleTag({
        content:
          "*,*::before,*::after { animation:none!important; transition:none!important; caret-color:transparent!important; }",
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        mainCount: document.querySelectorAll("main").length,
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
      const name = route.slice(1) || "dashboard";
      await page.screenshot({ path: `${root}/${phase}-${name}-${width}.png`, fullPage: true });
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
          const dialog = page.getByRole("dialog").last();
          await dialog.waitFor({ state: "visible" });
          await page.waitForTimeout(250);
          const rect = await dialog.boundingBox();
          const contained =
            !!rect &&
            rect.x >= -1 &&
            rect.y >= -1 &&
            rect.x + rect.width <= width + 1 &&
            rect.y + rect.height <= 1001;
          await page.screenshot({
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
          await dialog.waitFor({ state: "hidden" });
          await page.waitForTimeout(100);
          const returned = await trigger.evaluate((e) => document.activeElement === e);
          interactions.push({ label, rect, contained, focusInside, tabInside, returned });
          if (![contained, focusInside, tabInside, returned].every(Boolean))
            errors.push("Portal/focus failed: " + JSON.stringify(interactions.at(-1)));
        }
      }
      results.push({ route, width, errors, interactions, ...metrics });
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
