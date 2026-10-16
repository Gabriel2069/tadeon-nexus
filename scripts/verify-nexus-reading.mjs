/** NEX-006/NEX-014/NEX-015: intercepted fixture corpus; never forwards backend requests. */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { installDesignFonts } from "./design-font-fixtures.mjs";
const { chromium } = await import(process.env.NEXUS_BROWSER_MODULE || "playwright-core");
const output = process.env.NEXUS_AUDIT_OUTPUT || "/tmp/nexus-reading";
mkdirSync(output, { recursive: true });
const port = 6121;
const assert = (v, m) => {
  if (!v) throw new Error(m);
};
console.log("Launching browser");
// A fresh browser per viewport keeps software GPU contexts isolated.
let browser;
const launchBrowser = () =>
  chromium.launch({
    executablePath: process.env.NEXUS_CHROMIUM_PATH,
    args: JSON.parse(process.env.NEXUS_CHROMIUM_ARGS || "[]"),
  });
console.log("Browser ready; starting installed Vite");
const server = spawn(
  "npm",
  ["run", "dev", "--", "--host", "127.0.0.1", "--strictPort", "--port", String(port)],
  { detached: true, stdio: ["ignore", "pipe", "pipe"] },
);
const uid = "00000000-0000-4000-8000-000000000001",
  wid = "00000000-0000-4000-8000-000000000002";
const id = (i) => `00000000-0000-4000-8000-${String(i + 100).padStart(12, "0")}`;
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
  .map((v) => (typeof v === "string" ? v : Buffer.from(JSON.stringify(v)).toString("base64url")))
  .join(".");
const corpus = Number(process.env.NEXUS_CORPUS || 120);
assert(Number.isInteger(corpus) && corpus >= 30 && corpus <= 500, "Bounded fixture corpus");
const nodes = Array.from({ length: corpus }, (_, i) => ({
  id: id(i),
  workspace_id: wid,
  campaign_id: null,
  author_id: uid,
  owner_id: uid,
  node_type: i % 3 === 0 ? "document" : i % 3 === 1 ? "location" : "free_note",
  title: i === 0 ? "O arquivo dos fios esquecidos" : `Vestígio ${String(i).padStart(3, "0")}`,
  slug: `vestigio-${i}`,
  summary: "Memórias conectadas através do tecido do mundo.",
  content_markdown:
    "## O primeiro fio\n\nUm documento preserva a memória, o contexto e os vínculos entre os vestígios.\n\n## A trama\n\nA leitura deve permanecer estável enquanto se explora o arquivo.",
  plain_text: "Memória e vínculos do arquivo.",
  properties: {},
  status: "draft",
  visibility: "workspace",
  icon: null,
  cover_asset_id: null,
  parent_node_id: i === 0 ? null : id(Math.floor((i - 1) / 4)),
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
}));
if (process.env.NEXUS_LONG_READING === "true")
  nodes[0].content_markdown +=
    "\n\n" +
    Array.from(
      { length: 100 },
      (_, i) =>
        `Vestígio de leitura ${i + 1}. O fio atravessa o arquivo e preserva o contexto da memória. A leitura continua no painel sem deslocar as ferramentas.`,
    ).join("\n\n");
