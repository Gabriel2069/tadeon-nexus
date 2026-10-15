import { installDesignFonts } from "./design-font-fixtures.mjs";
/** NEX-008/020 browser fixtures. No credentials or live backend writes.
 * Uses the same externally supplied Playwright/Chromium as the header audit.
 * Run after `npm run check`; artifacts stay outside the repository by default.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const root = resolve(process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-master-workspace");
const port = Number(process.env.NEXUS_AUDIT_PORT || 6134);
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
const userId = "00000000-0000-4000-8000-000000000001";
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@nexus.test",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const token = [
  { alg: "HS256", typ: "JWT" },
  { sub: userId, aud: "authenticated", role: "authenticated", exp: 2000000000 },
  "fixture",
]
  .map((x) => (typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")))
  .join(".");
const sheets = Array.from({ length: 14 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`,
  owner_id: userId,
  name:
    i === 0
      ? "A guardiã dos vestígios que permaneceram além do último limiar"
      : `Personagem de exemplo ${i + 1}`,
  occupation: "Leitora de vestígios",
  exposure: i * 5,
  equilibrium: i - 3,
  stats: { pv_current: 12 + i, ps_current: 8, pe_current: 6, pa_current: 2 },
}));
const results = [];
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const settings = {
  id: "00000000-0000-4000-8000-000000000099",
  key: "global",
  campaign_title: "O arquivo dos fios esquecidos",
  campaign_phase: "Localizar a Âncora antes do próximo limiar",
  scenes_detailed: [
    {
      id: "scene-a",
      title: "O salão onde os vestígios se encontram além das portas do arquivo",
      status: "Em curso",
    },
    { id: "scene-b", title: "A última passagem", status: "Planejada" },
  ],
  master_npcs: [{ id: "npc-a", name: "A guardiã", state: "Pleno" }],
  investigation_clues: [
    { id: "clue-a", title: "O fio de marfim", guaranteed: true, discovered: false },
  ],
  threats: [],
  folds: [],
  interludes: [],
};
try {
  await new Promise((ok, fail) => {
    server.stdout.on("data", (b) => {
      if (b.toString().includes("Local:")) ok();
    });
    server.on("exit", (code) => fail(new Error("Vite exited " + code)));
    setTimeout(() => fail(new Error("Vite timeout")), 30000).unref();
  });
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]")) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 768,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let writes = [];
    let failSave = false;
    let failLoad = false;
    let holdSave = null;
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
    await page.route("**/*.supabase.co/**", async (r) => {
      const req = r.request(),
        url = new URL(req.url());
      let body = [];
      if (req.method() === "POST" && url.pathname.includes("/app_error_logs")) {
        await r.fulfill({ status: 201, contentType: "application/json", body: "{}" });
        return;
      }
      if (req.method() === "PATCH" && url.pathname.includes("/game_settings")) {
        writes.push(req.postDataJSON());
        if (holdSave) await holdSave;
        await r.fulfill({
          status: failSave ? 503 : 200,
          contentType: "application/json",
          body: failSave
            ? JSON.stringify({ message: "Fixture unavailable" })
            : JSON.stringify({ id: settings.id }),
        });
        return;
      }
      if (
        !["GET", "HEAD", "OPTIONS"].includes(req.method()) &&
        !url.pathname.endsWith("/rpc/project_heartbeat")
      ) {
        await r.fulfill({ status: 500, body: "Unexpected fixture mutation" });
        errors.push("Unexpected write: " + url.pathname);
        return;
      }
      if (url.pathname.endsWith("/user")) body = user;
      else if (url.pathname.includes("/profiles"))
        body = [{ id: userId, email: user.email, full_name: "Tadeu de exemplo" }];
      else if (url.pathname.includes("/user_roles")) body = [{ user_id: userId, role: "mestre" }];
      else if (url.pathname.includes("/feature_flags"))
        body = [{ key: "nexus_knowledge_enabled", enabled: true }];
      else if (url.pathname.includes("/character_sheets")) body = sheets;
      else if (url.pathname.includes("/game_settings")) {
        if (failLoad) {
          await r.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Fixture load unavailable" }),
          });
          return;
        }
        body = [settings];
      } else if (url.pathname.includes("project_heartbeat")) body = "2026-10-15T00:00:00Z";
      if (Array.isArray(body) && req.headers().accept?.includes("vnd.pgrst.object"))
        body = body[0] || null;
      await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await installDesignFonts(page);
    const geometry = async (label, capture = true) => {
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll("h1").length,
        boundary: document.body.textContent.includes("Something went wrong"),
      }));
      assert(
        !result.overflow && result.h1 === 1 && !result.boundary,
        `${label}/${width}: ${JSON.stringify(result)}`,
      );
      assert(!errors.length, errors.join("\n"));
      if (capture)
        await page.screenshot({
          path: `${root}/${label}-${width}.png`,
          fullPage: label === "master-overview",
        });
      results.push({ width, label, captured: capture, ...result });
      writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
      console.log(`${width}: ${label}`);
    };
    const icons = async (container, label) => {
      for (const path of ["/master-panel", "/nexus-tools"]) {
        const el = container.locator(`a.tadeon-nav-item[href="${path}"] .tadeon-nav-item__icon`);
        const result = await el.evaluate((e) => {
          const svg = e.querySelector("svg"),
            s = getComputedStyle(svg),
            p = getComputedStyle(e, "::before"),
            r = svg.getBoundingClientRect(),
            canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = s.color;
          ctx.fillRect(0, 0, 1, 1);
          const rgb = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
          const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
          return {
            color: s.color,
            luminance,
            display: s.display,
            visibility: s.visibility,
            opacity: s.opacity,
            width: r.width,
            height: r.height,
            pseudo: p.content,
            mask: p.maskImage,
            viewBox: svg.getAttribute("viewBox"),
          };
        });
        assert(
          result.display !== "none" &&
            result.visibility === "visible" &&
            Number(result.opacity) > 0 &&
            result.width >= 16 &&
            result.height >= 16 &&
            result.luminance > 0.18 &&
            ["none", "normal"].includes(result.pseudo),
          `${label}/${width}${path}: ${JSON.stringify(result)}`,
        );
      }
    };
    await page.goto(`http://127.0.0.1:${port}/master-panel`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: "Painel do Mestre", exact: true, level: 1 })
      .waitFor({ timeout: 180000 });
    await page.getByLabel("Campanha", { exact: true }).waitFor();
    if (width < 768) {
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
      const drawer = page.getByRole("dialog", { name: "Navegação principal", exact: true });
      await drawer.waitFor();
      await icons(drawer, "drawer");
      await page.screenshot({ path: `${root}/icons-${width}.png` });
      await page.keyboard.press("Escape");
      await drawer.waitFor({ state: "hidden" });
    } else {
      const sidebar = page.locator("#tadeon-desktop-sidebar");
      await icons(sidebar, "expanded");
      await page.getByRole("button", { name: "Recolher menu", exact: true }).click();
      await page.waitForTimeout(300);
      await icons(sidebar, "collapsed");
      await page.screenshot({ path: `${root}/icons-${width}.png` });
      await page.getByRole("button", { name: "Expandir menu", exact: true }).click();
      await page.waitForTimeout(350);
    }
    if (width < 768) {
      const dock = await page
        .locator('.tadeon-mobile-dock__item[href="/master-panel"] > svg')
        .evaluate((e) => ({
          display: getComputedStyle(e).display,
          visibility: getComputedStyle(e).visibility,
          width: e.getBoundingClientRect().width,
        }));
      assert(
        dock.display !== "none" && dock.visibility === "visible" && dock.width >= 20,
        "Dock uses the real Master SVG",
      );
    }
    await geometry("master-overview");
    if (process.env.NEXUS_AUDIT_SCOPE === "preview") {
      await page.goto(`http://127.0.0.1:${port}/nexus-tools`);
      await page
        .getByRole("heading", { name: "Backup e diagnóstico", exact: true, level: 1 })
        .waitFor();
      if (width < 768) {
        await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
        const drawer = page.getByRole("dialog", { name: "Navegação principal", exact: true });
        await drawer.waitFor();
        await icons(drawer, "backup-active");
        await page.keyboard.press("Escape");
        await drawer.waitFor({ state: "hidden" });
      } else {
        const sidebar = page.locator("#tadeon-desktop-sidebar");
        await icons(sidebar, "backup-active-expanded");
        await page.getByRole("button", { name: "Recolher menu", exact: true }).click();
        await page.waitForTimeout(300);
        await icons(sidebar, "backup-active-collapsed");
        await page.getByRole("button", { name: "Expandir menu", exact: true }).click();
        await page.waitForTimeout(300);
      }
      await geometry("icons-backup-active");
      await context.close();
      continue;
    }
    const area = async (tab) => {
      if (width < 1100)
        await page
          .getByRole("combobox", { name: "Ir para uma ferramenta do mestre" })
          .selectOption(tab);
      else await page.locator(`[data-master-tab="${tab}"]`).click();
      await page.waitForFunction(
        (tab) =>
          document.querySelector(`[data-master-head-tab="${tab}"]`) &&
          document.querySelector(`[data-master-tab="${tab}"][data-state="active"]`),
        tab,
      );
      assert(
        tab === "dashboard"
          ? !new URL(page.url()).searchParams.has("tab")
          : new URL(page.url()).searchParams.get("tab") === tab,
        "URL follows selected tool",
      );
    };
    const title = page.getByLabel("Campanha", { exact: true });
    if (width === 320 || width >= 1100) {
      const search = page.getByRole("searchbox", { name: "Buscar personagem" });
      await search.fill("Personagem de exemplo 14");
      assert(
        await page
          .getByRole("button", { name: "Abrir ficha de Personagem de exemplo 14", exact: true })
          .isVisible(),
        "Search includes characters beyond the initial page",
      );
      await search.fill("no-match");
      await page.getByText("Nenhum personagem encontrado", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Limpar busca", exact: true }).click();
      await page.getByRole("button", { name: /Mostrar mais personagens/ }).click();
      assert(
        (await page.getByRole("button", { name: /^Abrir ficha de / }).count()) === 12,
        "Show more expands roster",
      );
      await geometry("master-roster");
      await title.fill("Rascunho preservado");
      await page.getByRole("button", { name: /^Pistas ocultas:/ }).click();
      await page.waitForURL("**/master-panel?tab=investigation");
      await area("dashboard");
      assert(
        (await title.inputValue()) === "Rascunho preservado",
        "Tabs preserve unsaved campaign draft",
      );
      failSave = true;
      await page.getByRole("button", { name: "Salvar painel", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Não foi possível salvar" }).waitFor();
      assert((await title.inputValue()) === "Rascunho preservado", "Failed save retains draft");
      await geometry("master-save-error");
      failSave = false;
      let release;
      holdSave = new Promise((ok) => (release = ok));
      const before = writes.length;
      await page.getByRole("button", { name: "Salvar painel", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[aria-label="Salvando…"]'));
      await title.fill("Edição durante o salvamento");
      release();
      holdSave = null;
      await page
        .getByRole("button", { name: "Salvar painel", exact: true })
        .waitFor({ state: "visible" });
      await page.waitForFunction(
        () => !document.querySelector('button[aria-label="Salvar painel"]').disabled,
      );
      assert(writes.length === before + 1, "One write for a pending manual save");
      assert(
        await page.getByLabel("Alterações pendentes", { exact: true }).isVisible(),
        "Newer edit remains pending",
      );
      await page.getByRole("button", { name: "Salvar painel", exact: true }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('button[aria-label="Salvar painel"]').disabled &&
          !document.querySelector('[aria-label="Salvando…"]'),
      );
      assert(
        writes.at(-1).campaign_title === "Edição durante o salvamento",
        "Retry writes latest draft",
      );
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });
    for (const tab of [
      "session",
      "scenes",
      "initiative",
      "npcs-v2",
      "threats",
      "investigation",
      "interludes",
      "folds",
      "balance",
      "catalog",
      "pinned",
      "notes",
      "data",
    ]) {
      await area(tab);
      await geometry("master-" + tab, ["session", "scenes", "notes", "data"].includes(tab));
    }
    await area("scenes");
    await page.getByRole("button", { name: "Nova Cena", exact: true }).click();
    const editor = page.getByRole("dialog");
    await editor.waitFor();
    await editor
      .getByLabel("Título", { exact: true })
      .fill("Uma cena com título longo para conferir leitura e continuidade");
    await editor.getByRole("button", { name: "Excluir", exact: true }).click();
    await editor.getByRole("button", { name: "Manter cena", exact: true }).click();
    assert(
      (await editor.getByLabel("Título", { exact: true }).inputValue()) ===
        "Uma cena com título longo para conferir leitura e continuidade",
      "Deletion cancellation retains scene",
    );
    await geometry("master-scene-editor");
    await page.keyboard.press("Escape");
    await editor.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Nova Cena",
      undefined,
      { timeout: 5000 },
    );
    await area("dashboard");
    await title.fill("Revisar antes de sair");
    const destination =
      width < 768
        ? page.getByRole("link", { name: "Início", exact: true })
        : page
            .locator("#tadeon-desktop-sidebar")
            .getByRole("link", { name: "Dashboard", exact: true });
    await destination.click();
    const review = page.getByRole("alertdialog");
    await review.waitFor();
    await page.waitForFunction(
      () => document.querySelector('[role="alertdialog"]')?.contains(document.activeElement),
      undefined,
      { timeout: 5000 },
    );
    await geometry("master-leave-review");
    await page.getByRole("button", { name: "Continuar no painel", exact: true }).click();
    await review.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("href") === "/",
      undefined,
      { timeout: 5000 },
    );
    assert(
      (await title.inputValue()) === "Revisar antes de sair",
      "Cancel navigation preserves draft",
    );
    await destination.click();
    await review.waitFor();
    await page.getByRole("button", { name: "Salvar e sair", exact: true }).click();
    await page.waitForURL(`http://127.0.0.1:${port}/`);
    await page.goto(`http://127.0.0.1:${port}/master-panel?popout=1&tab=notes`);
    await page.getByRole("heading", { name: "Painel do Mestre", exact: true, level: 1 }).waitFor();
    await area("dashboard");
    assert(
      new URL(page.url()).searchParams.get("popout") === "1",
      "Dedicated window flag survives tool navigation",
    );
    await page.goto(`http://127.0.0.1:${port}/nexus-tools`);
    await page
      .getByRole("heading", { name: "Backup e diagnóstico", exact: true, level: 1 })
      .waitFor();
    if (width >= 768) await icons(page.locator("#tadeon-desktop-sidebar"), "backup-active");
    else {
      await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
      const drawer = page.getByRole("dialog", { name: "Navegação principal", exact: true });
      await drawer.waitFor();
      await icons(drawer, "backup-active");
      await page.keyboard.press("Escape");
      await drawer.waitFor({ state: "hidden" });
    }
    await geometry("backup-active");
    await page.emulateMedia({ reducedMotion: "reduce" });
    failLoad = true;
    await page.goto(`http://127.0.0.1:${port}/master-panel`);
    await page.getByRole("heading", { name: "Painel indisponível", exact: true }).waitFor();
    await geometry("master-load-error");
    failLoad = false;
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await title.waitFor();
    await geometry("master-recovered");
    assert(!errors.length, errors.join("\n"));
    await context.close();
  }
} finally {
  writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /*already stopped*/
  }
}
