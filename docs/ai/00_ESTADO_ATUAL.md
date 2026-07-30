# Estado atual do Tadeon Nexus

Atualizado em 29 de julho de 2026 pelo Work de continuidade independente.

## Fonte de verdade

- O estado real do GitHub, Supabase e Cloudflare prevalece sobre registros históricos; o Lovable é apenas uma conexão de construção.
- O Livro de Regras de Tessitura do Vazio governa mecânicas e terminologia.
- O Fio-Mestre governa identidade visual.
- Checkpoint de entrada: `1c5b66cf83bdd9d4b070019510080eb2d63dc74b`.
- Checkpoints integrados: PRs #25–#42 em `main`; o último lote funcional está em `e374d36`.

## Estado confirmado

### Fundação

A fundação de workspace, campanha, membros, flags e auditoria está implementada e aplicada no
Supabase. As tabelas expostas permanecem com RLS habilitada. Há um workspace, uma campanha e os
vínculos esperados; fichas e dados legados foram preservados.

### Nexus Assets

O catálogo provider-neutral, Supabase Storage privado, quotas, reservas de upload, autorização,
serviço e interface estão implementados. Não há assets cadastrados. A flag global
`nexus_assets_v2_enabled` permanece desligada; um override individual habilita o módulo somente
para o proprietário mestre. A reserva de upload Supabase passou em teste autenticado com rollback;
o jogador sem override foi negado e R2 permaneceu bloqueado. O envio e download do objeto real ainda
não foram validados e o rollout não está concluído.

R2 permanece preparado, mas inativo. Bucket, credenciais, CORS e teste ponta a ponta não foram
confirmados. `nexus_r2_enabled=false` e não deve ser alterada nessas condições.

### O Nexus

Schema, RLS, serviço, Markdown seguro, wikilinks, aliases, relações, versões e interface estão
implementados. Não há páginas cadastradas. A flag global `nexus_knowledge_enabled` permanece
desligada; um override individual habilita o módulo somente para o proprietário mestre. O canário
está integrado e ativado, mas o CRUD autenticado ponta a ponta ainda não foi validado e o rollout
não está concluído.

A migration aplicada em produção é
`20260729130904_nexus_knowledge_foundation.sql`. O nome local anterior com timestamp
`20260729131000` foi reconciliado sem alterar o SQL aplicado.

A integridade de links foi integrada nos PRs #32 e #33 e aplicada como
`20260729211452_knowledge_link_integrity.sql`: headings, menções, backlinks e links quebrados são
substituídos atomicamente com limite explícito, enquanto relações semânticas manuais permanecem
intactas. A criação de páginas e relações deixou de usar `INSERT ... RETURNING` sob policies
auto-referenciais; as RPCs `SECURITY INVOKER` foram aplicadas como
`20260729230437_knowledge_transactional_creation.sql`.

Relações semânticas com direção, rótulo, tipo, propriedades, visibilidade, inversa opcional,
edição, filtros e prevenção de duplicação exata foram aplicadas como
`20260729231757_knowledge_semantic_relations.sql`. A pesquisa PostgreSQL conectada foi aplicada
como `20260729233047_knowledge_postgres_search.sql`, com título, resumo, conteúdo, aliases, tags,
propriedades, tipo e relações visíveis, além de filtros, ordenação, trechos destacados e paginação.
O retorno composto foi corrigido em `20260729234101_fix_knowledge_search_composite.sql`.

O grafo local limitado foi aplicado como `20260730000020_knowledge_local_graph.sql`. Ele retorna
somente metadados visíveis sob RLS, profundidade 1–2 e no máximo 250 nós, com canvas único,
pan/zoom, fit, seleção, busca, foco, filtros e refoco progressivo. Não há simulação contínua nem
conteúdo Markdown no payload. O override individual `nexus_graph_enabled=true` está ativo somente
para o owner; a flag global permanece desligada.

### Mesa Nexus

Somente contratos, permissões e flags existem. A fundação da Mesa não foi iniciada e continua
bloqueada até concluir os rollouts e a portabilidade.

## Segurança

- O Advisor de segurança mantém um aviso: proteção contra senhas vazadas desabilitada.
- A proteção é um recurso do plano Supabase Pro; ativá-la pode criar custo e não foi autorizada.
- `@lovable.dev/mcp-js` é dependência funcional do servidor MCP, das rotas e do build.
- A auditoria isolada encontrou três avisos moderados e um baixo, sem alto ou crítico.
- A vulnerabilidade moderada vem do adaptador Hono para Windows; o runtime publicado é Cloudflare
  Worker. A cadeia continua monitorada e não foi removida.
- O issuer OAuth do manifesto MCP foi alinhado ao projeto Supabase real.
- `@cloudflare/vite-plugin` foi atualizado para `^1.48.0`, removendo a cadeia vulnerável de `sharp`.
- O audit de produção após a atualização encerrou sem alto ou crítico; permanecem somente os
  avisos baixo/moderados da cadeia Lovable descritos acima.
- O workflow Quality agora bloqueia vulnerabilidades de produção altas ou críticas.
- O projeto e o CI fixam `npm@11.9.0`, versão que reproduz o lockfile da árvore atual.

A branch histórica `agent/security-auto-deploy` não deve ser mesclada: remove o SDK MCP, não
atualiza o lockfile e mistura upgrades de lint sem validação.

## Desempenho e migrations

