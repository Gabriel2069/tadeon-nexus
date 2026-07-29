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

`20260729064000_phase1_workspace_campaign_foundation.sql` é a primeira migration criada depois
da reconciliação. Ela é aditiva, mantém os campos legados e deixa todas as funcionalidades novas
desligadas.
