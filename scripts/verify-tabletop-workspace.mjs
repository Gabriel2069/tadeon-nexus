/** NEX-007: isolated scene fixtures. All backend requests are intercepted. */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { installDesignFonts } from "./design-font-fixtures.mjs";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const output = process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-tabletop-workspace";
mkdirSync(output, { recursive: true });
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const uid = "00000000-0000-4000-8000-000000000001",
  wid = "00000000-0000-4000-8000-000000000002";
const id = (n) => `00000000-0000-4000-8000-${String(n + 100).padStart(12, "0")}`;
const scenes = [0, 1, 2].map((n) => ({
  id: id(n),
  campaign_id: id(20),
  name: ["O salão dos fios", "Jardim encoberto", "Arquivo antigo"][n],
  status: n === 2 ? "archived" : "draft",
  width: 2400,
  height: 1600,
  grid_type: "square",
  grid_size: 64,
  grid_offset_x: 0,
  grid_offset_y: 0,
  grid_scale: 1,
  snap_enabled: true,
  global_illumination: 1,
  background_asset_id: null,
  order_index: n,
  version: 1,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
}));
const layers = ["map", "objects", "tokens", "drawings", "master"].map((type, n) => ({
  id: id(30 + n),
  scene_id: id(0),
  name: ["Mapa", "Objetos", "Personagens", "Desenhos", "Mestre"][n],
  layer_type: type,
  order_index: n,
  visible: true,
  locked: false,
  version: 1,
}));
const entities = [0, 1, 2].map((n) => ({
  id: id(50 + n),
  scene_id: id(0),
  layer_id: id(n === 0 ? 32 : 31),
  level_id: id(40),
  entity_type: n === 0 ? "token" : "object",
  name: ["Ariadne", "Pedestal", "Porta oculta"][n],
  x: 640 + n * 210,
  y: 600,
  width: 80,
  height: 80,
  rotation: 0,
  elevation: 0,
  z_index: n,
  hidden: n === 2,
  locked: false,
  owner_user_id: uid,
  properties: { color: n === 0 ? 0x8d3152 : 0x547b94 },
  asset_id: null,
  linked_sheet_id: null,
  linked_knowledge_node_id: null,
  version: 1,
}));
// A fresh browser per viewport keeps software GPU contexts isolated.
let browser;
const launchBrowser = () =>
  chromium.launch({
    executablePath: process.env.NEXUS_CHROMIUM_PATH,
    args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]"),
  });
const port = 6135,
  server = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)],
    { detached: true, stdio: ["ignore", "pipe", "pipe"] },
  );
