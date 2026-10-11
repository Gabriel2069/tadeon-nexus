import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
const manifestArg = process.argv.indexOf("--manifest");
const manifest = manifestArg >= 0 ? process.argv[manifestArg + 1] : "docs/project-continuity.json";
const data = JSON.parse(readFileSync(manifest, "utf8"));
const write = process.argv.includes("--write");
if (write && manifestArg >= 0) throw new Error("Alternative manifests are validation-only.");
const errors = [];
const fail = (message) => errors.push(message);
const walk = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const file = `${path}/${entry.name}`;
    return entry.isDirectory() ? walk(file) : [file];
  });
const unique = (items, label, field = "id") => {
  const keys = items.map((item) => item[field]);
  if (new Set(keys).size !== keys.length) fail(`${label}: duplicate ${field}.`);
};
const pathExists = (path) => {
  if (
    typeof path !== "string" ||
    path.startsWith("/") ||
    path.split("/").includes("..") ||
    !existsSync(path)
  )
    fail(`Missing or invalid repository path: ${path}`);
};
if (data.version !== 1) fail("Unsupported continuity version.");
unique(data.domains, "Domains");
unique(data.tasks, "Tasks");
unique(data.decisions, "Decisions");
unique(data.documents, "Documents", "path");
unique(data.bridges, "Bridges", "path");
const domains = new Set(data.domains.map((item) => item.id));
for (const domain of data.domains) {
  if (!domain.boundary?.trim()) fail(`${domain.id}: missing ownership boundary.`);
  for (const path of [...domain.code, ...domain.styles]) pathExists(path);
}
const tasks = new Map(data.tasks.map((task) => [task.id, task]));
const active = new Set();
for (const task of data.tasks) {
  if (!/^NEX-\d{3}$/.test(task.id)) fail(`Invalid task ID: ${task.id}`);
  if (!domains.has(task.domain)) fail(`${task.id}: unknown owner ${task.domain}.`);
  if (!["planned", "ready", "active", "validated", "integrated", "deferred"].includes(task.status))
    fail(`${task.id}: invalid status.`);
  if (!Number.isInteger(task.priority) || task.priority < 0) fail(`${task.id}: invalid priority.`);
  if (!task.acceptance?.length || task.acceptance.some((text) => !text.trim()))
    fail(`${task.id}: missing acceptance criteria.`);
  if (["validated", "integrated"].includes(task.status) && !task.evidence?.length)
    fail(`${task.id}: completion requires evidence.`);
  for (const evidence of task.evidence) if (!/^https:\/\//.test(evidence)) pathExists(evidence);
  for (const dependency of task.dependsOn)
    if (!tasks.has(dependency)) fail(`${task.id}: unknown dependency ${dependency}.`);
  if (task.status === "active") {
    if (active.has(task.domain))
      fail(`${task.domain}: competing active tasks; serialize them or change boundaries.`);
    active.add(task.domain);
  }
}
const visited = new Set(),
  visiting = new Set();
function visit(id) {
  if (visiting.has(id)) {
    fail(`Dependency cycle: ${id}`);
    return;
  }
  if (visited.has(id) || !tasks.has(id)) return;
  visiting.add(id);
  for (const dependency of tasks.get(id).dependsOn) visit(dependency);
  visiting.delete(id);
  visited.add(id);
}
for (const id of tasks.keys()) visit(id);
for (const bridge of data.bridges) {
  pathExists(bridge.path);
  if (!domains.has(bridge.domain)) fail(`${bridge.path}: missing domain.`);
}
const actualBridges = walk("src/components")
  .filter((path) => path.endsWith("-bridge.tsx"))
  .sort();
if (JSON.stringify(actualBridges) !== JSON.stringify(data.bridges.map((item) => item.path).sort()))
  fail("Bridge inventory changed: map its owner and transfer contract first.");
const actualDocs = walk("docs")
  .filter((path) => path.endsWith(".md"))
  .sort();
const expectedDocs = data.documents.map((item) => item.path).sort();
if (!write && JSON.stringify(actualDocs) !== JSON.stringify(expectedDocs))
  fail(
    "Documentation inventory changed: register its purpose/status instead of creating another current plan.",
  );
for (const doc of data.documents) {
  if (!["active", "reference", "historical", "generated"].includes(doc.status))
    fail(`${doc.path}: invalid document status.`);
  if (!doc.purpose?.trim()) fail(`${doc.path}: missing purpose.`);
  if (doc.status !== "generated") pathExists(doc.path);
}
unique(data.artifacts, "Artifacts", "path");
for (const artifact of data.artifacts) pathExists(artifact.path);
const actualArtifacts = walk("docs")
  .filter((path) => path.endsWith(".json"))
  .sort();
if (
  JSON.stringify(actualArtifacts) !== JSON.stringify(data.artifacts.map((item) => item.path).sort())
)
  fail("Evidence inventory changed: register its purpose before leaving it outside the index.");
const cell = (text) => String(text).replaceAll("|", "\\|").replaceAll("\n", " ");
const link = (path) => `[${path}](../${path})`;
const banner =
  "> Gerado de [project-continuity.json](project-continuity.json). Edite o registro e rode `npm run sync:project`; não mantenha uma cópia manual.\n\n";
const statuses = {
  planned: "Planejado",
  ready: "Próximo",
  active: "Em andamento",
  validated: "Validado na branch",
  integrated: "Integrado",
  deferred: "Adiado",
};
const outputs = new Map();
outputs.set(
  "docs/README.md",
  "# Índice de manutenção\n\n" +
    banner +
    "Comece pelo [estado de continuidade](ai/00_ESTADO_ATUAL.md), [mapa do código](PROJECT_MAP.md), [fila](WORKPLAN.md) e [fundamentos](FOUNDATION.md). Estado de produção/flags depende de conferência atual; registros históricos não o comprovam.\n\n" +
    "| Documento | Papel | Uso |\n| --- | --- | --- |\n" +
    data.documents
      .map(
        (doc) =>
          `| [${doc.path.slice(5)}](${doc.path.slice(5)}) | ${doc.status} | ${cell(doc.purpose)} |`,
      )
      .join("\n") +
    "\n\n## Contratos e evidências\n\n| Arquivo | Uso |\n| --- | --- |\n" +
    data.artifacts
      .map(
        (artifact) =>
          `| [${artifact.path.slice(5)}](${artifact.path.slice(5)}) | ${cell(artifact.purpose)} |`,
      )
      .join("\n") +
    "\n",
);
outputs.set(
  "docs/PROJECT_MAP.md",
  "# Mapa do código e das responsabilidades\n\n" +
    banner +
    "A estrutura existente é a base de trabalho. Não criar `features/` ou `services/` paralelos para reproduzir domínios existentes. O contrato de inventário e ordem CSS continua em [style-architecture.json](style-architecture.json). Arquivos gerados, migrations e serviços externos mantêm suas próprias autoridades.\n\n" +
    data.domains
      .map(
        (domain) =>
          `## ${domain.name}\n\n${domain.boundary}\n\nCódigo: ${domain.code.map(link).join(", ")}.\n\nEstilos: ${domain.styles.length ? domain.styles.map(link).join(", ") : "sem proprietário CSS exclusivo"}.\n`,
      )
      .join("\n") +
    "\n## Bridges registrados\n\nNome de bridge não significa código descartável. Antes de transferir, rastrear montagens, estado, listeners, portais e persistência; registrar destino, testes e retirada da origem no mesmo lote. O inventário não afirma que todos já foram auditados em profundidade.\n\n| Arquivo | Domínio | Tratamento |\n| --- | --- | --- |\n" +
    data.bridges
      .map(
        (bridge) =>
          `| ${link(bridge.path)} | ${bridge.domain} | ${bridge.status === "owner" ? "Proprietário atual" : "Revisar antes de transferir"} |`,
      )
      .join("\n") +
    "\n",
);
outputs.set(
  "docs/WORKPLAN.md",
  "# Fila de produção e decisões\n\n" +
    banner +
    `Snapshot: ${data.checkedAt}; referência de runtime: \`${data.runtimeReference}\`. PR #${data.integration.pr} em \`${data.integration.branch}\`; integração: \`${data.integration.state}\`. Não é prova de deploy.\n\n` +
    "Estados: planejado → próximo → em andamento → validado na branch → integrado. Publicação exige evidência própria do SHA; adiado conserva o requisito. Se um requisito mudar, preservar o ID e registrar a decisão/evidência.\n\n" +
    "Cada PR usa IDs desta fila e declara dependências. Trabalho sobre o mesmo proprietário deve ser sequencial; não duplicar implementação. [Conciliação das PRs](PR_RECONCILIATION.md).\n\n" +
    "| ID | Trabalho | Estado | Prioridade | Responsável | Depende de |\n| --- | --- | --- | --- | --- | --- |\n" +
    data.tasks
      .map(
        (task) =>
          `| ${task.id} | ${cell(task.title)} | ${statuses[task.status]} | ${task.priority} | ${task.domain} | ${task.dependsOn.join(", ") || "—"} |`,
      )
      .join("\n") +
    "\n\n" +
    data.tasks
      .map(
        (task) =>
          `## ${task.id} — ${task.title}\n\n${task.acceptance.map((text) => "- " + text).join("\n")}\n\nEvidências: ${task.evidence.length ? task.evidence.map((e) => (/^https:\/\//.test(e) ? `[CI/referência](${e})` : link(e))).join(", ") : "pendentes; não declarar concluído"}.\n`,
      )
      .join("\n") +
    "\n## Decisões vigentes\n\n| ID | Decisão | Motivo |\n| --- | --- | --- |\n" +
    data.decisions
      .map(
        (decision) => `| ${decision.id} | ${cell(decision.decision)} | ${cell(decision.reason)} |`,
      )
      .join("\n") +
    "\n",
);
for (const [path, content] of outputs) {
  if (write && !errors.length) writeFileSync(path, content);
  else if (!existsSync(path) || readFileSync(path, "utf8") !== content)
    fail(`${path}: stale generated map; run npm run sync:project.`);
}
const inspected = [
  ...outputs.keys(),
  "README.md",
  "docs/ai/00_ESTADO_ATUAL.md",
  "docs/FOUNDATION.md",
  "docs/PR_RECONCILIATION.md",
];
for (const file of inspected) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\[[^\]\n]+\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    if (!existsSync(resolve(dirname(file), target))) fail(`${file}: broken link ${match[1]}.`);
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Continuity verified: ${data.domains.length} domains, ${data.tasks.length} tasks, ${data.documents.length} documents, ${data.bridges.length} bridges; maps synchronized.`,
  );
