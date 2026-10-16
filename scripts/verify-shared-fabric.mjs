/** NEX-013 login fixtures: local fake responses only; no real sign-in, emails or writes. */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { installDesignFonts } from "./design-font-fixtures.mjs";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const root = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-fabric-login");
const port = Number(process.env.NEXUS_AUDIT_PORT || 5175);
mkdirSync(root, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.NEXUS_CHROMIUM_PATH,
  args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]"),
});
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
const results = [];
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
try {
  await new Promise((ok, fail) => {
    server.stdout.on("data", (b) => {
      if (b.toString().includes("Local:")) ok();
    });
    server.on("exit", (code) => fail(new Error(`Vite ${code}`)));
    setTimeout(() => fail(new Error("Vite timeout")), 30000).unref();
  });
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]")) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 768,
    });
    const page = await context.newPage(),
      errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await installDesignFonts(page);
    await page.route("**/*.supabase.co/**", (route) => {
      const url = new URL(route.request().url());
      requests.push({ path: url.pathname, method: route.request().method() });
      const invalid = url.pathname.endsWith("/token");
      return route.fulfill({
        status: invalid ? 400 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          invalid
            ? {
                error: "invalid_grant",
                error_description: "Invalid login credentials",
                code: "invalid_credentials",
              }
            : {},
        ),
      });
    });
    await page.goto(`http://127.0.0.1:${port}/login`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Entrar no Nexus" }).waitFor();
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() =>
      Object.keys(document.querySelector("form") || {}).some((key) =>
        key.startsWith("__reactProps$"),
      ),
    );
    await page.evaluate(async () => {
      await Promise.all(
        ['600 16px "Cormorant Garamond"', '500 16px "Inter"'].map((font) =>
          document.fonts.load(font),
        ),
      );
      await document.fonts.ready;
    });
    await page.waitForTimeout(700);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      main: document.querySelectorAll("main").length,
      h1: document.querySelectorAll("h1").length,
      font: getComputedStyle(document.querySelector("h1")).fontFamily,
      cloth: document.querySelectorAll(".tadeon-thread-field path").length,
      submitHeight: document.querySelector('button[type="submit"]').getBoundingClientRect().height,
    }));
    assert(
      !metrics.overflow &&
        metrics.main === 1 &&
        metrics.h1 === 1 &&
        metrics.cloth >= 52 &&
        errors.length === 0,
      `${width}: login render`,
    );
    assert(
      metrics.font.includes("Cormorant Garamond") && metrics.submitHeight >= 44,
      `${width}: type or target`,
    );
    if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1") await page.screenshot({ path: `${root}/login-${width}.png`, fullPage: true });
    await page.getByLabel("E-mail", { exact: true }).fill("fixture@nexus.test");
    await page.getByLabel("Senha", { exact: true }).fill("fixture-invalid");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await page.locator('[role="alert"]').first().waitFor();
    const toast = page.locator('[data-sonner-toast]').filter({ visible: true }).first();
    await toast.waitFor();
    metrics.toastMaterial = await toast.evaluate(e => ({ color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor, zIndex: getComputedStyle(e.closest('[data-sonner-toaster]')).zIndex }));
    assert(metrics.toastMaterial.color === "rgb(233, 227, 213)" && metrics.toastMaterial.background !== "rgba(0, 0, 0, 0)" && Number(metrics.toastMaterial.zIndex) >= 120, "Toast is legible above modal planes");

    assert(
      (await page.getByLabel("E-mail", { exact: true }).inputValue()) === "fixture@nexus.test",
      "Failed sign-in preserves input",
    );
    if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1") await page.screenshot({ path: `${root}/error-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Esqueceu a senha?" }).click();
    await page.getByText("Se este e-mail estiver cadastrado", { exact: false }).first().waitFor();
    await page.getByRole("button", { name: "Não tem conta? Cadastre-se" }).click();
    await page.getByLabel("Nome completo").fill("Nome longo para conferir o portal do arquivo");
    assert(
      (await page.getByLabel("Senha", { exact: true }).inputValue()) === "",
      "Mode switch clears password",
    );
    const signup = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      visible: document.querySelector("#name").getBoundingClientRect().width > 0,
    }));
    assert(!signup.overflow && signup.visible, `${width}: signup render`);
    if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1") await page.screenshot({ path: `${root}/signup-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Já tem conta? Entrar" }).click();
    const button = page.getByRole("button", { name: "Entrar", exact: true });
    await button.focus();
    assert(
      await button.evaluate((e) => document.activeElement === e),
      "Keyboard focus remains on control",
    );
    if (width === 1440) {
      await button.hover({ position: { x: 25, y: 15 } });
      await page.waitForTimeout(220);
      const light = await button.evaluate((e) => ({
        x: e.style.getPropertyValue("--material-x"),
        background: getComputedStyle(e, "::before").backgroundImage,
        translate: getComputedStyle(e).translate,
      }));
      assert(
        light.x !== "" && light.background.includes("radial-gradient"),
        "Pointer owns local reflection",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.mouse.move(1, 1);
      await button.hover();
      const reduced = await button.evaluate((e) => ({
        duration: getComputedStyle(e).transitionDuration,
        translate: getComputedStyle(e).translate,
      }));
      assert(
        parseFloat(reduced.duration) <= 0.001 && reduced.translate === "none",
        `Reduced control motion settles: ${JSON.stringify(reduced)}`,
      );
      metrics.light = light;
      metrics.reduced = reduced;
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    assert(errors.length === 0, JSON.stringify(errors));
    results.push({ width, ...metrics, signup, errors, fixtureRequests: requests });
    await context.close();
  }
  writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already stopped */
  }
}
