/** NEX-005/025: isolated fixtures; backend reads/writes and realtime are intercepted. */
import { installDesignFonts } from "./design-font-fixtures.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const output = process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-sheet-design";
const port = Number(process.env.NEXUS_AUDIT_PORT || 6117);
mkdirSync(output, { recursive: true });
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
const userId = "00000000-0000-4000-8000-000000000001",
  sheetId = "00000000-0000-4000-8000-000000000010";
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
  .map((v) => (typeof v === "string" ? v : Buffer.from(JSON.stringify(v)).toString("base64url")))
  .join(".");
const sheet = {
  id: sheetId,
  owner_id: userId,
  name: "Aurora dos fios esquecidos",
  occupation: "Guardiã dos vestígios",
  age: "32",
  brand: "O fio interrompido",
  origin: "Além do limiar",
  motivation: "Preservar a memória",
  exposure: 20,
  equilibrium: 0,
  drift: 0,
  attributes: { COR: 1, MEN: 1, INS: 1, PRE: 1, ERU: 1 },
  stats: {
    pv_current: 8,
    pv_mod: 0,
    ps_current: 7,
    ps_mod: 0,
    pe_current: 4,
    pe_mod: 0,
    pa_current: 1,
    pa_mod: 0,
    def_equip: 0,
    def_mod: 0,
    pm_current: 0,
    pm_mod: 0,
  },
  stat_upgrades: { pv: 0, ps: 0, pe: 0, def: 0 },
  condition: "",
  conditions: { fisica: [], mental: [], energetica: [], outras: [] },
  dying: 0,
  going_insane: 0,
  skills: { Atletismo: 3 },
  initial_skill_degrees: { Atletismo: 1 },
  skill_bonus: {},
  weapons: [],
  inventory: [{ id: "corda", nome: "Corda de linho", peso: 1, quantidade: 1 }],
  inventory_capacity: 10,
  abilities: [],
  purchased_skills: [],
  plots: [],
  fragments: 0,
  fragments_items: [],
  defense_items: [{ id: "manto", nome: "Manto de viagem", bonus: 2, rd: 1, peso: 1 }],
  description: {
    historia: "Memórias entrelaçadas no tecido do mundo.",
    personalidade: "Atenta aos vestígios.",
    objetivos: "Encontrar o fio perdido.",
    observacoes: "",
  },
  identity_data: {
    conviction: "Cada fio guarda uma história",
    limit: "Não abandonar o vínculo",
    wound: "O fio rompido",
    question: "Quem se lembra de nós?",
    lifeCycleTrait: "",
    links: [{ id: "v1", name: "A sentinela", relation: "Guarda", state: "Presente" }],
  },
  weapon_proficiency: "operador",
  weapon_proficiency_family: "",
  power_form_enabled: process.env.NEXUS_POWER_HEADER === "1",
  power_form_data: {},
};
const results = [];
const browser = await chromium.launch({
  executablePath: process.env.NEXUS_CHROMIUM_PATH,
  args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]"),
});
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
try {
  await new Promise((ok, fail) => {
    server.stdout.on("data", (b) => {
      if (b.toString().includes("Local:")) ok();
    });
    server.on("exit", (c) => fail(new Error("Vite exited " + c)));
    setTimeout(() => fail(new Error("Vite timeout")), 30000).unref();
  });
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]"))
    for (const state of JSON.parse(
      process.env.NEXUS_AUDIT_STATES || '["editable","readonly","error","loading"]',
    )) {
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        hasTouch: width < 768,
        reducedMotion: "reduce",
      });
      const page = await context.newPage(),
        errors = [],
        writes = [],
        rpcs = [];
      let readError = state === "error",
        readPaused = state === "loading",
        releaseRead,
        saveError = false;
      page.on("pageerror", (e) => errors.push(e.message));
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
      await page.routeWebSocket("**", (socket) => socket.close());
      await page.route("**/*.supabase.co/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        let body = [],
          status = 200;
        if (url.pathname.endsWith("/user")) body = user;
        else if (url.pathname.includes("/character_sheets")) {
          if (request.method() === "PATCH") {
            writes.push({ url: url.search, body: request.postDataJSON() });
            body = [];
            if (saveError) {
              status = 503;
              body = { message: "Fixture save failed" };
            }
          } else {
            assert(request.method() === "GET", "Unexpected record mutation");
            if (readPaused)
              await new Promise((ok) => {
                releaseRead = ok;
              });
            if (readError) {
              status = 503;
              body = { message: "Fixture read failed" };
            } else body = [sheet];
          }
        } else if (url.pathname.includes("/profiles"))
          body = [{ id: userId, email: user.email, full_name: "Tadeu de exemplo" }];
        else if (url.pathname.includes("/user_roles"))
          body = [{ user_id: userId, role: state === "readonly" ? "espectador" : "mestre" }];
        else if (url.pathname.includes("/feature_flags"))
          body = [
            { key: "nexus_tabletop_enabled", enabled: true },
            { key: "nexus_knowledge_enabled", enabled: true },
          ];
        else if (url.pathname.includes("/rpc/")) {
          const name = url.pathname.split("/").at(-1);
          rpcs.push({ name, args: request.postDataJSON() });
          if (name === "get_public_game_settings") body = {};
          else if (name === "get_sheet_inventory_organization")
            body = {
              items: sheet.inventory,
              containers: [{ id: "bolsa", name: "Bolsa de viagem", parent_id: null }],
              placements: [],
            };
          else body = [];
        }
        if (Array.isArray(body) && request.headers().accept?.includes("vnd.pgrst.object"))
          body = body[0] || null;
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      });
      await page.route("**/_serverFn/**", (r) =>
        r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
      );
      await installDesignFonts(page);
      await page.goto(
        `http://127.0.0.1:${port}/sheet/${sheetId}${process.env.NEXUS_POWER_HEADER === "1" ? "/power" : ""}?mode=edit`,
        {
          waitUntil: "domcontentloaded",
        },
      );
      if (process.env.NEXUS_POWER_HEADER === "1") {
        await page.locator("[data-page-header=sheet]").waitFor({ timeout: 60000 });
        const header = await page.locator("[data-page-header=sheet]").evaluate((e) => {
          const r = e.getBoundingClientRect(),
            title = e.querySelector(".tadeon-page-header__title"),
            style = getComputedStyle(title);
          return {
            rect: [r.x, r.y, r.width, r.height],
            font: [style.fontFamily, style.fontSize, style.fontWeight],
            headingCount: document.querySelectorAll("h1").length,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert(
          header.headingCount === 1 && !header.overflow,
          "Power header follows the shared route envelope",
        );
        assert(
          header.font[1] === (width < 480 ? "30px" : width === 820 ? "32px" : "38.16px") ||
            parseFloat(header.font[1]) >= 30,
          "Power title is not shrunk by legacy header rules",
        );
        assert(writes.length === 0, "Read-only power header never writes");
        assert(errors.length === 0, JSON.stringify(errors));
        if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
          await page.screenshot({ path: `${output}/power-header-${width}.png`, timeout: 20000 });
        results.push({
          width,
          state,
          variant: "power-header",
          header,
          errors,
          writes: writes.length,
        });
        writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
        console.log(`Power header verified ${width}`);
        await context.close();
        continue;
      }
      if (readPaused) {
        await page.getByRole("status", { name: "Carregando ficha" }).waitFor();
        if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
          await page.screenshot({ path: `${output}/loading-${width}.png` });
        readPaused = false;
        releaseRead();
      }
      if (readError) {
        await page.getByText("A ficha não pôde ser aberta").waitFor();
        if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
          await page.screenshot({ path: `${output}/${state}-${width}.png`, fullPage: true });
        readError = false;
        await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
      }
      const name = page.locator("#sec-info").getByLabel("Nome", { exact: true });
      await name.waitFor();
      await page.waitForFunction(() =>
        Object.keys(document.querySelector("#sec-info input")).some((k) =>
          k.startsWith("__reactProps$"),
        ),
      );
      await page.evaluate(async () => {
        await Promise.all(
          ['500 16px "Cormorant Garamond"', '500 16px "Inter"', '400 16px "PT Mono"'].map((f) =>
            document.fonts.load(f),
          ),
        );
        await document.fonts.ready;
      });
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        sections: document.querySelectorAll(".tadeon-sheet-section").length,
        materials: document.querySelectorAll(".tadeon-sheet-section[data-material-surface]").length,
        metricFont: getComputedStyle(document.querySelector(".tadeon-overview-metric strong"))
          .fontFamily,
        metricFigures: getComputedStyle(document.querySelector(".tadeon-overview-metric strong"))
          .fontVariantNumeric,
        headingFont: getComputedStyle(document.querySelector("#sec-info h2")).fontFamily,
        sectionTransform: getComputedStyle(document.querySelector("#sec-info")).transform,
        attributeControls: [...document.querySelectorAll(".tadeon-attribute-tile")].map((e) => {
          const r = e.getBoundingClientRect();
          const c = e.querySelector(".tadeon-attribute-tile__controls").getBoundingClientRect();
          return {
            fits: c.x >= r.x && c.right <= r.right,
            targets: [...e.querySelectorAll("button")].map((b) => {
              const t = b.getBoundingClientRect();
              return { w: t.width, h: t.height, fits: t.x >= c.x && t.right <= c.right };
            }),
          };
        }),
        targets: [...document.querySelectorAll(".tadeon-sheet-section__toggle")].map((e) => {
          const r = e.getBoundingClientRect();
          return { w: r.width, h: r.height };
        }),
        resources: [...document.querySelectorAll(".tadeon-stat-block")].map((e) => {
          const bounds = e.getBoundingClientRect();
          const styles = getComputedStyle(e);
          return {
            tone: styles.getPropertyValue("--resource-rgb").trim(),
            controlTone: getComputedStyle(e.querySelector("button"))
              .getPropertyValue("--control-rgb")
              .trim(),
            buttons: [...e.querySelectorAll("button")].map((button) => {
              const b = button.getBoundingClientRect();
              return { w: b.width, h: b.height, fits: b.x >= bounds.x && b.right <= bounds.right };
            }),
          };
        }),
        labelFont: getComputedStyle(document.querySelector(".tadeon-sheet-field label")).fontFamily,
        metricTones: [...document.querySelectorAll(".tadeon-overview-metric")].map((e) =>
          getComputedStyle(e).getPropertyValue("--metric-rgb").trim(),
        ),
      }));
      assert(!metrics.overflow, `Overflow ${width}/${state}`);
      assert(
        metrics.sections >= 9 && metrics.sections === metrics.materials,
        "Every record section owns its material",
      );
      assert(
        metrics.metricFont.includes("Inter") && metrics.metricFigures.includes("tabular-nums"),
        "Aligned metric typography",
      );
      assert(metrics.headingFont.includes("Cormorant Garamond"), "Approved editorial typography");
      assert(metrics.sectionTransform === "none", "Record content remains stationary");
      assert(
        metrics.targets.every((t) => t.w >= 44 && t.h >= 44),
        "Section controls have 44px targets",
      );
      assert(
        metrics.attributeControls.every(
          (c) => c.fits && c.targets.every((t) => t.w >= 44 && t.h >= 44 && t.fits),
        ),
        "Attribute controls stay visible inside their instrument",
      );
      assert(metrics.labelFont.includes("Inter"), "Field labels use interface typography");
      assert(new Set(metrics.metricTones).size === 4, "Overview preserves its four semantic tones");
      assert(
        metrics.resources.length === 4 &&
          metrics.resources.every(
            (resource) =>
              resource.tone === resource.controlTone &&
              resource.buttons.every((b) => b.w >= 44 && b.h >= 44 && b.fits),
          ),
        "Resource controls fit and inherit their own resource tone",
      );
      if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
        await page.screenshot({ path: `${output}/top-${state}-${width}.png` });
      await page.locator("#sec-attr").scrollIntoViewIfNeeded();
      if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
        await page.screenshot({ path: `${output}/attributes-${state}-${width}.png` });
      await page.locator("#sec-pontos").scrollIntoViewIfNeeded();
      if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
        await page.screenshot({ path: `${output}/resources-${state}-${width}.png` });
      if (state === "editable")
        if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
          await page.screenshot({ path: `${output}/sheet-${state}-${width}.png`, fullPage: true });
      const toggle = page.getByRole("button", { name: "Recolher seção Informações", exact: true });
      const collapse = (await toggle.count())
        ? toggle
        : page.locator("#sec-info .tadeon-sheet-section__toggle");
      await collapse.click();
      assert((await collapse.getAttribute("aria-expanded")) === "false", "Collapse state");
      await collapse.click();
      assert((await name.inputValue()) === sheet.name, "Collapse preserves data");
      await collapse.click();
      if (width < 768) await page.getByLabel("Localizar seção da ficha").selectOption("sec-info");
      else
        await page
          .locator(".tadeon-sheet-jumpbar")
          .getByRole("button", { name: "Identidade", exact: true })
          .click();
      await page.waitForFunction(
        () =>
          document.querySelector("#sec-info h2") === document.activeElement &&
          document
            .querySelector("#sec-info .tadeon-sheet-section__toggle")
            .getAttribute("aria-expanded") === "true",
      );
      assert(
        (await name.inputValue()) === sheet.name,
        "The section index reveals a folded section and transfers focus without changing data",
      );
      const linkToggle = page.getByRole("button", { name: "Recolher vínculos", exact: true });
      await linkToggle.focus();
      await page.keyboard.press("Space");
      await page.getByLabel("Nome do vínculo 1", { exact: true }).waitFor({ state: "hidden" });
      await page.keyboard.press("Space");
      assert(
        (await page.getByLabel("Nome do vínculo 1", { exact: true }).inputValue()) ===
          "A sentinela",
        "Link disclosure preserves controlled data by keyboard",
      );
      assert(
        await linkToggle.evaluate((e) => document.activeElement === e),
        "Link disclosure keeps trigger focus",
      );
      if (width === 1440 && state === "editable") {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        for (let i = 0; i < 4; i++) {
          await collapse.evaluate((e) => e.click());
          await page.waitForTimeout(35);
        }
        await page.waitForFunction(
          () =>
            document.querySelector("#sec-info .tadeon-sheet-section__body")?.getBoundingClientRect()
              .height > 100,
        );
        assert(
          (await collapse.getAttribute("aria-expanded")) === "true",
          "Interrupted folds settle to the latest open state",
        );
        const fold = await page.locator("#sec-info .tadeon-sheet-section__body").evaluate((e) => ({
          animation: getComputedStyle(e).animationName,
          transform: getComputedStyle(e).transform,
        }));
        assert(
          fold.animation === "tadeon-fold-open" && fold.transform === "none",
          "The shared fold owns motion without transforming text",
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert(
          (await page
            .locator("#sec-info .tadeon-sheet-section__body")
            .evaluate((e) => getComputedStyle(e).animationName)) === "none",
          "Reduced motion removes fold animation",
        );
      }
      const history = page.getByRole("button", { name: "Ver mudanças de sessão" });
      await history.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      await page.waitForFunction(
        () => document.activeElement?.getAttribute("aria-label") === "Ver mudanças de sessão",
      );
      assert(await history.evaluate((e) => document.activeElement === e), "History returns focus");
      const organize = page.getByRole("button", { name: "Organizar inventário", exact: true });
      await organize.click();
      await page.getByRole("dialog").waitFor();
      await page
        .locator(".tadeon-inventory-container-chip")
        .filter({ hasText: "Bolsa de viagem" })
        .waitFor();
      if (state === "readonly") {
        assert(await name.isDisabled(), "Read-only identity");
        assert(
          (await page.getByLabel("Nome do recipiente").count()) === 0,
          "No read-only create control",
        );
        assert(
          await page.getByLabel("Remover Bolsa de viagem").isDisabled(),
          "Read-only container removal",
        );
      }
      if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
        await page.screenshot({ path: `${output}/inventory-${state}-${width}.png` });
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute("aria-label") === "Organizar inventário" ||
          document.activeElement?.textContent?.includes("Organizar inventário"),
      );
      assert(
        await organize.evaluate((e) => document.activeElement === e),
        "Inventory returns focus",
      );
      if (state !== "readonly") {
        if (width === 1440 && state === "editable") {
          await page.getByRole("button", { name: "Diminuir COR", exact: true }).click();
          assert(
            await page.getByRole("button", { name: "Diminuir MEN", exact: true }).isDisabled(),
            "Only one zero attribute is allowed",
          );
          await page.getByRole("button", { name: "Aumentar COR", exact: true }).click();
          const vitality = page.getByLabel("Vitalidade atual", { exact: true });
          await vitality.fill("99999");
          assert(
            Number(await vitality.inputValue()) === Number(await vitality.getAttribute("max")),
            "Vitality clamps at its calculated maximum",
          );
          await vitality.fill("8");
          const condition = page.locator(".tadeon-condition-option").first();
          await condition.click();
          assert(
            (await condition.getAttribute("aria-pressed")) === "true",
            "Condition selection uses React state",
          );
          const skill = page.locator(".tadeon-skill-row").filter({ hasText: "Atletismo" });
          await skill.click();
          await page
            .getByRole("button", { name: "Avançar treino de Atletismo", exact: true })
            .click();
          assert(
            (await skill.textContent()).includes("+6"),
            "Initial skill training advances without changing formulas",
          );
          await skill.click();
          await page
            .getByRole("button", { name: "Reverter treino de Atletismo", exact: true })
            .click();
          assert((await skill.textContent()).includes("+3"), "Training can be reverted");
          const surface = page.locator("#sec-info");
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await surface.hover({ position: { x: 20, y: 20 } });
          await page.waitForFunction(() =>
            document.querySelector("#sec-info").style.getPropertyValue("--material-x"),
          );
          assert(
            (await surface.evaluate((e) => getComputedStyle(e).transform)) === "none",
            "Reflections never move record content",
          );
          await page.locator(".tadeon-sheet-commandbar").hover();
          await page.emulateMedia({ reducedMotion: "reduce" });
          await surface.hover({ position: { x: 30, y: 30 } });
          assert(
            (await surface.evaluate((e) => e.style.getPropertyValue("--material-x"))) === "",
            "Reduced motion suppresses pointer reflection updates",
          );
        }
        await name.fill("Nome preservado");
        await page.waitForFunction(() => document.querySelector('[data-tadeon-state="saved"]'));
        await page.waitForTimeout(850);
        assert(
          writes.some((w) => w.body.name === "Nome preservado" && w.url.includes(sheetId)),
          "Save carries record identity",
        );
        saveError = true;
        await name.fill("Edição durante falha");
        await page
          .locator(".tadeon-sheet-commandbar")
          .getByLabel("Falha ao salvar", { exact: true })
          .waitFor();
        assert((await name.inputValue()) === "Edição durante falha", "Failure retains edit");
        saveError = false;
        await page
          .locator(".tadeon-sheet-commandbar")
          .getByRole("button", { name: "Falha ao salvar", exact: true })
          .click();
        await page.waitForFunction(() => document.querySelector('[data-tadeon-state="saved"]'));
        assert(writes.at(-1).body.name === "Edição durante falha", "Retry saves retained edit");
        await page.getByRole("button", { name: "Jogo", exact: true }).click();
        assert(
          (await page.locator("html").getAttribute("data-tadeon-sheet-mode")) === "game",
          "Game mode",
        );
        const game = await page.evaluate(() => ({
          nameHeight: document
            .querySelector(".tadeon-identity-field--name textarea")
            .getBoundingClientRect().height,
          nameFont: getComputedStyle(
            document.querySelector(".tadeon-identity-field--name textarea"),
          ).fontFamily,
          overflow: document.documentElement.scrollWidth > innerWidth,
          controls: [
            ...document.querySelectorAll(".tadeon-stat-block button, .tadeon-stat-block input"),
          ].map((e) => {
            const r = e.getBoundingClientRect(),
              host = e.closest(".tadeon-stat-block").getBoundingClientRect();
            return {
              w: r.width,
              h: r.height,
              fits: r.x >= host.x && r.right <= host.right,
              transform: getComputedStyle(e).transform,
              opacity: getComputedStyle(e).opacity,
            };
          }),
        }));
        assert(
          !game.overflow && game.nameHeight >= 80 && game.nameFont.includes("Cormorant Garamond"),
          "Game mode preserves the dossier name and reflow",
        );
        assert(
          game.controls.every((e) => e.h >= 44 && e.fits && e.transform === "none"),
          "Game mode retains full resource controls without scale or clipping",
        );
        await page.waitForFunction(
          () => !document.querySelector('[data-sonner-toast][data-type="error"]'),
        );
        if (width < 768) {
          await page.getByLabel("Localizar seção da ficha").selectOption("sec-info");
          const compact = await page.evaluate(() => ({
            headerBottom: document.querySelector(".tadeon-mobile-header").getBoundingClientRect()
              .bottom,
            titleTop: document.querySelector("#sec-info h2").getBoundingClientRect().top,
          }));
          assert(
            compact.titleTop >= compact.headerBottom &&
              compact.titleTop <= compact.headerBottom + 100,
            "Compact anchors clear the shell without reserving a scrolled-away toolbar: " +
              JSON.stringify(compact),
          );
        } else {
          await page
            .locator(".tadeon-sheet-jumpbar")
            .getByRole("button", { name: "Identidade", exact: true })
            .click();
          const sticky = await page.evaluate(() => {
            const shell = document.querySelector(".tadeon-desktop-toolbar").getBoundingClientRect();
            const command = document
              .querySelector(".tadeon-sheet-commandbar")
              .getBoundingClientRect();
            const title = document.querySelector("#sec-info h2").getBoundingClientRect();
            return {
              shellBottom: shell.bottom,
              commandTop: command.top,
              commandBottom: command.bottom,
              titleTop: title.top,
            };
          });
          assert(
            sticky.commandTop >= sticky.shellBottom - 1 &&
              sticky.titleTop >= sticky.commandBottom - 1,
            "Sticky toolbar and section targets remain below the shell header: " +
              JSON.stringify(sticky),
          );
        }
        if (process.env.NEXUS_GAME_SCREENSHOTS === "1") {
          await page.locator("#sec-info").scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/game-identity-${width}.png` });
          await page.locator("#sec-pontos").scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/game-resources-${width}.png` });
        }
        await page.getByRole("button", { name: "Editar", exact: true }).click();
      } else assert(writes.length === 0, "Read-only never writes");
      assert(
        rpcs
          .filter((x) => x.name.startsWith("get_sheet_"))
          .every((x) => x.args.p_sheet_id === sheetId),
        "Explicit controls carry record identity",
      );
      assert(errors.length === 0, errors.join("\n"));
      results.push({
        width,
        state,
        metrics,
        writes: writes.length,
        historyFocus: true,
        inventoryFocus: true,
        retry: state !== "readonly",
        errors,
      });
      await context.close();
      console.log(JSON.stringify({ width, state, passed: true }));
    }
  writeFileSync(`${output}/results.json`, JSON.stringify({ fixtureOnly: true, results }, null, 2));
  console.log(JSON.stringify({ views: results.length, output, passed: true }));
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already stopped */
  }
}