A migration `20260729192815_cover_nexus_knowledge_foreign_keys.sql` adiciona os 17 índices
solicitados pelo Database Advisor. A migration aditiva
`20260729203953_feature_flag_user_overrides.sql` cria o mecanismo de canário individual com RLS,
grants explícitos e rollback por remoção do override. As migrations
`20260729211452_knowledge_link_integrity.sql`,
`20260729230437_knowledge_transactional_creation.sql`,
`20260729231757_knowledge_semantic_relations.sql` e
`20260729233047_knowledge_postgres_search.sql` cobrem indexação transacional, criação compatível
com RLS, relações e pesquisa. Os fixes
`20260729233637_fix_contributor_policy_helper_acls.sql`,
`20260729234101_fix_knowledge_search_composite.sql` e
`20260729234705_fix_assets_canary_override.sql` corrigem, respectivamente, ACLs usadas por
policies, o tipo composto da busca e a resolução do canário no trigger de upload.

Validação posterior:

- foreign keys sem índice: zero;
- avisos de segurança adicionais: zero;
- índices não usados: mantidos, pois as tabelas novas ainda não tiveram rollout.

## Publicação

O workflow Quality continua rodando em PR e push para `main`. A publicação Cloudflare foi
configurada para ocorrer somente depois de um Quality bem-sucedido causado por push no `main`,
no mesmo repositório. O checkout usa exatamente o `head_sha` aprovado.

O endpoint canônico `https://tadeon-nexus.gtadeusz.workers.dev` está público e responde pela
aplicação, redirecionando corretamente para `/login`. Os valores dos secrets continuam ocultos por
design. O fluxo manual permanece restrito à branch `main`.

A Quality nº 97 do conteúdo integrado aprovou `npm ci`, audit, lint, typecheck, testes e build.
O PR #25 foi mesclado por squash no SHA `0d4cfde11dc9771f40fb900795e724f688e96943`.

O runtime canônico é o Worker Cloudflare. O smoke test público do Worker carregou a aplicação,
redirecionou corretamente para `/login` e não apresentou erro de console da aplicação. O único
erro observado veio da extensão do navegador de inspeção, fora do app.

O Lovable permanece sincronizado como ambiente de construção e não participa do funcionamento
direto da aplicação. O deploy anteriormente disponível não expunha um identificador verificável;
o workflow agora injeta o SHA aprovado no build e exige que o endpoint público confirme esse SHA.

## Ajustes de ficha nesta continuidade

- DT de Resistência recolhível, sem alterar a fórmula;
- Defesa centralizada em Pontos Vitais;
- Atributos distribuídos em grade com radar preservado;
- Condições visuais foram reforçadas no cabeçalho e no corpo da ficha;
- somente Tiers liberados pelo Rank são exibidos;
- cada Tier de Habilidades pode ser recolhido;
- cálculo de encontro permite selecionar explicitamente as fichas e mostra conjunto, média e
  critério;
- criação de ficha oferece um guia opcional e dispensável.

## Importação e exportação

O formato atual cobre somente `character_sheets` e `game_settings`, com merge por `id` e
cópia local prévia. Workspaces, campanhas, Assets e O Nexus ainda não fazem parte do formato.
A expansão deve receber nova versão, validação de escopo, dry-run e rollback antes de rollout.

## Flags confirmadas

Todas as flags globais permanecem desligadas. A tabela
`feature_flag_user_overrides` aplica precedência somente ao usuário autenticado. Há exatamente
três overrides ativos para o proprietário mestre:

- `nexus_assets_v2_enabled=true`;
- `nexus_knowledge_enabled=true`;
- `nexus_graph_enabled=true`.

`nexus_lighting_enabled`, `nexus_r2_enabled`, `nexus_realtime_enabled` e
`nexus_tabletop_enabled` não possuem override e continuam desligadas. O jogador não vê overrides de terceiros e não pode criá-los.

## Estado do rollout

O rollout controlado de Nexus Assets, O Nexus e grafo local foi iniciado somente para o
proprietário mestre.
A integração, migration, policies, grants, teste transacional e ativação foram concluídos. A
validação funcional em sessão autenticada ainda está pendente; portanto os módulos não são
classificados como concluídos nem foram liberados globalmente.

O teste de RLS confirmou: mestre proprietário enxerga os dois overrides; jogador enxerga zero e
não consegue inserir. O backend de O Nexus passou por cenários autenticados auto-revertidos com
CRUD, relação, heading, menção, backlink, link quebrado, conflito otimista, limite, relações
semânticas, alias, tag, pesquisa de conteúdo/propriedades/relações, filtros, paginação e ocultação
para o jogador. Os testes deixaram zero páginas, tags, menções e relações residuais.

O canário de Nexus Assets também passou reserva Supabase para o owner, negação do jogador sem
override e negação de R2, deixando zero sessões residuais. O upload/download do objeto real, quota
com arquivo real e a validação visual dos dois módulos em frontend autenticado continuam
pendentes. O rollback do canário é remover as três linhas de override. Importação/exportação v2
permanece posterior aos canários. A fundação da Mesa Nexus permanece posterior à portabilidade.

## Próximos critérios

1. Confirmar pelo marcador público que o deploy Cloudflare corresponde ao SHA aprovado de `main`.
2. Concluir o canário autenticado de Nexus Assets com upload/download do objeto real, quota e
   rollback operacional.
3. Validar visualmente no frontend autenticado os fluxos já aprovados no backend de O Nexus.
4. Validar visualmente o grafo local no frontend autenticado e, depois, evoluir filtros temáticos;
   manter o grafo global somente sob demanda.
5. Criar bibliotecas e templates sobre O Nexus e projetar importação/exportação v2 com escopo,
   preview, dry-run, conflitos, ZIP reimportável e restauração.
6. Iniciar a fundação gráfica da Mesa Nexus somente depois de concluir portabilidade e rollouts;
   iluminação e Realtime continuam fora desse primeiro marco.
