# Baseline de migrations do Tadeon Nexus

## Estado reconciliado

Em 29 de julho de 2026, o diretório `supabase/migrations` foi alinhado ao histórico registrado
em `supabase_migrations.schema_migrations` na produção.

As sete migrations canônicas anteriores à Fase 1 foram exportadas do próprio histórico do
Supabase com seus números e nomes originais:

1. `20260727030314_bootstrap_tadeon_nexus_schema.sql`;
2. `20260727030412_tighten_tadeon_data_api_grants.sql`;
3. `20260727030529_optimize_tadeon_rls_and_indexes.sql`;
4. `20260727032212_harden_auth_profile_sync.sql`;
5. `20260727034322_add_project_heartbeat.sql`;
6. `20260727042109_add_app_error_monitoring.sql`;
7. `20260727042148_index_error_log_resolver.sql`.

Os arquivos anteriores, que representavam a evolução histórica do projeto mas não coincidiam
com os números aplicados na produção, foram preservados em `supabase/migrations_legacy`. Eles são
referência histórica e não devem ser reaplicados por `db push`.

## Regra para mudanças futuras

- toda mudança de schema recebe uma única migration nova;
- o mesmo SQL revisado deve ser versionado e aplicado ao projeto;
- migrations aplicadas nunca são editadas;
- ajustes posteriores recebem outra migration aditiva;
- antes de DDL em produção, confirmar um backup recuperável;
- depois de DDL, validar contagens, RLS, grants, Advisors e logs;
- nunca executar automaticamente os arquivos de `migrations_legacy`.

## Fase 1

A fundação foi aplicada em produção e registrada com os números gerados pelo Supabase:

1. `20260729111107_phase1_workspace_campaign_foundation.sql`;
2. `20260729111443_phase1_feature_flags_updated_by_index.sql`.

As migrations são aditivas, mantêm os campos legados e deixam todas as funcionalidades novas
desligadas. A segunda migration adiciona o índice da chave estrangeira `feature_flags.updated_by`
indicado pelo Database Advisor.

## Fase 2 — fundação do Nexus Assets

A camada unificada de metadados e o adaptador privado do Supabase Storage foram aplicados com:

1. `20260729115320_nexus_assets_supabase_foundation.sql`;
2. `20260729115415_nexus_assets_cover_composite_foreign_keys.sql`;
3. `20260729120553_nexus_assets_upload_role_guard.sql`.

A primeira migration cria catálogo, vínculos, variantes, sessões de upload, quotas, bucket
privado, RLS e policies do Storage. A segunda adiciona os índices das chaves estrangeiras
compostas apontados pelo Database Advisor. A terceira separa contribuidores de observadores e
impede que papéis somente leitura reservem uploads. A flag `nexus_assets_v2_enabled` permanece
desligada.

## Integração R2

A confirmação segura do provedor R2 foi aplicada com:

1. `20260729123955_nexus_assets_r2_confirmations.sql`;
2. `20260729124825_nexus_assets_r2_explicit_deny_policy.sql`.

Ela cria confirmações temporárias sem conteúdo secreto, graváveis apenas pela credencial de
serviço mantida no Cloudflare Worker. O trigger de finalização só aceita um asset R2 depois que o
Worker confirma tamanho, MIME, objeto e sessão. A segunda migration torna explícita para o
Database Advisor a negação completa aos papéis de cliente. As flags `nexus_r2_enabled` e
`nexus_assets_v2_enabled` permanecem desligadas.

## O Nexus — fundação de conhecimento

O modelo persistente de páginas, relações e histórico foi aplicado com:

1. `20260729130904_nexus_knowledge_foundation.sql`.

O timestamp acima corresponde ao histórico real em `supabase_migrations.schema_migrations`; o\narquivo anterior `20260729131000` foi apenas uma divergência de versionamento no repositório e\nnunca representou uma segunda migration.\n\nA migration cria os contratos de banco, nós Markdown, ACL por usuário, relações, aliases, tags,
menções, anexos, versões limitadas, templates, favoritos e recentes. Ela reutiliza os membros de
workspace e campanha, mantém RLS em todas as tabelas e bloqueia o acesso enquanto
`nexus_knowledge_enabled` permanecer desligada.

## O Nexus — índices de cobertura

O Database Advisor foi reconciliado pela migration aditiva:

1. `20260729192815_cover_nexus_knowledge_foreign_keys.sql`.

Ela cobre as 17 chaves estrangeiras reportadas sem remover índices existentes e sem alterar dados,
grants, policies ou RLS. A validação posterior retornou zero chaves estrangeiras descobertas.
Avisos de índices ainda não usados foram preservados porque o rollout permanece desligado.