const memory = {
  focusNodeId: id(0),
  candidateLimit: 500,
  truncated: false,
  nodes: nodes.map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    nodeType: n.node_type,
    icon: null,
    status: n.status,
    visibility: n.visibility,
    campaignId: null,
    parentNodeId: n.parent_node_id,
    updatedAt: n.updated_at,
    tags: [],
    semanticTerms: ["arquivo"],
    explicitDegree: 2,
    incomingMentions: 1,
    outgoingMentions: 1,
  })),
  signals: nodes.slice(1).map((n) => ({
    id: `hierarchy-${n.id}`,
    sourceNodeId: n.parent_node_id,
    targetNodeId: n.id,
    kind: "hierarchy",
    relationType: "related_to",
    label: "Contém",
    direction: "directed",
    visibility: "workspace",
    strength: 0.8,
    evidence: ["parent_node_id"],
  })),
};
const results = [];
try {
  await new Promise((ok, fail) => {
    server.stderr.on("data", (b) => console.log("Vite:", b.toString().slice(0, 1500)));
    server.stdout.on("data", (b) => {
      if (b.toString().includes("Local:")) ok();
    });
    server.on("exit", (c) => fail(new Error(`Vite ${c}`)));
    setTimeout(() => fail(new Error("Vite timeout")), 30000).unref();
  });
  for (const width of (process.env.NEXUS_WIDTHS || "320,390,820,1440").split(",").map(Number)) {
    if (browser) await browser.close();
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 768,
      reducedMotion: width === 1440 ? "no-preference" : "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().startsWith("[vite]"))
        console.log("Browser error:", message.text());
    });
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
      const req = route.request(),
        url = new URL(req.url());
      requests.push({ path: url.pathname, method: req.method() });
      let body = [];
      if (url.pathname.endsWith("/user")) body = user;
      else if (url.pathname.includes("/profiles"))
        body = [{ id: uid, full_name: "Leitor de exemplo" }];
      else if (url.pathname.includes("/user_roles")) body = [{ user_id: uid, role: "mestre" }];
      else if (url.pathname.includes("/feature_flags"))
        body = ["nexus_knowledge_enabled", "nexus_graph_enabled", "nexus_tabletop_enabled"].map(
          (key) => ({
            key,
            enabled: true,
          }),
        );
      else if (url.pathname.includes("/workspaces"))
        body = [{ id: wid, name: "Arquivo de exemplo" }];
      else if (url.pathname.includes("/rpc/search_knowledge_nodes")) {
        const args = req.postDataJSON();
        assert([30, 48].includes(args.p_limit) && args.p_offset >= 0, "Paginated index contract");
        requests[requests.length - 1].limit = args.p_limit;
        requests[requests.length - 1].offset = args.p_offset;
        const matches = nodes.filter(
          (n) => !args.p_query || n.title.toLowerCase().includes(args.p_query.toLowerCase()),
        );
        body = matches.slice(args.p_offset, args.p_offset + args.p_limit).map((node_data) => ({
          node_data,
          relevance: 1,
          snippet: node_data.summary,
          total_count: matches.length,
        }));
      } else if (url.pathname.includes("/rpc/get_knowledge_graph_memory")) {
        const args = req.postDataJSON();
        assert(args.p_candidate_limit <= 500, "Graph candidate cap");
        const filtered = memory.nodes.filter(
          (node) => !args.p_node_types || args.p_node_types.includes(node.nodeType),
        );
        const visible = new Set(filtered.map((node) => node.id));
        body = {
          ...memory,
          nodes: filtered,
          signals: memory.signals.filter(
            (edge) => visible.has(edge.sourceNodeId) && visible.has(edge.targetNodeId),
          ),
        };
      } else if (url.pathname.includes("/tabletop_entities")) {
        const selectedId = url.searchParams.get("linked_knowledge_node_id")?.slice(3);
        body = selectedId
          ? [
              { id: id(1000), scene_id: id(2000), name: `Fio ${selectedId}` },
              { id: id(1001), scene_id: id(2001), name: `Vínculo ${selectedId}` },
            ]
          : [];
      } else if (url.pathname.includes("/tabletop_scenes")) {
        body = [
          { id: id(2000), name: "Salão dos fios" },
          { id: id(2001), name: "Jardim encoberto" },
        ];
      } else if (url.pathname.includes("/knowledge_nodes")) {
        const filter = url.searchParams.get("id");
        body = filter?.startsWith("eq.") ? nodes.filter((n) => n.id === filter.slice(3)) : nodes;
      } else if (
        req.method() !== "GET" &&
        !url.pathname.includes("/rpc/") &&
        !url.pathname.includes("/knowledge_recent")
      )
        throw new Error(`Unexpected fixture write ${url.pathname}`);
      if (Array.isArray(body) && req.headers().accept?.includes("vnd.pgrst.object"))
        body = body[0] ?? null;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.route("**/_serverFn/**", (r) =>
      r.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
    );
    await installDesignFonts(page);
    await page.goto(`http://127.0.0.1:${port}/nexus?node=${id(0)}`, {
      waitUntil: "commit",
    });
    console.log("Opened fixture", width);
    await page
      .getByRole("heading", { name: nodes[0].title, exact: true })
      .waitFor({ timeout: 180000 })
      .catch(async (error) => {
        console.log(
          "Reading failure:",
          error.message,
          "requests",
          JSON.stringify(requests),
          "errors",
          JSON.stringify(errors),
        );
        console.log(
          JSON.stringify({
            url: page.url(),
            body: await page
              .locator("body")
              .innerText({ timeout: 5000 })
              .catch(() => "unresponsive"),
            errors,
            requests,
          }),
        );
        await page
          .screenshot({ path: `${output}/failure-${width}.png`, fullPage: false, timeout: 10000 })
          .catch(() => {});
        throw error;
      });
    assert((await page.locator("main").count()) === 1, "One main landmark");
    console.log("Page ready", width);
    const locations = page.getByRole("combobox", { name: "Localizações desta página na Mesa" });
    await locations.waitFor();
    assert(
      (await locations.locator("option").first().textContent()).includes(id(0)),
      "Locator follows current reading page",
    );
    await locations.selectOption(id(1001));
    assert((await locations.inputValue()) === id(1001), "Every returned location is selectable");
    if (!process.env.NEXUS_SKIP_SCREENSHOTS)
      await page.screenshot({ path: `${output}/current-page-context-${width}.png` });

    const initialDocument = page.locator(
      '.tadeon-nexus-reading__panes [data-panel][id="document"]',
    );
    const initialGroup = page.locator(".tadeon-nexus-reading__panes [data-group]");
    assert(
      Math.abs(
        (await initialDocument.boundingBox()).width - (await initialGroup.boundingBox()).width,
      ) < 2,
      "Document owns the whole initial reading area",
    );
    const tree = page.getByRole("tree");
    await tree.waitFor();
    await tree.getByRole("treeitem", { name: nodes[1].title, exact: true }).click();
    await page.getByRole("heading", { name: nodes[1].title, exact: true }).waitFor();
    await page.waitForFunction(
      (expected) =>
        document
          .querySelector(".tadeon-nexus-tabletop-locator select option")
          ?.textContent?.includes(expected),
      id(1),
    );
    assert(
      new URL(page.url()).searchParams.get("node") === id(0),
      "The fixture route stays on its original deep link",
    );
    await page.getByRole("button", { name: `Fechar ${nodes[1].title}`, exact: true }).click();
    await page.getByRole("heading", { name: nodes[0].title, exact: true }).waitFor();
    await page.waitForFunction(
      (expected) =>
        document
          .querySelector(".tadeon-nexus-tabletop-locator select option")
          ?.textContent?.includes(expected),
      id(0),
    );

    await page.getByRole("button", { name: "Próxima página", exact: true }).click();
    await page.getByText(`2 de ${Math.ceil(corpus / 30)}`, { exact: true }).waitFor();
    await page.getByRole("button", { name: "Página anterior", exact: true }).click();
    await page.getByText(`1 de ${Math.ceil(corpus / 30)}`, { exact: true }).waitFor();
    const count = await tree.getByRole("treeitem").count();
    assert(count > 1, "Populated hierarchy");
    await page.getByRole("button", { name: `Recolher ${nodes[0].title}`, exact: true }).click();
    assert((await tree.getByRole("treeitem").count()) < count, "Collapse descendants");
    await page.getByRole("button", { name: `Expandir ${nodes[0].title}`, exact: true }).click();
    assert(
      (await page.locator("canvas[data-graph-density]").count()) === 0,
      "Document view loads no graph before first request",
    );
    await page.getByRole("button", { name: "Documento e grafo", exact: true }).click();
    const canvas = page.locator("canvas[data-graph-density]");
    await canvas.waitFor();
    assert((await canvas.boundingBox()).height < 800, "Canvas height remains bounded");
    await page.getByText(`${Math.min(corpus, 220)} nós ·`, { exact: false }).waitFor();
    console.log("Graph ready", width);
    const panes = page.locator(".tadeon-nexus-reading__panes");
    if (process.env.NEXUS_LONG_READING === "true") {
      const documentScroll = panes.locator('[data-panel][id="document"] > div');
      assert(
        await documentScroll.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
          return element.scrollTop > 0 && element.scrollHeight > element.clientHeight;
        }),
        "Long reading scrolls inside its panel",
      );
      await documentScroll.evaluate((element) => {
        element.scrollTop = 0;
      });
    }
    const separator = page.getByRole("separator", {
      name: "Ajustar espaço entre documento e grafo",
    });
    await separator.waitFor();
    const axis = await panes.getAttribute("data-reading-axis");
    const priorSize = Number(await separator.getAttribute("aria-valuenow"));
    await separator.focus();
    await page.keyboard.press(axis === "vertical" ? "ArrowDown" : "ArrowRight");
    await page.waitForFunction(
      (prior) =>
        Number(document.querySelector("[role=separator]")?.getAttribute("aria-valuenow")) !== prior,
      priorSize,
    );
    const beforePointer = Number(await separator.getAttribute("aria-valuenow"));
    await separator.scrollIntoViewIfNeeded();
    const bounds = await separator.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2 - (axis === "horizontal" ? 24 : 0),
      bounds.y + bounds.height / 2 - (axis === "vertical" ? 24 : 0),
      { steps: 4 },
    );
    await page.mouse.up();
    await page.waitForFunction(
      (prior) =>
        Number(document.querySelector("[role=separator]")?.getAttribute("aria-valuenow")) !== prior,
      beforePointer,
    );
    const preferenceKey = `tadeon.nexus.reading.v1.${uid}.${wid}:workspace`;
    const dimension = axis === "vertical" ? "vertical" : "horizontal";
    await page.waitForFunction(
      ({ key, dimension }) => JSON.parse(localStorage.getItem(key) || "{}")[dimension] !== 50,
      { key: preferenceKey, dimension },
    );
    console.log("Resized", width, axis);
    const rememberedSize = await page.evaluate(
      ({ key, dimension }) => JSON.parse(localStorage.getItem(key))[dimension],
      { key: preferenceKey, dimension },
    );
    assert(rememberedSize >= 30 && rememberedSize <= 70, "Pane preference remains bounded");
    // Repeatedly switching view does not recreate the editor.
    await page.getByRole("button", { name: "Documento", exact: true }).click();
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    const editor = page.getByLabel("Conteúdo da página");
    await editor.evaluate((element) => {
      window.__fixtureEditor = element;
    });
    await page.getByRole("button", { name: "Grafo", exact: true }).click();
    await page.getByRole("button", { name: "Documento e grafo", exact: true }).click();
    assert(
      await editor.evaluate((element) => element === window.__fixtureEditor),
      "Stable editor DOM across modes",
    );
    await page.getByRole("button", { name: "Leitura", exact: true }).click();
    if (width === 1440) {
      await page.getByRole("button", { name: "Controles do grafo", exact: true }).click();
      if (corpus > 120) {
        await page.getByRole("combobox", { name: "Limite de nós" }).click();
        await page.getByRole("option", { name: "500 nós", exact: true }).click();
        await page.getByText(`${corpus} nós ·`, { exact: false }).waitFor();
      }
      await page.getByRole("combobox", { name: "Filtrar tipo de nó" }).click();
      await page.getByRole("option", { name: "Documento", exact: true }).click();
      await page.getByText(`${Math.ceil(corpus / 3)} nós ·`, { exact: false }).waitFor();
      await page.getByRole("combobox", { name: "Filtrar tipo de nó" }).click();
      await page.getByRole("option", { name: "Todos os tipos", exact: true }).click();
      await page.getByText(`${corpus} nós ·`, { exact: false }).waitFor();
      await page.getByRole("button", { name: /Física e leitura/ }).click();
      const groups = page.getByRole("button", { name: /Cores por tipo de página/ });
      await groups.click();
      assert((await groups.getAttribute("aria-pressed")) === "true", "Optional graph groups");
      await groups.click();
      await page.getByRole("button", { name: "Controles do grafo", exact: true }).click();
    }

    if (!process.env.NEXUS_SKIP_SCREENSHOTS)
      await page.screenshot({
        path: `${output}/split-${width}.png`,
        animations: "disabled",
        timeout: 20000,
      });
    await page.getByRole("button", { name: "Grafo", exact: true }).click();
    assert(
      !(await page.getByRole("heading", { name: nodes[0].title, exact: true }).isVisible()),
      "Graph replaces visible reading",
    );
    await page
      .getByRole("button", { name: /Árvore/, exact: false })
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    assert((await canvas.getAttribute("data-layout")) === "tree", "Tree view");
    if (!process.env.NEXUS_SKIP_SCREENSHOTS)
      await page.screenshot({
        path: `${output}/tree-${width}.png`,
        animations: "disabled",
        timeout: 20000,
      });
    await canvas.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Documento", exact: true }).click();
    await page.getByRole("heading", { name: nodes[0].title, exact: true }).waitFor();
    const libraryTrigger = page.getByRole("button", { name: /^Bibliotecas?$/ });
    await libraryTrigger.click();
    const library = page.locator(".tadeon-library-dialog");
    await library.waitFor();
    await library.locator(".tadeon-library-card").first().waitFor();
    const cardWidth = await library
      .locator(".tadeon-library-card")
      .first()
      .evaluate((element) => element.getBoundingClientRect().width);
    assert(cardWidth >= 200, "Library cards retain readable width in the result pane");
    if (!process.env.NEXUS_SKIP_SCREENSHOTS)
      await page.screenshot({
        path: `${output}/library-${width}.png`,
        animations: "disabled",
        timeout: 20000,
      });
    if (width < 1024) {
      const card = library.locator(".tadeon-library-card").first();
      await card.click();
      const closePreview = library.getByRole("button", { name: "Fechar prévia" });
      await closePreview.waitFor();
      await closePreview.click();
      assert(
        await card.evaluate((element) => document.activeElement === element),
        "Preview returns focus to its card",
      );
    }
    await page.keyboard.press("Escape");
    await library.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Documento e grafo", exact: true }).click();
    console.log("Restoring preferences", width);
    await page.reload({ waitUntil: "commit" });
    await page.getByRole("heading", { name: nodes[0].title, exact: true }).waitFor();
    await separator.waitFor();
    assert(
      (await panes.getAttribute("data-reading-view")) === "split",
      "Reading mode survives reload",
    );
    await page.waitForFunction(
      ({ key, dimension, expected }) =>
        JSON.parse(localStorage.getItem(key) || "{}")[dimension] === expected,
      { key: preferenceKey, dimension, expected: rememberedSize },
    );
    await page.waitForFunction(
      (expected) =>
        Math.abs(
          Number(document.querySelector('[role="separator"]')?.getAttribute("aria-valuenow")) -
            expected,
        ) < 1,
      rememberedSize,
    );

    await page.getByRole("button", { name: "Fechar " + nodes[0].title, exact: true }).click();
    await page.getByText("Entrada do acervo", { exact: true }).waitFor();
    const reopen = page.getByRole("button", { name: "Reabrir página fechada" });
    await page.waitForFunction(() => document.activeElement?.hasAttribute("data-reopen-page"));
    await reopen.click();
    await page.getByRole("heading", { name: nodes[0].title, exact: true }).waitFor();
    // Recover a conflicting local draft and exercise the actual portal/focus path.
    const draftKey = `tadeon.nexus.draft.v2.${uid}.${wid}.${id(0)}`;
    await page.evaluate(
      ({ key, title }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            title,
            content: "Rascunho de revisão",
            updatedAt: "2026-09-01T00:00:00Z",
          }),
        ),
      { key: draftKey, title: nodes[0].title },
    );
    await page.getByRole("button", { name: "Fechar " + nodes[0].title, exact: true }).click();
    await reopen.click();
    await page.getByRole("button", { name: "Revisar conflito", exact: true }).click();
    const conflict = page.getByRole("dialog", { name: "Revisar versões da página" });
    await conflict.waitFor();
    assert(
      await conflict.evaluate((element) => element.contains(document.activeElement)),
      "Conflict portal receives focus",
    );
    await page.keyboard.press("Escape");
    await conflict.waitFor({ state: "hidden" });
    assert(
      (await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).content, draftKey)) ===
        "Rascunho de revisão",
      "Canceling review retains the draft",
    );
    await page.getByRole("button", { name: "Revisar conflito", exact: true }).click();
    await conflict.getByRole("button", { name: "Usar versão salva", exact: true }).click();
    assert(
      (await page.evaluate((key) => localStorage.getItem(key), draftKey)) === null,
      "Reviewed discard removes only the local draft",
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert(!overflow, "No viewport overflow");
    assert(errors.length === 0, JSON.stringify(errors));
    assert(
      requests.some((request) => request.limit === 30 && request.offset === 30),
      "Index moves through actual paginated requests",
    );
    results.push({
      width,
      nodes: corpus,
      longReading: process.env.NEXUS_LONG_READING === "true",
      conflictReview: true,
      axis,
      rememberedSize,
      continuity: {
        stableEditor: true,
        lastTabClosed: true,
        explicitReopen: true,
        keyboardResize: true,
        pointerResize: true,
        modeAndSizeRestored: true,
      },
      treeRows: count,
      overflow,
      errors,
      backendRequests: requests.length,
    });
    writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
    console.log(`Viewport verified: ${width}`);
    await context.close();
  }
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`Nexus reading verified: ${results.length} viewports`);
} finally {
  await browser?.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
}
