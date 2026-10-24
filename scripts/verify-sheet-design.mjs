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
let browser;
const launchBrowser = () => chromium.launch({
  executablePath: process.env.NEXUS_CHROMIUM_PATH,
  args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]"),
});
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
async function auditSelection(page) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const list = page.locator(".tadeon-sheet-tabs-list");
  await list.scrollIntoViewIfNeeded();
  await list.locator('[data-tab-value="descricao"]').click();
  await page.waitForTimeout(60);
  await list.locator('[data-tab-value="arvore"]').click();
  await page.waitForTimeout(60);
  await list.locator('[data-tab-value="ficha"]').click();
  await page
    .waitForFunction(
      () => {
        const list = document.querySelector(".tadeon-sheet-tabs-list"),
          active = list.querySelector('[data-state="active"]'),
          plate = list.querySelector(".tadeon-selection-plate");
        if (!active || !plate) return false;
        const a = active.getBoundingClientRect(),
          p = plate.getBoundingClientRect();
        return (
          active.dataset.tabValue === "ficha" &&
          Math.abs(a.x - p.x) < 1 &&
          Math.abs(a.width - p.width) < 1
        );
      },
      undefined,
      { timeout: 5000 },
    )
    .catch(async (error) => {
      const detail = await list.evaluate((e) =>
        [e, ...e.children].map((n) => {
          const r = n.getBoundingClientRect(),
            s = getComputedStyle(n);
          return {
            tag: n.tagName,
            class: n.className,
            state: n.dataset.state,
            rect: [r.x, r.y, r.width, r.height],
            transform: s.transform,
            position: s.position,
            left: s.left,
            top: s.top,
            margin: s.margin,
            style: n.getAttribute("style"),
          };
        }),
      );
      writeFileSync(`${output}/selection-failure.json`, JSON.stringify(detail, null, 2));
      throw error;
    });
  const result = await list.evaluate((e) => ({
    count: e.querySelectorAll(".tadeon-selection-plate").length,
    transition: getComputedStyle(e.querySelector(".tadeon-selection-plate")).transitionDuration,
  }));
  assert(
    result.count === 1 && result.transition !== "0s",
    "One interruptible traveling selection plate",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(
    () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches &&
      getComputedStyle(document.querySelector(".tadeon-sheet-tabs-list .tadeon-selection-plate"))
        .transitionDuration.split(",")
        .every((t) => parseFloat(t) <= 0.001),
  );
  result.reducedMotion = await list
    .locator(".tadeon-selection-plate")
    .evaluate((e) => getComputedStyle(e).transitionDuration);

  return result;
}
try {
  let serverLog = "",
    serverExit = null;
  const captureLog = (chunk) => {
    serverLog = (serverLog + chunk.toString()).slice(-12000);
  };
  server.stdout.on("data", captureLog);
  server.stderr.on("data", captureLog);
  server.on("exit", (code) => {
    serverExit = code ?? -1;
  });
  const deadline = Date.now() + 120000;
  let ready = false;
  while (Date.now() < deadline && serverExit === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.status < 500) {
        ready = true;
        break;
      }
    } catch {
      /* Initial optimization is still in progress. */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error("Vite did not become ready. Exit: " + serverExit + "\n" + serverLog);
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]"))
    for (const state of JSON.parse(
      process.env.NEXUS_AUDIT_STATES || '["editable","readonly","error","loading"]',
    )) {
      // Isolate each software GPU/process lifecycle, as in the Mesa verifier.
      if (browser) await browser.close();
      browser = await launchBrowser();
      const context = await browser.newContext({
        viewport: { width, height: Number(process.env.NEXUS_AUDIT_HEIGHT || 1000) },
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
      if (process.env.NEXUS_POWER_HEADER === "1" || process.env.NEXUS_HEADER_ONLY === "1") {
        await page.locator("[data-page-header=sheet]").waitFor({ timeout: 60000 });
        const header = await page.locator("[data-page-header=sheet]").evaluate((e) => {
          const r = e.getBoundingClientRect(),
            title = e.querySelector(".tadeon-page-header__title"),
            style = getComputedStyle(title);
          return {
            rect: [r.x, r.y, r.width, r.height],
            font: [style.fontFamily, style.fontSize, style.fontWeight],
            titleFont: [style.fontFamily, style.fontSize, style.fontWeight, style.lineHeight],
            padding: (() => {
              const s = getComputedStyle(e.querySelector(".tadeon-page-header__main"));
              return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
            })(),
            markWidth: e.querySelector(".tadeon-page-header__mark").getBoundingClientRect().width,
            position: getComputedStyle(e).position,
            hostStyle: e.closest("[data-page-layout]").getAttribute("style"),
            headerStyle: e.getAttribute("style"),
            offsetValue: getComputedStyle(e).getPropertyValue("--sheet-sticky-top"),
            shellHeaders: [
              ...e
                .closest(".tadeon-shell")
                .querySelectorAll(".tadeon-desktop-toolbar,.tadeon-mobile-header"),
            ].map((h) => [h.className, h.getBoundingClientRect().height]),
            top: getComputedStyle(e).top,
            headingCount: document.querySelectorAll("h1").length,
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        if (process.env.NEXUS_HEADER_ONLY === "1" && width >= 768)
          assert(
            header.position === "relative",
            "Sheet identity scrolls with the folio",
          );
        assert(
          header.headingCount === 1 && !header.overflow,
          "Power header follows the shared route envelope",
        );
        assert(
          parseFloat(header.font[1]) >= 24,
          "Power title is not shrunk by legacy header rules",
        );
        assert(writes.length === 0, "Read-only power header never writes");
        assert(errors.length === 0, JSON.stringify(errors));
        if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1")
          await page.screenshot({ path: `${output}/power-header-${width}.png`, timeout: 20000 });
        results.push({
          width,
          state,
          variant: process.env.NEXUS_POWER_HEADER === "1" ? "power-header" : "sheet-header",
          header,
          errors,
          writes: writes.length,
        });
        writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
        console.log(`Shared sheet/power header verified ${width}`);
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
          ['500 16px "Cormorant Garamond"', '500 16px "Alegreya Sans"', '400 16px "PT Mono"'].map(
            (f) => document.fonts.load(f),
          ),
        );
        await document.fonts.ready;
      });
      if (process.env.NEXUS_ADAPTIVE_ONLY === "1") {
        const captureAdaptive = (options) => process.env.NEXUS_SKIP_SCREENSHOTS === "1" ? Promise.resolve() : page.screenshot(options);
        const measure = () =>
          page.evaluate(() => {
            const rect = (selector) => {
              const e = document.querySelector(selector),
                r = e?.getBoundingClientRect();
              return e
                ? {
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height,
                    position: getComputedStyle(e).position,
                  }
                : null;
            };
            return {
              overflow: document.documentElement.scrollWidth > innerWidth,
              header: rect(".tadeon-sheet-commandbar"),
              identity: rect("#sec-info"),
              attributes: rect("#sec-attr"),
              equilibrium: rect("#equilibrio"),
              exposure: rect("#exposicao"),
              attributesColumns: getComputedStyle(document.querySelector(".tadeon-attribute-grid"))
                .gridTemplateColumns,
              headings: [...document.querySelectorAll(".tadeon-sheet-section__title-group h2")].map(
                (e) => ({
                  text: e.textContent,
                  width: e.getBoundingClientRect().width,
                  height: e.getBoundingClientRect().height,
                  lineHeight: parseFloat(getComputedStyle(e).lineHeight),
                }),
              ),
              stateTargets: [
                ...document.querySelectorAll(
                  ".tadeon-state-controls input, .tadeon-tension-control button",
                ),
              ].map((e) => {
                const r = e.getBoundingClientRect();
                return { width: r.width, height: r.height };
              }),
              targetsFit: [...document.querySelectorAll(".tadeon-attribute-tile button")].every(
                (e) => {
                  const r = e.getBoundingClientRect(),
                    p = e.closest(".tadeon-attribute-tile").getBoundingClientRect();
                  return (
                    r.x >= p.x - 1 && r.right <= p.right + 1 && r.width >= 44 && r.height >= 44
                  );
                },
              ),
            };
          });
        await captureAdaptive({ path: `${output}/top-${state}-${width}.png` });
        const initial = await measure();
        await page.locator("#sec-attr").scrollIntoViewIfNeeded();
        await captureAdaptive({ path: `${output}/attributes-${state}-${width}.png` });
        const scrolled = await measure();
        await page.locator("#equilibrio").scrollIntoViewIfNeeded();
        await captureAdaptive({ path: `${output}/states-${state}-${width}.png` });
        await page.locator("#exposicao").scrollIntoViewIfNeeded();
        await captureAdaptive({ path: `${output}/exposure-${state}-${width}.png` });
        await page.locator("#sec-info").scrollIntoViewIfNeeded();
        const narrative = page.locator(".tadeon-identity-narrative__trigger");
        if ((await narrative.getAttribute("data-state")) === "closed") await narrative.click();
        await page.locator(".tadeon-link-panel").scrollIntoViewIfNeeded();
        const linkLabels = [];
        if (process.env.NEXUS_EXPECT_ADAPTIVE === "1") {
          const trigger = page.getByRole("combobox", { name: "Estado do vínculo 1", exact: true });
          const checkLinkLabel = async () => {
            const result = await trigger.evaluate(e => {
              const value=e.querySelector("span"), icon=e.querySelector("svg"), range=document.createRange();
              range.selectNodeContents(value);
              const text=range.getBoundingClientRect(), box=value.getBoundingClientRect();
              return {text:e.textContent.trim(),textWidth:text.width,available:box.width,inside:text.width>0 && text.width<=box.width+1 && text.right<=icon.getBoundingClientRect().left+1};
            });
            linkLabels.push(result);
            assert(result.inside, "Link state text remains visible: " + JSON.stringify(result));
          };
          await checkLinkLabel();
          if (state === "editable") {
            await trigger.click();
            await page.getByRole("option", {name:"Tensionado",exact:true}).click();
            await checkLinkLabel();
          }
        }
        await captureAdaptive({ path: `${output}/links-${state}-${width}.png` });
        for (const tab of ["descricao", "arvore"]) {
          await page.locator(`.tadeon-sheet-tabs-list [data-tab-value="${tab}"]`).click();
          await captureAdaptive({ path: `${output}/${tab}-${state}-${width}.png` });
          assert(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `Tab ${tab} fits ${width}`,
          );
        }
        assert(!initial.overflow && initial.targetsFit, "Adaptive controls fit");
        if (process.env.NEXUS_EXPECT_ADAPTIVE === "1") {
          assert(
            initial.header.position === "relative" && scrolled.header.y < initial.header.y - 100,
            "Large sheet identity scrolls away",
          );
          assert(
            initial.headings
              .filter((h) => ["Atributos", "Equilíbrio", "Exposição"].includes(h.text))
              .every((h) => h.height < h.lineHeight * 1.5),
            "Instrument titles remain on a readable line",
          );
          assert(
            initial.stateTargets.every((t) => t.width >= 44 && t.height >= 44),
            "State controls retain full touch targets: " + JSON.stringify(initial.stateTargets),
          );
        }
        assert(errors.length === 0, JSON.stringify(errors));
        results.push({ width, state, initial, scrolled, linkLabels, errors });
        writeFileSync(
          `${output}/results.json`,
          JSON.stringify({ fixtureOnly: true, results }, null, 2),
        );
        await context.close();
        console.log(`Adaptive sheet verified ${width} ${state}`);
        continue;
      }
      if (process.env.NEXUS_SELECTION_ONLY === "1") {
        const selection = await auditSelection(page);
        results.push({ width, state, selection, errors });
        writeFileSync(
          `${output}/results.json`,
          JSON.stringify({ fixtureOnly: true, results }, null, 2),
        );
        await context.close();
        continue;
      }
      if (process.env.NEXUS_DENSITY_ONLY === "1") {
        const density = await page.evaluate(async () => {
          const rect = (s) => {
            const e = document.querySelector(s);
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          const samples = [];
          const start = performance.now();
          await new Promise((resolve) => {
            let last,
              n = 0;
            const frame = (now) => {
              if (last !== undefined) samples.push(now - last);
              last = now;
              window.scrollBy(0, 36);
              if (++n < 60) requestAnimationFrame(frame);
              else resolve();
            };
            requestAnimationFrame(frame);
          });
          window.scrollTo(0, 0);
          return {
            height: document.documentElement.scrollHeight,
            viewportHeight:innerHeight,
            overflow:document.documentElement.scrollWidth>innerWidth,
            resourceColumns:getComputedStyle(document.querySelector(".tadeon-vitals-grid")).gridTemplateColumns,
            attributeColumns:getComputedStyle(document.querySelector(".tadeon-attribute-grid")).gridTemplateColumns,
            headerActions: [...document.querySelectorAll('.tadeon-sheet-commandbar__actions button')].map(e=>{const r=e.getBoundingClientRect();return {name:e.getAttribute("aria-label")??e.textContent.trim(),y:r.y,width:r.width,height:r.height};}),
            tabLabels:[...document.querySelectorAll('.tadeon-sheet-tabs-list [role="tab"] span')].map(e=>({label:e.textContent,width:e.clientWidth,scroll:e.scrollWidth,font:getComputedStyle(e).fontFamily})),
            tabLabelsFit:[...document.querySelectorAll('.tadeon-sheet-tabs-list [role="tab"] span')].every(e=>e.scrollWidth<=e.clientWidth+1),
            attributeTargetsFit:[...document.querySelectorAll(".tadeon-attribute-tile button")].every(e=>{const r=e.getBoundingClientRect(),p=e.closest(".tadeon-attribute-tile").getBoundingClientRect();return r.x>=p.x && r.right<=p.right && r.width>=44 && r.height>=44;}),
            identity: rect("#sec-info"),
            vitals: rect("#sec-pontos"),
            attributes: rect("#sec-attr"),
            overview: rect(".tadeon-sheet-overview"),
            resource: rect(".tadeon-stat-block"),
            elements: document.querySelectorAll("*").length,
            permanentFilters: [...document.querySelectorAll("*")].filter((e) => {
              const s = getComputedStyle(e);
              return s.filter !== "none" || s.backdropFilter !== "none";
            }).length,
            scrollSamples: samples,
            elapsed: performance.now() - start,
          };
        });
        assert(!density.overflow && density.attributeTargetsFit, "Compact composition keeps controls inside the viewport");
        if (width<768) {
          assert(density.headerActions.every(a=>a.width>=44 && a.height>=44), "Compact toolbar keeps 44px actions");
          assert(new Set(density.headerActions.map(a=>Math.round(a.y))).size===1, "Primary sheet actions share one row in the compact fixture");
          assert(density.tabLabelsFit, `All three sheet tab labels fit without clipping: ${JSON.stringify(density.tabLabels)}`);
        }
        assert(errors.length===0, `Density probe has no render errors: ${JSON.stringify(errors)}`);
        assert(writes.length<=1 && writes.every(w=>w.body.name===sheet.name), "Density probe permits only the existing mount normalization in the intercepted fixture");
        if (process.env.NEXUS_SKIP_SCREENSHOTS !== "1") {
          await page.screenshot({ path: `${output}/density-${width}.png` });
          await page.locator('#sec-pontos').scrollIntoViewIfNeeded();
          await page.screenshot({path:`${output}/resources-${width}.png`});
        }
        results.push({ width, state, density, errors, fixtureWrites:writes.length });
        writeFileSync(
          `${output}/results.json`,
          JSON.stringify({ fixtureOnly: true, results }, null, 2),
        );
        console.log("density", width, JSON.stringify(density));
        await context.close();
        continue;
      }
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
        metrics.metricFont.includes(width < 768 ? "Cormorant Garamond" : "Alegreya Sans") &&
          metrics.metricFigures.includes("tabular-nums"),
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
        `Attribute controls stay visible inside their instrument: ${JSON.stringify(metrics.attributeControls.filter((c) => !c.fits || c.targets.some((t) => t.w < 44 || t.h < 44 || !t.fits)))}`,
      );
      assert(metrics.labelFont.includes("Alegreya Sans"), "Field labels use interface typography");
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
      const narrative = page.getByRole("button", { name: /Convicções, pergunta e vínculos/ });
      const defaultNarrative = await narrative.getAttribute("aria-expanded");
      if (width < 768)
        assert(defaultNarrative === "false", "Mobile narrative starts folded, with a named entry");
      if (defaultNarrative === "false") await narrative.click();
      await page.getByLabel("Nome do vínculo 1", { exact: true }).waitFor();
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
          fold.animation === "tadeon-material-fold-open" && fold.transform === "none",
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
            sticky.commandBottom < sticky.titleTop && sticky.titleTop >= sticky.shellBottom - 1,
            "Folio header scrolls away and section targets clear the shell: " +
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
      if (state === "editable") metrics.selectionPlate = await auditSelection(page);
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
      writeFileSync(
        `${output}/results.json`,
        JSON.stringify({ fixtureOnly: true, results }, null, 2),
      );
      await context.close();
      console.log(JSON.stringify({ width, state, passed: true }));
    }
  writeFileSync(`${output}/results.json`, JSON.stringify({ fixtureOnly: true, results }, null, 2));
  console.log(JSON.stringify({ views: results.length, output, passed: true }));
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already stopped */
  }
}
