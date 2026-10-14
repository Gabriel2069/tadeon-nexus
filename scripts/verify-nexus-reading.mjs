/** NEX-006/NEX-014: intercepted fixture corpus; never forwards backend requests. */
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
const browser = await chromium.launch({
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
const nodes = Array.from({ length: 120 }, (_, i) => ({
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
  for (const width of [320, 390, 820, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 768,
      reducedMotion: width === 1440 ? "no-preference" : "reduce",
    });
    const page = await context.newPage();
    const errors = [],
      requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => { if (message.type() === "error") console.log("Browser error:", message.text()); });
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
        body = ["nexus_knowledge_enabled", "nexus_graph_enabled"].map((key) => ({
          key,
          enabled: true,
        }));
      else if (url.pathname.includes("/workspaces"))
        body = [{ id: wid, name: "Arquivo de exemplo" }];
      else if (url.pathname.includes("/rpc/search_knowledge_nodes")) {
        const args = req.postDataJSON();
        const matches = nodes.filter(
          (n) => !args.p_query || n.title.toLowerCase().includes(args.p_query.toLowerCase()),
        );
        body = matches.slice(args.p_offset, args.p_offset + args.p_limit).map((node_data) => ({
          node_data,
          relevance: 1,
          snippet: node_data.summary,
          total_count: matches.length,
        }));
      } else if (url.pathname.includes("/rpc/get_knowledge_graph_memory")) body = memory;
      else if (url.pathname.includes("/knowledge_nodes")) {
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
      .waitFor()
      .catch(async (error) => {
        console.log("Reading failure:", error.message, "requests", JSON.stringify(requests), "errors", JSON.stringify(errors));
        console.log(
          JSON.stringify({
            url: page.url(),
            body: await page.locator("body").innerText({ timeout: 5000 }).catch(() => "unresponsive"),
            errors,
            requests,
          }),
        );
        await page.screenshot({ path: `${output}/failure-${width}.png`, fullPage: false, timeout: 10000 }).catch(() => {});
        throw error;
      });
    assert((await page.locator("main").count()) === 1, "One main landmark");
    const tree = page.getByRole("tree");
    await tree.waitFor();
    const count = await tree.getByRole("treeitem").count();
    assert(count > 1, "Populated hierarchy");
    await page.getByRole("button", { name: `Recolher ${nodes[0].title}`, exact: true }).click();
    assert((await tree.getByRole("treeitem").count()) < count, "Collapse descendants");
    await page.getByRole("button", { name: `Expandir ${nodes[0].title}`, exact: true }).click();
    await page.getByRole("button", { name: "Documento e grafo", exact: true }).click();
    const canvas = page.locator("canvas[data-graph-density]");
    await canvas.waitFor();
    assert((await canvas.boundingBox()).height < 800, "Canvas height remains bounded");
    await page.getByText("120 nós ·", { exact: false }).waitFor();
    await page.screenshot({
      path: `${output}/split-${width}.png`,
      fullPage: true,
      animations: "disabled",
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
    await page.screenshot({
      path: `${output}/tree-${width}.png`,
      fullPage: true,
      animations: "disabled",
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
    await page.screenshot({
      path: `${output}/library-${width}.png`,
      fullPage: true,
      animations: "disabled",
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
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert(!overflow, "No viewport overflow");
    assert(errors.length === 0, JSON.stringify(errors));
    results.push({
      width,
      nodes: 120,
      treeRows: count,
      overflow,
      errors,
      backendRequests: requests.length,
    });
    await context.close();
  }
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`Nexus reading verified: ${results.length} viewports`);
} finally {
  await browser.close();
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {}
}