const results = [];
const role = process.env.NEXUS_AUDIT_ROLE || "mestre";
const functional = process.env.NEXUS_AUDIT_SCOPE !== "baseline";
try {
  await new Promise((ok, fail) => {
    server.stdout.on("data", (b) => {
      if (b.toString().includes("Local:")) ok();
    });
    server.stderr.on("data", (b) => console.log(b.toString().slice(0, 500)));
    server.on("exit", (c) => fail(Error(`Vite ${c}`)));
    setTimeout(() => fail(Error("Vite timeout")), 30000).unref();
  });
  for (const width of JSON.parse(process.env.NEXUS_AUDIT_WIDTHS || "[390,1440]")) {
    if (browser) await browser.close();
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: width === 1440 ? "no-preference" : "reduce",
      hasTouch: width < 900,
      deviceScaleFactor: Number(process.env.NEXUS_AUDIT_DPR || 1),
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const errors = [],
      writes = [],
      requests = [],
      operations = [];
    const sceneRows = structuredClone(scenes),
      entityRows = structuredClone(entities);
    for (const scene of sceneRows)
      Object.assign(scene, { fog_enabled: false, fog_opacity: 0.85, visibility_version: 1 });
    let releaseSave = null,
      holdSave = false;
    const environment = { lights: [], walls: [], fog: [] };
    const directorState = {
      mode: "scene",
      title: "",
      subtitle: "",
      showGrid: true,
      showHud: false,
      camera: {
        mode: "fit",
        x: 0,
        y: 0,
        zoom: 1,
        projection: "plan",
        levelId: id(40),
        yaw: 45,
        tilt: 0.5,
        elevationScale: 1,
      },
      cues: [],
      activeCueId: null,
      autoAdvance: false,
    };
    const room = {
      id: id(70),
      campaign_id: id(20),
      current_scene_id: id(0),
      name: "Sessão dos fios",
      status: "open",
      join_locked: false,
      version: 1,
      director_state: directorState,
      created_by: uid,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    };
    const playerView = {
      session: {
        id: room.id,
        campaignId: room.campaign_id,
        currentSceneId: room.current_scene_id,
        name: room.name,
        version: room.version,
        joinLocked: false,
        directorState,
      },
      participant: { role: "player", canInteract: true },
      visibility: null,
      scene: {
        id: id(0),
        name: sceneRows[0].name,
        width: 2400,
        height: 1600,
        gridMode: "square",
        gridSize: 64,
        gridScale: 1,
        snap: true,
        activeLevelId: id(40),
        levels: [
          {
            id: id(40),
            name: "Térreo",
            order: 0,
            baseElevation: 0,
            height: 192,
            visible: true,
            locked: false,
            version: 1,
          },
        ],
        layers: layers
          .filter((l) => l.layer_type !== "master")
          .map((l) => ({
            id: l.id,
            name: l.name,
            order: l.order_index,
            visible: true,
            locked: false,
            layerType: l.layer_type,
          })),
        entities: entityRows
          .filter((e) => !e.hidden)
          .map((e) => ({
            id: e.id,
            layerId: e.layer_id,
            type: e.entity_type,
            label: e.name,
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height,
            rotation: 0,
            zIndex: e.z_index,
            hidden: false,
            locked: false,
            color: 0x547b94,
            elevation: 0,
            levelId: id(40),
            controllable: e.entity_type === "token",
            properties: {},
          })),
      },
    };

    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("Page error", e.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") console.log("Console", message.text().slice(0, 500));
    });
    console.log("Opening fixture", width);
    const user = {
      id: uid,
      aud: "authenticated",
      role: "authenticated",
      email: "fixture@nexus.test",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    };
    const token = [
      { alg: "HS256", typ: "JWT" },
      { sub: uid, aud: "authenticated", role: "authenticated", exp: 2000000000 },
      "fixture",
    ]
      .map((v) =>
        typeof v === "string" ? v : Buffer.from(JSON.stringify(v)).toString("base64url"),
      )
      .join(".");
    await page.addInitScript(
      ({ user, token }) => {
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
        );
      },
      { user, token },
    );
    await page.routeWebSocket("**", (socket) => socket.close());
    await page.route("**/*.supabase.co/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        name = url.pathname.split("/").at(-1);
      requests.push(`${req.method()} ${name}`);
      let body = [];
      if (req.method() === "POST" && name === "tabletop-view") {
        assert(
          role === "jogador" && req.postDataJSON().sessionId === room.id,
          "Scoped player view",
        );
        operations.push({ kind: "participant-read" });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(playerView),
        });
      }
      if (req.method() === "POST" && name === "save_tabletop_scene_state") {
        const value = req.postDataJSON(),
          scene = sceneRows.find((s) => s.id === value.target_scene_id);
        assert(scene && scene.version === value.expected_scene_version, "Expected scene version");
        operations.push({
          kind: "scene-save",
          version: value.expected_scene_version,
          entities: structuredClone(value.entity_documents),
        });
        if (holdSave) {
          holdSave = false;
          await new Promise((resolve) => (releaseSave = resolve));
        }
        Object.assign(scene, value.scene_document, { version: scene.version + 1 });
        entityRows.splice(
          0,
          entityRows.length,
          ...value.entity_documents.map((e) => ({
            ...e,
            scene_id: scene.id,
            version: e.version + 1,
            properties: Object.fromEntries(Object.entries(e.properties ?? {}).sort(([a], [b]) => a.localeCompare(b))),
          })),
        );
        return route.fulfill({ status: 200, contentType: "application/json", body: "null" });
      }
      if (req.method() === "POST" && name === "save_tabletop_visibility_state") {
        const value = req.postDataJSON(),
          scene = sceneRows.find((s) => s.id === value.target_scene_id);
        assert(
          scene && scene.visibility_version === value.expected_visibility_version,
          "Expected environment version",
        );
        operations.push({ kind: "environment-save", lights: value.light_documents.length });
        Object.assign(scene, {
          global_illumination: value.illumination,
          fog_enabled: value.fog_enabled,
          fog_opacity: value.fog_opacity,
          visibility_version: scene.visibility_version + 1,
          version: scene.version + 1,
        });
        environment.lights = value.light_documents;
        environment.walls = value.wall_documents;
        environment.fog = value.fog_documents;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(scene.visibility_version),
        });
      }
      if (req.method() === "POST" && name === "tabletop_view_preferences") {
        const value = req.postDataJSON();
        assert(
          value.user_id === uid && scenes.some((scene) => scene.id === value.scene_id),
          "Scoped view preference",
        );
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      if (
        !["GET", "HEAD"].includes(req.method()) &&
        !["project_heartbeat", "app_error_logs"].includes(name)
      ) {
        writes.push(`${req.method()} ${name}`);
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: '{"message":"Unexpected fixture mutation"}',
        });
      }
      if (name === "user") body = user;
      else if (name === "profiles")
        body = [{ id: uid, email: user.email, full_name: "Mestre de teste" }];
      else if (name === "user_roles") body = [{ user_id: uid, role }];
      else if (name === "feature_flags")
        body = ["knowledge", "graph", "assets_v2", "tabletop", "realtime", "lighting", "r2"].map(
          (x) => ({
            key: `nexus_${x}_enabled`,
            enabled:
              ["knowledge", "graph", "tabletop"].includes(x) ||
              (functional && x === "lighting") ||
              (role === "jogador" && x === "realtime"),
          }),
        );
      else if (name === "campaigns")
        body = [{ id: id(20), workspace_id: wid, name: "Véu & Trama", status: "active" }];
      else if (name === "tabletop_scenes")
        body = url.searchParams.has("id")
          ? sceneRows.filter((s) => `eq.${s.id}` === url.searchParams.get("id"))
          : sceneRows;
      else if (name === "tabletop_layers") body = layers;
      else if (name === "tabletop_levels")
        body = [
          {
            id: id(40),
            scene_id: id(0),
            name: "Térreo",
            order_index: 0,
            base_elevation: 0,
            height: 192,
            visible: true,
            locked: false,
            version: 1,
          },
        ];
      else if (name === "tabletop_sessions") body = role === "jogador" ? [room] : [];
      else if (name === "tabletop_session_participants")
        body =
          role === "jogador"
            ? [
                {
                  session_id: room.id,
                  user_id: uid,
                  role: "player",
                  state: "active",
                  joined_at: room.created_at,
                  last_seen_at: room.created_at,
                  left_at: null,
                },
              ]
            : [];
      else if (name === "tabletop_entities") body = entityRows;
      else if (name === "tabletop_lights") body = environment.lights;
      else if (name === "tabletop_walls") body = environment.walls;
      else if (name === "tabletop_fog_strokes") body = environment.fog;
      if (Array.isArray(body) && req.headers().accept?.includes("vnd.pgrst.object"))
        body = body[0] || null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await installDesignFonts(page);
    await page.goto(`http://127.0.0.1:${port}/tabletop`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    console.log("DOM ready", width);
    await page
      .waitForFunction(
        (count) => window.__tadeonTabletopRuntime?.snapshot().scene.entities.length === count,
        role === "mestre" ? 3 : 2,
        { timeout: 180000 },
      )
      .catch(async (error) => {
        console.log("Readiness failure", JSON.stringify({ errors, requests }));
        await page.screenshot({
          timeout: 10000,
          path: `${output}/${width}-failure.png`,
          fullPage: true,
        });
        console.log(
          JSON.stringify({
            errors,
            requests,
            body: (await page.locator("body").innerText()).slice(0, 6000),
            runtime: await page.evaluate(() => ({
              runtime: !!window.__tadeonTabletopRuntime,
              scene: window.__tadeonTabletopRuntime?.snapshot().scene.id,
              entities: window.__tadeonTabletopRuntime?.snapshot().scene.entities.length,
            })),
          }),
        );
        throw error;
      });
    await page.waitForTimeout(2000);
    const pixels = await page.evaluate(() => {
      const rt = window.__tadeonTabletopRuntime,
        canvas = rt.host.querySelector('canvas[aria-label="Canvas da Mesa Nexus"]'),
        box = canvas.getBoundingClientRect();
      return {
        cssWidth: box.width,
        cssHeight: box.height,
        logicalWidth: rt.engine.app.screen.width,
        logicalHeight: rt.engine.app.screen.height,
        dpr: devicePixelRatio,
      };
    });
    assert(
      Math.abs(pixels.cssWidth - pixels.logicalWidth) < 1.5 &&
        Math.abs(pixels.cssHeight - pixels.logicalHeight) < 1.5,
      "Logical renderer matches the visible canvas",
    );

    async function verifyPointerSelection() {
      await page
        .locator('.tadeon-tabletop-canvas-host canvas[aria-label="Canvas da Mesa Nexus"]')
        .scrollIntoViewIfNeeded();
      const tokenPoint = await page.evaluate((entityId) => {
        const rt = window.__tadeonTabletopRuntime;
        rt.engine.setToolMode("select");
        rt.engine.clearSelection();
        rt.engine.select(entityId, false);
        rt.engine.focusSelection();
        rt.engine.clearSelection();
        const entity = rt.snapshot().scene.entities.find((e) => e.id === entityId);
        return rt.worldToClient({
          x: entity.x + entity.width / 2,
          y: entity.y + entity.height / 2,
        });
      }, id(50));
      await page.mouse.click(tokenPoint.x, tokenPoint.y);
      await page.waitForFunction(
        (entityId) => window.__tadeonTabletopRuntime.snapshot().selectedIds.includes(entityId),
        id(50),
        { timeout: 15000 },
      );
    }

    async function capture(state) {
      const metrics = await page.evaluate(() => ({
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        stage: (() => {
          const r = document
            .querySelector(".tadeon-tabletop-stage,.tadeon-participant-view__stage")
            .getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        })(),
        buttons: [
          ...document.querySelectorAll(
            ".tadeon-tabletop-studio button,.tadeon-tabletop-progressive-dock button",
          ),
        ]
          .filter((e) => e.getBoundingClientRect().height > 0)
          .map((e) => ({
            label: e.getAttribute("aria-label") || e.textContent?.trim(),
            disabled: e.disabled,
          })),
      }));
      const screenshotStates = process.env.NEXUS_AUDIT_SCREENSHOT_STATES?.split(",");
      if (
        !process.env.NEXUS_SKIP_SCREENSHOTS &&
        (!screenshotStates || screenshotStates.includes(state))
      )
        await page.screenshot({
          path: `${output}/${width}-${state}.png`,
          animations: "disabled",
          timeout: 20000,
        });
      results.push({
        width,
        state,
        ...metrics,
        pixelMetrics: pixels,
        errors: [...errors],
        writes: [...writes],
        operations: structuredClone(operations),
      });
      writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
      console.log(width, state, JSON.stringify(metrics.stage));
      assert(!metrics.overflow, "Page overflow");
      assert(
        metrics.stage.x >= -1 && metrics.stage.x + metrics.stage.width <= metrics.viewportWidth + 1,
        "Stage fits the visible viewport",
      );
      assert(!errors.length, errors.join("; "));
      assert(!writes.length, writes.join("; "));
    }
    if (role === "jogador") {
      assert(
        await page.locator(".tadeon-tabletop-progressive-dock").isVisible(),
        "Player controls are mounted",
      );
      assert(
        !(await page.getByRole("button", { name: "Editar Mesa", exact: true }).count()),
        "No master editor for players",
      );
      assert(
        await page.evaluate(() =>
          window.__tadeonTabletopRuntime
            .snapshot()
            .scene.entities.every((e) => !e.hidden && e.label !== "Porta oculta"),
        ),
        "Player fixture contains visible entities only",
      );
      const pan = page.getByRole("button", { name: "Mover câmera", exact: true });
      await pan.click();
      assert(
        (await pan.getAttribute("aria-pressed")) === "true",
        "Player tool follows engine callback",
      );
      await page.getByRole("button", { name: "Selecionar", exact: true }).click();
      assert(
        await page
          .locator(".tadeon-tabletop-realtime__status strong")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        "Connection status label is readable",
      );
      const support = page.getByRole("button", { name: "Áudio", exact: true });
      assert(
        await support.evaluate((el) => !!el.closest("header")),
        "Audio stays in the participant header",
      );
      await capture("player-view");
      await page.getByRole("button", { name: "Abrir comandos", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Comandos da Mesa", exact: true });
      await dialog.waitFor();
      await dialog.getByRole("combobox", { name: "Buscar comando" }).fill("duplicar");
      assert(!(await dialog.getByRole("option").count()), "No master commands");
      await capture("player-commands");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      const reads = operations.filter((o) => o.kind === "participant-read").length;
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes("/functions/v1/tabletop-view") &&
            response.request().method() === "POST",
        ),
        page.getByRole("button", { name: "Atualizar", exact: true }).click(),
      ]);
      await page.waitForFunction(
        () => window.__tadeonTabletopRuntime?.snapshot().scene.entities.length === 2,
      );
      assert(
        operations.filter((o) => o.kind === "participant-read").length > reads,
        "Player refresh reads the protected view",
      );
      const retry = page.getByRole("button", { name: "Reconectar", exact: true });
      await retry.waitFor({ state: "visible", timeout: 20000 });
      await retry.click();
      await capture("player-reconnect-attempt");
      await page.evaluate(
        (entityId) => window.__tadeonTabletopRuntime.engine.select(entityId, false),
        id(50),
      );
      const tactics = page.locator(".tadeon-participant-view__tactics");
      await tactics.waitFor();
      assert(
        await tactics.evaluate((el) => !!el.closest("header")),
        "Player tactical tools share the header flow",
      );
      const tb = await tactics.boundingBox();
      console.log("Tactical bounds", JSON.stringify(tb));
      await capture("player-tactics");
      assert(tb.x >= 0 && tb.x + tb.width <= width + 1, "Player tactical tools fit");
      await tactics.getByRole("button", { name: "Planejar", exact: true }).click();
      await tactics.getByRole("button", { name: "Encerrar prévia tática", exact: true }).click();
      await capture("player-tactics-idle");

      await context.close();
      continue;
    }
    await capture("play");
    const resources = page.getByRole("button", { name: "Recursos da cena", exact: true });
    await resources.click();
    const supportMenu = page.locator(".tadeon-tabletop-support-menu");
    await supportMenu.waitFor();
    await supportMenu.getByRole("button", { name: "Áudio", exact: true }).click();
    assert(
      (await supportMenu
        .getByRole("button", { name: "Áudio", exact: true })
        .getAttribute("aria-pressed")) === "true",
      "Audio control responds in the resource menu",
    );
    await page.keyboard.press("Escape");
    await supportMenu.waitFor({ state: "detached" });
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Recursos da cena",
    );

    if (process.env.NEXUS_AUDIT_SCOPE === "geometry") {
      await verifyPointerSelection();
      await capture("pointer-selection");
      const delta = await page.evaluate(() => {
        const rt = window.__tadeonTabletopRuntime;
        rt.engine.setProjectionMode("isometric");
        const p = { x: 800, y: 650 },
          w = rt.clientToWorld(rt.worldToClient(p));
        return Math.hypot(p.x - w.x, p.y - w.y);
      });
      assert(delta < 0.01, "High-density projection round trip");
      await capture("projection");
      if (width === 1440) {
        await page.getByRole("button", { name: "Editar Mesa", exact: true }).click();
        await page.setViewportSize({ width: 820, height: 1000 });
        const editor = page.getByRole("dialog", { name: "Editor da Mesa", exact: true });
        await editor.waitFor();
        await page.waitForFunction(() =>
          document
            .querySelector('.tadeon-tabletop-panel[role="dialog"]')
            ?.contains(document.activeElement),
        );
        await capture("resize-compact-editor");
        await page.keyboard.press("Escape");
        await editor.waitFor({ state: "hidden" });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.getByRole("complementary", { name: "Painel de edição da Mesa Nexus" }).waitFor();
        await capture("resize-wide-editor");
      }

      await context.close();
      continue;
    }

    await page.getByRole("button", { name: "Editar Mesa", exact: true }).click();
    await page.waitForTimeout(450);
    await capture("edit");
    if (process.env.NEXUS_AUDIT_SCOPE === "baseline") {
      await context.close();
      continue;
    }
    for (const area of ["library", "space", "master", "scene", "inspector"]) {
      if (width < 1200)
        await page
          .getByRole("combobox", { name: "Área do editor", exact: true })
          .selectOption(area);
      else await page.locator(`#tabletop-tab-${area}`).click();
      await page.locator(`#tabletop-panel-${area}`).waitFor({ state: "visible" });
      await capture(`editor-${area}`);
    }
    // Native activation plus hit testing isolates the callback from a racing 2.2s autosave.
    async function activateSave() {
      const result = await page.locator(".tadeon-tabletop-mobile-save").evaluate((element) => {
        element.scrollIntoView({ block: "center", behavior: "instant" });
        if (element.disabled) return { activated: false, label: element.textContent };
        const box = element.getBoundingClientRect(),
          target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        if (!target || !element.contains(target)) return { activated: false, blocked: true };
        element.click();
        return { activated: true };
      });
      assert(!result.blocked, "Save control is not obscured");
      operations.push({ kind: "save-control-activation", ...result });
    }
    async function closeEditor() {
      const dialog = page.getByRole("dialog", { name: "Editor da Mesa", exact: true });
      if (await dialog.isVisible()) {
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "detached" });
      }
    }
    if (process.env.NEXUS_AUDIT_SCOPE === "color") {
      await page.evaluate(entityId => window.__tadeonTabletopRuntime.engine.select(entityId, false), id(50));
      const color = page.getByLabel("Personalizada", { exact: true });
      await color.fill("#123456");
      await closeEditor();
      await activateSave();
      await page.waitForFunction(() => document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvo"));
      assert(entityRows.find(e => e.id === id(50)).properties.base_color === 0x123456, "Custom color persisted with jsonb key ordering");
      const toast = page.locator('[data-sonner-toast]').filter({ visible: true }).first();
      await toast.waitFor();
      const toastMaterial = await toast.evaluate(e => ({ color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor, zIndex: getComputedStyle(e.closest('[data-sonner-toaster]')).zIndex }));
      assert(toastMaterial.color === "rgb(233, 227, 213)" && toastMaterial.background !== "rgba(0, 0, 0, 0)" && Number(toastMaterial.zIndex) >= 120, "Toast is legible above the modal planes");
      operations.push({ kind: "toast-material", ...toastMaterial });

      if (width < 640) await page.getByRole("button", { name: "Ferramentas", exact: true }).click();
      await page.locator(".tadeon-tabletop-toolbar").getByRole("button", { name: "Cena", exact: true }).click();
      await page.getByRole("button", { name: "Recarregar cena", exact: true }).click();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => window.__tadeonTabletopRuntime?.snapshot().scene.entities[0]?.color === 0x123456);
      await page.waitForFunction(() => document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvo"));
      await capture("color-round-trip");
      await context.close();
      continue;
    }
    await closeEditor();
    if (width < 640) await page.getByRole("button", { name: "Ferramentas", exact: true }).click();
    for (const group of ["Cena", "Editar", "Visão", "Grade"]) {
      const trigger = page
        .locator(".tadeon-tabletop-toolbar")
        .getByRole("button", { name: group, exact: true });
      await trigger.click();
      const popover = page.locator(".tadeon-tabletop-command-group");
      await popover.waitFor();
      const box = await popover.boundingBox();
      assert(box.x >= -1 && box.x + box.width <= width + 1, "Contained tool group");
      await capture(`group-${group}`);
      await page.keyboard.press("Escape");
      await popover.waitFor({ state: "hidden" });
      await page.waitForFunction(
        (label) => document.activeElement?.textContent?.trim() === label,
        group,
      );
    }
    const commandTrigger = page.getByRole("button", { name: "Abrir comandos", exact: true });
    await commandTrigger.click();
    const command = page.getByRole("dialog", { name: "Comandos da Mesa", exact: true });
    await command.waitFor();
    const search = command.getByRole("combobox", { name: "Buscar comando" });
    await search.fill("mover camera");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await command.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.getAttribute("aria-label") === "Abrir comandos",
    );
    await page.waitForFunction(
      () => window.__tadeonTabletopRuntime.engine.diagnostics().tool === "pan",
    );
    await page.keyboard.press("Control+k");
    const globalSearch = page.getByRole("dialog", { name: "Busca global", exact: true });
    await globalSearch.waitFor();
    await page.keyboard.press("Escape");
    await globalSearch.waitFor({ state: "hidden" });
    await page.keyboard.press("Control+Shift+k");
    await command.waitFor();
    assert((await page.getByRole("dialog").count()) === 1, "One shortcut, one dialog");
    await search.fill("regua");
    await capture("commands");
    await page.keyboard.press("Escape");
    await command.waitFor({ state: "hidden" });
    assert(
      (await page
        .getByRole("button", { name: "Mover câmera", exact: true })
        .getAttribute("aria-pressed")) === "true",
      "Active navigation tool follows the engine",
    );
    const coordinates = await page.evaluate(() => {
      const rt = window.__tadeonTabletopRuntime,
        p = { x: 800, y: 650 };
      rt.engine.zoomBy(1.22);
      const client = rt.worldToClient(p),
        world = rt.clientToWorld(client);
      return { p, world };
    });
    assert(
      Math.hypot(coordinates.p.x - coordinates.world.x, coordinates.p.y - coordinates.world.y) <
        0.01,
      "World/screen round trip",
    );
    await verifyPointerSelection();
    await capture("pointer-selection");
    await page
      .locator(".tadeon-tabletop-mobile-save")
      .evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    holdSave = true;
    await page.evaluate((entityId) => {
      const e = window.__tadeonTabletopRuntime.engine;
      e.select(entityId, false);
      e.updateSelected({ label: "Ariadne · rascunho", color: 0x123456 }, "Renomear e escolher cor-base");
    }, id(50));
    await page.waitForFunction(() =>
      document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvar"),
    );
    for (let n = 0; n < 500 && !releaseSave; n++) await new Promise((r) => setTimeout(r, 20));
    assert(releaseSave, "Save reached held fixture");
    await page.evaluate(() =>
      window.__tadeonTabletopRuntime.engine.updateSelected(
        { label: "Ariadne · edição posterior" },
        "Renomear novamente",
      ),
    );
    releaseSave();
    releaseSave = null;
    await page.waitForFunction(() => {
      const b = document.querySelector(".tadeon-tabletop-mobile-save");
      return b?.textContent?.includes("Salvar") && !b.disabled;
    });
    assert(
      operations.find((o) => o.kind === "scene-save").entities.find((e) => e.id === id(50)).name ===
        "Ariadne · rascunho",
      "Held snapshot does not include later edit",
    );
    await capture("pending-edit-after-save");
    await activateSave();
    await page.waitForFunction(() =>
      document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvo"),
    );
    assert(
      entityRows.find((e) => e.id === id(50)).name === "Ariadne · edição posterior",
      "Second save retains latest edit",
    );
    assert(entityRows.find((e) => e.id === id(50)).properties.base_color === 0x123456, "Chosen base color reaches the save payload");
    await page.locator(".tadeon-tabletop-toolbar").getByRole("button", { name: "Cena", exact: true }).click();
    await page.getByRole("button", { name: "Recarregar cena", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.__tadeonTabletopRuntime?.snapshot().scene.entities[0]?.color === 0x123456);
    await page.waitForFunction(() => document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvo"));
    await capture("color-round-trip");
    await page
      .locator(".tadeon-tabletop-toolbar")
      .getByRole("button", { name: "Visão", exact: true })
      .click();
    await page.getByRole("button", { name: "Ativar projeção espacial 3D", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => window.__tadeonTabletopRuntime.view().projection === "isometric",
    );
    const projection = await page.evaluate(() => {
      const rt = window.__tadeonTabletopRuntime,
        p = { x: 700, y: 600 };
      const w = rt.clientToWorld(rt.worldToClient(p));
      return Math.hypot(p.x - w.x, p.y - w.y);
    });
    assert(projection < 0.01, "3D round trip");
    await capture("projection");
    await page.evaluate(() => window.__tadeonTabletopRuntime.engine.setProjectionMode("plan"));
    await page
      .getByRole("button", { name: "Posicionar luz e arrastar o alcance (L)", exact: true })
      .click();
    await page
      .locator(".tadeon-tabletop-canvas-host canvas[aria-label='Canvas da Mesa Nexus']")
      .scrollIntoViewIfNeeded();
    const point = await page.evaluate(() => {
      const c = document
        .querySelector(".tadeon-tabletop-canvas-host canvas[aria-label='Canvas da Mesa Nexus']")
        .getBoundingClientRect();
      const canvas = document.querySelector(
        ".tadeon-tabletop-canvas-host canvas[aria-label='Canvas da Mesa Nexus']",
      );
      for (const y of [0.68, 0.55, 0.8, 0.4])
        for (const x of [0.55, 0.8, 0.3]) {
          const p = { x: c.x + c.width * x, y: c.y + c.height * y };
          if (document.elementFromPoint(p.x, p.y) === canvas) return p;
        }
      throw new Error("No exposed canvas point for the light tool");
    });
    console.log("Light pointer", point);
    await page.mouse.click(point.x, point.y);
    await page.waitForFunction(() =>
      document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvar"),
    );
    await page.getByRole("combobox", { name: "Cena da Mesa Nexus" }).selectOption(id(1));
    const warning = page.getByRole("alertdialog", { name: "Descartar alterações locais?" });
    await warning.waitFor();
    await capture("environment-navigation-review");
    await warning.getByRole("button", { name: "Continuar editando" }).click();
    await warning.waitFor({ state: "hidden" });
    await page
      .locator(".tadeon-tabletop-mobile-save")
      .evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }));
    if (await page.locator(".tadeon-tabletop-mobile-save").isEnabled()) await activateSave();
    await page.waitForFunction(() =>
      document.querySelector(".tadeon-tabletop-mobile-save")?.textContent?.includes("Salvo"),
    );
    assert(
      operations.some((o) => o.kind === "environment-save" && o.lights > 0),
      "Manual save includes light",
    );
    await page.getByRole("combobox", { name: "Cena da Mesa Nexus" }).selectOption(id(2));
    await page.waitForFunction(
      () => window.__tadeonTabletopRuntime.snapshot().scene.name === "Arquivo antigo",
    );
    await page.evaluate(
      (entityId) => window.__tadeonTabletopRuntime.engine.select(entityId, false),
      id(50),
    );
    await commandTrigger.click();
    await command.waitFor();
    await search.fill("duplicar");
    assert(
      (await command
        .getByRole("option", { name: "Duplicar seleção", exact: true })
        .getAttribute("aria-disabled")) === "true",
      "Archived scene disables editing",
    );
    await capture("archived-commands");
    await page.keyboard.press("Escape");
    assert(!errors.length, errors.join("; "));
    assert(!writes.length, writes.join("; "));
    await context.close();
  }
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already stopped */
  }
}
console.log(JSON.stringify({ states: results.length, output }));
