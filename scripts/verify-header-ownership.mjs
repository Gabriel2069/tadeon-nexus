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
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)],
  {
    cwd: repo,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
try {
  let serverLog = "";
  let serverExit = null;
  const capture = chunk => { serverLog = (serverLog + chunk.toString()).slice(-12000); };
  server.stdout.on("data", capture);
  server.stderr.on("data", capture);
  server.on("exit", code => { serverExit = code ?? -1; });
  const deadline = Date.now() + 120000;
  let ready = false;
  while (Date.now() < deadline && serverExit === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000) });
      if (response.status < 500) { ready = true; break; }
    } catch { /* Startup and initial dependency optimization are still in progress. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (!ready) throw new Error("Vite did not become ready. Exit: " + serverExit + "\n" + serverLog);
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
  const layoutAudit = process.env.NEXUS_LAYOUT_AUDIT === "1";
  const workspaceId = "00000000-0000-4000-8000-000000000002";
  const layoutNode = {
    id: "00000000-0000-4000-8000-000000000100",
    workspace_id: workspaceId,
    campaign_id: null,
    author_id: id,
    owner_id: id,
    node_type: "document",
    title: "O arquivo dos fios esquecidos",
    slug: "arquivo",
    summary: "Memórias e vínculos da campanha.",
    content_markdown: "## O primeiro fio\n\nA memória atravessa o arquivo.",
    plain_text: "Memórias",
    properties: {},
    status: "draft",
    visibility: "workspace",
    parent_node_id: null,
    created_at: "2026-10-01",
    updated_at: "2026-10-01",
  };

  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[320,390,820,1440]"))
    for (const route of JSON.parse(
      process.env.NEXUS_AUDIT_ROUTES ||
        JSON.stringify([
          "/",
          "/nexus",
          "/master-panel",
          "/offline",
          "/nexus-tools",
          "/manage-users",
          "/tabletop",
        ]),
    )) {
      const captureScreenshots =
        process.env.NEXUS_SKIP_SCREENSHOTS !== "1" &&
        (!process.env.NEXUS_AUDIT_SCREENSHOT_WIDTHS ||
          JSON.parse(process.env.NEXUS_AUDIT_SCREENSHOT_WIDTHS).includes(width)) &&
        (!process.env.NEXUS_AUDIT_SCREENSHOT_ROUTES ||
          JSON.parse(process.env.NEXUS_AUDIT_SCREENSHOT_ROUTES).includes(route));
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
        else if (layoutAudit && url.pathname.includes("/workspaces"))
          body = [{ id: workspaceId, name: "Arquivo de exemplo" }];
        else if (layoutAudit && url.pathname.includes("/game_settings"))
          body = [
            {
              id: "00000000-0000-4000-8000-000000000099",
              key: "global",
              campaign_title: "O arquivo dos fios esquecidos",
              campaign_phase: "Localizar a Âncora",
              scenes_detailed: [],
              master_npcs: [],
              investigation_clues: [],
              threats: [],
              folds: [],
              interludes: [],
            },
          ];
        else if (layoutAudit && url.pathname.includes("/rpc/search_knowledge_nodes"))
          body = [
            { node_data: layoutNode, relevance: 1, snippet: layoutNode.summary, total_count: 1 },
          ];
        else if (layoutAudit && url.pathname.includes("/knowledge_nodes")) body = [layoutNode];
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
      await page.locator("#tadeon-main").waitFor({ timeout: 180000 });
      if (route === "/tabletop")
        await page
          .locator('canvas[aria-label="Canvas da Mesa Nexus"]')
          .waitFor({ state: "attached", timeout: 20000 })
          .catch((e) => errors.push("Canvas readiness: " + e.message));
      if (layoutAudit && route !== "/") await page.locator("[data-page-header]").first().waitFor();
      if (layoutAudit && route === "/") await page.locator(".tadeon-continuity-hero").waitFor();
      if (process.env.NEXUS_MATERIAL_AUDIT !== "1")
        await page.addStyleTag({
          content:
            "*,*::before,*::after { animation:none!important; transition:none!important; caret-color:transparent!important; }",
        });
      await page.evaluate(async () => {
        await Promise.all(
          [
            '500 16px "Cormorant Garamond"',
            '600 16px "Cormorant Garamond"',
            '700 16px "Cormorant Garamond"',
            '400 16px "Alegreya Sans"',
          ].map((font) => document.fonts.load(font)),
        );
        await document.fonts.ready;
      });
      await page.waitForTimeout(250);
      const craft = process.env.NEXUS_CRAFT_AUDIT === "1" ? await page.evaluate(async () => {
        await new Promise(resolve=>setTimeout(resolve,1000));
        const stage=document.querySelector(".tadeon-route-stage");
        const original=stage.getBoundingClientRect.bind(stage);let reads=0;
        stage.getBoundingClientRect=()=>{reads++;return original();};
        for(let i=0;i<120;i++)stage.dispatchEvent(new PointerEvent("pointermove",{pointerType:"mouse",clientX:350+i%30,clientY:350+i%20}));
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        stage.getBoundingClientRect=original;
        const animations=document.getAnimations().filter(a=>a.playState==="running" && a.effect?.getTiming().iterations===Infinity);
        return {pointerBurst:120,stageBoundsReads:reads,perpetualAnimations:animations.length,animationOwners:animations.map(a=>({name:a.animationName,target:a.effect.target?.className?.baseVal??a.effect.target?.className,pseudo:a.effect.pseudoElement})),pointerSheens:document.querySelectorAll(".tadeon-pointer-sheen").length,backdropPaths:document.querySelectorAll(".tadeon-fabric-backdrop path").length};
      }) : null;
      let radialAudit = null;
      if (route === "/tabletop" && process.env.NEXUS_RADIAL_AUDIT === "1") {
        await page.waitForFunction(() => !!window.__tadeonTabletopRuntime);
        await page.evaluate(() => {
          // The empty server fixture has no persisted scene and is intentionally read-only.
          // Enable only this isolated local engine to exercise its real object commands.
          window.__tadeonTabletopRuntime.engine.setReadOnly(false);
          window.__tadeonTabletopRuntime.engine.addEntityToViewport({ type: "token", label: "Sentinela de teste" });
        });
        const launcher = page.getByRole("button", { name: "Abrir ações rápidas de Sentinela de teste" });
        await launcher.waitFor({ state: "visible", timeout: 15000 }).catch(async error => {
          await page.screenshot({ path: `${root}/${phase}-radial-failure-${width}.png` });
          console.log("Radial setup", await page.evaluate(() => ({ snapshot: window.__tadeonTabletopRuntime?.snapshot(), triggers: [...document.querySelectorAll(".tadeon-radial-trigger")].map(e=>({style:e.getAttribute("style"),visibility:getComputedStyle(e).visibility})), clean: document.documentElement.dataset.tadeonTabletopClean })));
          throw error;
        });
        await launcher.click();
        const menu = page.getByRole("menu", { name: "Ações rápidas de Sentinela de teste" });
        await menu.waitFor();
        await menu.evaluate(async e => {
          await Promise.all(e.getAnimations({ subtree: true })
            .filter(a => a.effect?.getTiming().iterations !== Infinity)
            .map(a => a.finished.catch(() => {})));
        });
        radialAudit = await menu.evaluate(e => {
          const r = e.getBoundingClientRect();
          return { portal: e.parentElement === document.body, rect: [r.x,r.y,r.width,r.height],
            circular: Math.abs(r.width-r.height) < 1,
            inside: r.x >= 0 && r.right <= innerWidth && r.y >= 0 && r.bottom <= innerHeight,
            focus: e.contains(document.activeElement),
            targets: [...e.querySelectorAll('[role="menuitem"]')].map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height];}) };
        });
        if (!radialAudit.circular || !radialAudit.portal || !radialAudit.inside || !radialAudit.focus || radialAudit.targets.some(r => r[0] < 44 || r[1] < 44)) errors.push("Radial geometry/focus failed: " + JSON.stringify(radialAudit));
        await page.screenshot({ path: `${root}/${phase}-radial-${width}.png` });
        await menu.getByRole("menuitem", { name: "Memória", exact: true }).click();
        radialAudit.memoryTargets = await menu.locator(".is-memory button").evaluateAll(buttons => buttons.map(b => { const r=b.getBoundingClientRect(); return [r.width,r.height]; }));
        if (radialAudit.memoryTargets.length !== 4 || radialAudit.memoryTargets.some(r=>r[0]<44 || r[1]<44)) errors.push("Radial memory targets failed");
        await page.keyboard.press("Escape");
        await page.emulateMedia({ reducedMotion: "reduce" });
        radialAudit.reducedTransition = await menu.evaluate(e => getComputedStyle(e).transitionDuration);
        if (radialAudit.reducedTransition.split(",").some(v=>parseFloat(v)>0.001)) errors.push("Radial reduced motion failed");
        await page.keyboard.press("Escape");
        await launcher.waitFor({state:"visible"});
        if (!await launcher.evaluate(e=>e===document.activeElement)) errors.push("Radial return focus failed");
        const before = await launcher.boundingBox();
        await page.evaluate(() => window.__tadeonTabletopRuntime.engine.zoomBy(1.15));
        await page.waitForTimeout(100);
        const after = await launcher.boundingBox();
        radialAudit.follow = { before, after };
        await launcher.click();
        await menu.getByRole("menuitem",{name:"Duplicar",exact:true}).click();
        radialAudit.entities = await page.evaluate(()=>window.__tadeonTabletopRuntime.snapshot().scene.entities.length);
        if (radialAudit.entities !== 2) errors.push("Radial duplication did not delegate to scene engine");
      }
      const selectionGeometry = await page.evaluate(()=>[...document.querySelectorAll('[data-selection-rail]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).map(e=>{
        const active=e.querySelector('[role="tab"][data-state="active"],[aria-current="page"],[aria-pressed="true"],[data-more-active="true"]'),plate=e.querySelector('.tadeon-selection-plate');
        if(!active||!plate)return null;const a=active.getBoundingClientRect(),p=plate.getBoundingClientRect();return {host:e.className,position:getComputedStyle(e).position,active:[a.x,a.y,a.width,a.height],plate:[p.x,p.y,p.width,p.height],plateStyle:plate.getAttribute('style'),scroll:[e.scrollLeft,e.scrollTop],aligned:Math.abs(a.x-p.x)<1&&Math.abs(a.y-p.y)<1&&Math.abs(a.width-p.width)<1&&Math.abs(a.height-p.height)<1};
      }).filter(Boolean));
      if(selectionGeometry.some(e=>!e.aligned)) errors.push('Selection plate does not match its control');
      const metrics = await page.evaluate(() => ({
        selectedCounts:[...document.querySelectorAll('.tadeon-primary-nav,.tadeon-mobile-dock')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0).map(e=>e.querySelectorAll('[aria-current="page"],[data-more-active="true"]').length),
        frameWidth:document.querySelector('[data-page-layout]')?.getBoundingClientRect().width,
        dockPosition:document.querySelector('.tadeon-mobile-dock') ? getComputedStyle(document.querySelector('.tadeon-mobile-dock')).position : null,
        interfaceFont: getComputedStyle(document.body).fontFamily,
        interfaceFaceLoaded: [...document.fonts].some(f=>f.family.includes("Alegreya Sans") && f.status==="loaded"),
        summary: (()=>{const e=document.querySelector('.tadeon-utility-summary');return e ? {height:e.getBoundingClientRect().height,columns:getComputedStyle(e.querySelector('dl')).gridTemplateColumns}:null;})(),
        pageHeader: (() => {
          const header = document.querySelector("[data-page-header]");
          const frame = header?.closest("[data-page-layout]");
          if (!header || !frame) return null;
          const main = header.querySelector(".tadeon-page-header__main"),
            mark = header.querySelector(".tadeon-page-header__mark"),
            title = header.querySelector(".tadeon-page-header__title");
          const s = getComputedStyle(main),
            t = getComputedStyle(title),
            f = getComputedStyle(frame);
          const rect = (e) => {
            const r = e.getBoundingClientRect();
            return [r.x, r.y, r.width, r.height];
          };
          return {
            section: header.dataset.pageHeader,
            rect: rect(header),
            frame: rect(frame),
            padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft],
            framePadding: [f.paddingTop, f.paddingRight, f.paddingBottom, f.paddingLeft],
            mark: rect(mark),
            title: rect(title),
            titleFont: [t.fontFamily, t.fontSize, t.fontWeight, t.lineHeight],
            grid: s.gridTemplateColumns,
            actions: [...header.querySelectorAll(".tadeon-page-header__actions button")].map(
              (e) => ({ name: e.textContent.trim(), rect: rect(e) }),
            ),
            directChildren: header.children.length,
          };
        })(),
        overflow: document.documentElement.scrollWidth > innerWidth,
        mainCount: document.querySelectorAll("main").length,
        titleColor: document.querySelector("h1")
          ? getComputedStyle(document.querySelector("h1")).color
          : null,
        activeNavigation: Array.from(
          document.querySelectorAll(
            '.tadeon-nav-item[aria-current="page"],.tadeon-mobile-dock__item[aria-current="page"]',
          ),
        )
          .filter((e) => e.getBoundingClientRect().width > 0)
          .map((e) => ({ label: e.textContent.trim(), color: getComputedStyle(e).color })),
        material: Array.from(
          document.querySelectorAll(".tadeon-material-card,.tadeon-material-button"),
        )
          .slice(0, 8)
          .map((element) => {
            const style = getComputedStyle(element);
            return {
              slot: element.dataset.slot,
              background: style.backgroundColor,
              shadow: style.boxShadow,
              radius: style.borderRadius,
              transform: style.transform,
              translate: style.translate,
            };
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
        const card = page.locator(".tadeon-material-card").filter({ visible: true }).first();
        if (await card.count()) {
          await card.scrollIntoViewIfNeeded();
          const before = await card.boundingBox();
          await card.hover({ position: { x: 28, y: 20 } });
          await page.waitForTimeout(300);
          const after = await card.boundingBox();
          metrics.cardResponse = await card.evaluate((e) => ({
            lightX: e.style.getPropertyValue("--material-x"),
            transform: getComputedStyle(e).transform,
          }));
          if (
            !metrics.cardResponse.lightX ||
            metrics.cardResponse.transform !== "none" ||
            Math.abs(before.x - after.x) > 0.1 ||
            Math.abs(before.y - after.y) > 0.1
          )
            errors.push("Card light moved the content plane");
        }
      }
      if (layoutAudit && route === "/nexus") {
        const tools = page.getByRole("button", { name: "Ferramentas", exact: true });
        await tools.focus();
        await page.keyboard.press("Enter");
        const item = page.getByRole("menuitem", { name: "Importar / exportar", exact: true });
        await item.waitFor();
        await item.click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        await dialog.evaluate((element) =>
          Promise.all(
            element
              .getAnimations()
              .filter((a) => a.effect?.getTiming().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          ),
        );
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached" });
        await page
          .waitForFunction(
            () => document.activeElement?.textContent?.trim() === "Ferramentas",
            undefined,
            { timeout: 5000 },
          )
          .catch(async () => {
            errors.push("Nexus tools dialog did not return focus to its trigger");
            metrics.toolsFocusFailure = await page.evaluate(() => ({
              tag: document.activeElement?.tagName,
              id: document.activeElement?.id,
              role: document.activeElement?.getAttribute("role"),
              text: document.activeElement?.textContent?.slice(0, 160),
            }));
          });
        const explore = page.getByRole("button", { name: "Explorar", exact: true });
        if (await explore.isVisible()) {
          await explore.click({timeout:5000}).catch(async error=>{
            const detail=await explore.evaluate(e=>{const r=e.getBoundingClientRect();return {rect:[r.x,r.y,r.width,r.height],hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,400),ancestors:[e,...(()=>{let p=e.parentElement,a=[];while(p){a.push(p);p=p.parentElement;}return a;})()].map(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {tag:n.tagName,class:n.className,rect:[r.x,r.y,r.width,r.height],position:s.position,overflow:s.overflow,zIndex:s.zIndex,pointerEvents:s.pointerEvents,clipPath:s.clipPath,transform:s.transform};})};});
            writeFileSync(`${root}/explore-failure-${width}.json`,JSON.stringify(detail,null,2));
            await page.screenshot({path:`${root}/explore-failure-${width}.png`});throw error;
          });
          if (
            !(await page
              .getByRole("textbox", { name: "Buscar no Nexus", exact: true })
              .evaluate((e) => document.activeElement === e))
          )
            errors.push("Explorer jump did not focus search");
          await page.getByRole("button", { name: "Voltar à leitura", exact: true }).click();
          if (
            !(await page
              .locator(".tadeon-nexus-manuscript-title")
              .evaluate((e) => document.activeElement === e))
          )
            errors.push("Return to reading lost focus");
        }
        metrics.knowledgeNavigation = { toolsDialogFocus: true, compactExplorer: width < 1180 };
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      if (captureScreenshots) {
        await page.mouse.move(0, 0);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      }
      if (layoutAudit) {
        const header = metrics.pageHeader;
        if (!header && route !== "/") errors.push("Missing common page header/envelope");
        else if (route === "/") {
          if (header || await page.locator("h1").count() !== 1) errors.push("Dashboard has a duplicate route opening");
        }
        else {
          const reference = results.find(
            (item) => item.width === width && item.pageHeader,
          )?.pageHeader;
          if (
            reference &&
            (Math.abs(reference.rect[0] - header.rect[0]) > 0.6 ||
              Math.abs(reference.rect[2] - header.rect[2]) > 0.6 ||
              JSON.stringify(reference.padding) !== JSON.stringify(header.padding) ||
              JSON.stringify(reference.titleFont) !== JSON.stringify(header.titleFont) ||
              Math.abs(reference.mark[2] - header.mark[2]) > 0.1)
          )
            errors.push("Page header anatomy diverges from the shared envelope");
          if (header.actions.some((action) => action.rect[3] > 0 && action.rect[3] < 43.9))
            errors.push("Page action under 44px");
          if (
            await page
              .locator(
                ".tadeon-workspace-popout-host,.tadeon-nexus-sheet-drag-host,.tadeon-master-toolbar-popout-host",
              )
              .count()
          )
            errors.push("Legacy header injection returned");
        }
      }
      if (metrics.selectedCounts.some(n=>n>1)) errors.push("Navigation exposes more than one selected destination");
      if (width < 768 && (metrics.frameWidth < width-40 || (metrics.dockPosition !== null && metrics.dockPosition !== "fixed"))) errors.push("Compact shell lost its frame width or fixed dock");
      if (!metrics.interfaceFont.includes("Alegreya Sans") || !metrics.interfaceFaceLoaded) errors.push("The hosted interface font did not load");
      if (metrics.activeNavigation.some((item) => item.color !== "rgb(233, 227, 213)"))
        errors.push("Active navigation label lost its ivory contrast");
      const name = route.slice(1) || "dashboard";
      if (captureScreenshots)
        await page.screenshot({
          path: `${root}/${phase}-${name}-${width}.png`,
          fullPage: false,
          timeout: 20000,
        });
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
          await dialog.evaluate((element) =>
            Promise.all(
              element
                .getAnimations()
                .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
                .map((animation) => animation.finished.catch(() => {})),
            ),
          );
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
            await page.waitForFunction(
              () =>
                document.documentElement.style.getPropertyValue("--tadeon-vv-height") === "600px" &&
                document.documentElement.dataset.tadeonKeyboardOpen === "true",
            );
            await page.waitForFunction(() => {
              const dialog = document.querySelector(".tadeon-global-search-dialog");
              const rect = dialog.getBoundingClientRect();
              return rect.y >= -1 && rect.bottom <= 601;
            });
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
          const material = await dialog.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              animation: style.animationName,
              duration: style.animationDuration,
              scale: style.scale,
              origin: style.transformOrigin,
              shadow: style.boxShadow,
              radius: style.borderRadius,
              tone: style.getPropertyValue("--material-rgb").trim(),
            };
          });
          const rect = await dialog.boundingBox();
          const contained =
            !!rect &&
            rect.x >= -1 &&
            rect.y >= -1 &&
            rect.x + rect.width <= width + 1 &&
            rect.y + rect.height <= 1001;
          if (captureScreenshots)
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
          await dialog.waitFor({ state: "detached" });
          await page.waitForFunction(
            (element) => document.activeElement === element,
            await trigger.elementHandle(),
          );
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
        await cdp.send("Emulation.setEmulatedMedia", {
          features: [
            { name: "prefers-reduced-motion", value: "reduce" },
            { name: "prefers-reduced-transparency", value: "reduce" },
            { name: "prefers-contrast", value: "more" },
          ],
        });
        const preferences = await page.evaluate(() => {
          const nav = document.querySelector(
            innerWidth < 768 ? ".tadeon-mobile-header" : ".tadeon-desktop-toolbar",
          );
          return {
            motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            transparency: matchMedia("(prefers-reduced-transparency: reduce)").matches,
            contrast: matchMedia("(prefers-contrast: more)").matches,
            filter: getComputedStyle(nav).backdropFilter,
          };
        });
        if (
          !preferences.motion ||
          !preferences.transparency ||
          !preferences.contrast ||
          preferences.filter !== "none"
        )
          errors.push("Material preferences failed: " + JSON.stringify(preferences));
        const trigger = page
          .getByRole("button", {
            name: width < 768 ? "Conta" : "Abrir configurações da conta",
            exact: true,
          })
          .filter({ visible: true })
          .first();
        await trigger.click();
        const dialog = page.getByRole("dialog").last();
        await dialog.waitFor();
        preferences.popup = await dialog.evaluate((e) => ({
          animation: getComputedStyle(e).animationName,
          border: getComputedStyle(e).borderColor,
        }));
        if (preferences.popup.animation !== "none") errors.push("Reduced popup retained animation");
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached" });
        metrics.preferences = preferences;
        await cdp.detach();
      }
      results.push({ route, width, errors, interactions, selectionGeometry, craft, radialAudit, ...metrics });
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
