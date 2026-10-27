import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const { PGlite } = await import(process.env.NEXUS_PGLITE_MODULE || "@electric-sql/pglite");
const require = createRequire(import.meta.url);
const testRoot = mkdtempSync(tmpdir() + "/tdv2-postgres-");
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
let engine = ts
  .transpileModule(readFileSync("src/lib/tdv2.ts", "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  .outputText.replace(
    'from "zod"',
    "from " + JSON.stringify(pathToFileURL(require.resolve("zod")).href),
  );
writeFileSync(testRoot + "/engine.mjs", engine);
const { newTdvCharacter, finishCreation, addMilestone, invest } = await import(
  pathToFileURL(testRoot + "/engine.mjs")
);
const db = new PGlite();
let checks = 0;
const player = "00000000-0000-4000-8000-000000000001",
  master = "00000000-0000-4000-8000-000000000002",
  stranger = "00000000-0000-4000-8000-000000000003",
  sheet = "00000000-0000-4000-8000-000000000010";
const schema = `create role anon; create role authenticated; create role service_role; create schema private; create schema auth; create type public.app_role as enum ('mestre','jogador','espectador'); create table public.user_roles(user_id uuid,role public.app_role); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create table public.character_sheets(id uuid primary key,owner_id uuid,name text,attributes jsonb default '{}'); create table public.game_settings(id uuid primary key); grant usage on schema public,private,auth to authenticated; grant select on public.user_roles to authenticated; grant all on public.character_sheets to authenticated; insert into user_roles values('${player}','jogador'),('${master}','mestre'),('${stranger}','jogador'); alter table public.character_sheets enable row level security; create policy own on public.character_sheets to authenticated using (owner_id=auth.uid() or exists(select 1 from public.user_roles where user_id=auth.uid() and role='mestre')) with check(owner_id=auth.uid() or exists(select 1 from public.user_roles where user_id=auth.uid() and role='mestre')); insert into character_sheets values('00000000-0000-4000-8000-000000000099','${player}','Legado','{"COR":3,"MEN":2}');`;
await db.exec(schema);
await db.exec(
  readFileSync("supabase/migrations/20261027093709_tdv_ii_versioned_rules.sql", "utf8"),
);
const old = (await db.query("select rules_version,tdv2_data,attributes from character_sheets"))
  .rows[0];
assert.deepEqual(old, { rules_version: 1, tdv2_data: null, attributes: { COR: 3, MEN: 2 } });
checks++;
const auth = async (id) =>
  db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
const valid = async (c) =>
  (await db.query("select private.tdv2_character_valid($1::jsonb) ok", [JSON.stringify(c)])).rows[0]
    .ok;
let c = newTdvCharacter();
assert.equal(await valid(c), true);
checks++;
assert.equal(await valid({ ...c, version: undefined }), false);
checks++;
assert.equal(await valid({ ...c, resources: { ...c.resources, pv: 1000 } }), false);
checks++;
await auth(player);
await db.query(
  "insert into character_sheets(id,owner_id,name,rules_version,tdv2_data) values($1,$2,$3,2,$4)",
  [sheet, player, "Iria", JSON.stringify(c)],
);
checks++;
c.face.origin = "Cais";
c.face.occupation = "Registradora";
c.face.conviction = "Testemunhos";
c.face.limit = "Não entregar inocentes";
c.face.links[0].node = "Elen";
c.face.links[0].nature = "Confiança";
c.face.anchor.detail = "A promessa";
c = finishCreation(c);
const update = async (value) =>
  db.query("update character_sheets set tdv2_data=$1 where id=$2 returning id", [
    JSON.stringify(value),
    sheet,
  ]);
await update(c);
checks++;
await assert.rejects(() => update({ ...c, matrices: { ...c.matrices, Nexo: 2 } }));
checks++;
await assert.rejects(() => update(addMilestone(c, "A", "A")));
checks++;
await assert.rejects(() =>
  db.query("update character_sheets set rules_version=1 where id=$1", [sheet]),
);
checks++;
await auth(master);
c = addMilestone(addMilestone(c, "A", "A"), "B", "B");
await update(c);
checks++;
await auth(player);
c = invest(c, {
  kind: "Alinhavo",
  target: "Iniciativa",
  cost: 2,
  reason: "Aprendizado incorporado",
  transcendent: false,
});
await update(c);
checks++;
await assert.rejects(() => update({ ...c, investments: [] }));
checks++;
await assert.rejects(() =>
  update({
    ...c,
    investments: [
      ...c.investments,
      { id: "fake", kind: "Lavor", target: "X", cost: 6, reason: "X", transcendent: false },
    ],
  }),
);
checks++;
await assert.rejects(() => update({ ...c, resources: { ...c.resources, pe: -1 } }));
checks++;
await auth(stranger);
assert.equal((await db.query("select count(*) n from character_sheets")).rows[0].n, 0);
checks++;
assert.equal((await update({ ...c, notes: "intrusão" })).rows.length, 0);
checks++;
await auth(player);
assert.notEqual(
  (await db.query("select tdv2_data from character_sheets where id=$1", [sheet])).rows[0].tdv2_data
    .notes,
  "intrusão",
);
checks++;
await db.exec(`reset role;
create type public.knowledge_node_type as enum ('character','npc','creature','transcendental_ability','fragment','rule','session','clue');
create function private.is_feature_enabled(text) returns boolean language sql as $$select true$$;
create function private.can_manage_workspace(uuid) returns boolean language sql as $$select auth.uid()='${master}'::uuid$$;
create table knowledge_templates(workspace_id uuid,node_type public.knowledge_node_type,name text,description text,default_content text,default_properties jsonb,required_fields text[],suggested_relations jsonb,is_default boolean,created_by uuid,updated_by uuid,unique(workspace_id,node_type,name));
grant select,insert,update on knowledge_templates to authenticated;`);
const workspace = "00000000-0000-4000-8000-000000000088";
await auth(player);
await assert.rejects(() => db.query("select ensure_tdv2_knowledge_templates($1)", [workspace]));
checks++;
await auth(master);
assert.equal(
  (await db.query("select ensure_tdv2_knowledge_templates($1) n", [workspace])).rows[0].n,
  9,
);
checks++;
await db.query(
  "update knowledge_templates set default_content='CUSTOM' where name='Feição TdV II'",
);
assert.equal(
  (await db.query("select ensure_tdv2_knowledge_templates($1) n", [workspace])).rows[0].n,
  0,
);
checks++;
assert.equal(
  (await db.query("select default_content from knowledge_templates where name='Feição TdV II'"))
    .rows[0].default_content,
  "CUSTOM",
);
checks++;
const snapshot = (
  await db.query("select sheet_history_snapshot($1::jsonb) data", [
    JSON.stringify({ rules_version: 2, tdv2_data: c, attributes: { COR: 3 } }),
  ])
).rows[0].data;
assert.deepEqual(snapshot.tdv2_data, c);
assert.equal(snapshot.rules_version, 2);
assert.deepEqual(snapshot.attributes, { COR: 3 });
checks++;
await db.exec("reset role; set role anon");
await assert.rejects(() => db.query("select * from character_sheets"));
checks++;
console.log(
  JSON.stringify({
    passed: true,
    checks,
    engine: "PostgreSQL (PGlite)",
    migration: "20261027093709_tdv_ii_versioned_rules",
    legacyUnchanged: true,
  }),
);
await db.close();
