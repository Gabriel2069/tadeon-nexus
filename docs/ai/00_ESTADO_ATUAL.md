# Estado atual do Tadeon Nexus

Atualizado em 29 de julho de 2026 pelo Work de continuidade independente.

## Fonte de verdade

- O estado real do GitHub, Supabase e Lovable prevalece sobre registros históricos.
- O Livro de Regras de Tessitura do Vazio governa mecânicas e terminologia.
- O Fio-Mestre governa identidade visual.
- Checkpoint de entrada: `1c5b66cf83bdd9d4b070019510080eb2d63dc74b`.
- Branch de continuidade: `agent/continuity-security-publish`.

## Estado confirmado

### Fundação

A fundação de workspace, campanha, membros, flags e auditoria está implementada e aplicada no
Supabase. As tabelas expostas permanecem com RLS habilitada. Há um workspace, uma campanha e os
vínculos esperados; fichas e dados legados foram preservados.

### Nexus Assets

O catálogo provider-neutral, Supabase Storage privado, quotas, reservas de upload, autorização,
serviço e interface estão implementados. Não há assets cadastrados e
`nexus_assets_v2_enabled=false`. O rollout ainda não foi executado.

R2 permanece preparado, mas inativo. Bucket, credenciais, CORS e teste ponta a ponta não foram
confirmados. `nexus_r2_enabled=false` e não deve ser alterada nessas condições.

### O Nexus

Schema, RLS, serviço, Markdown seguro, wikilinks, aliases, relações, versões e interface estão
implementados. Não há páginas cadastradas e `nexus_knowledge_enabled=false`. O rollout ainda não
foi executado.

A migration aplicada em produção é
`20260729130904_nexus_knowledge_foundation.sql`. O nome local anterior com timestamp
`20260729131000` foi reconciliado sem alterar o SQL aplicado.

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
solicitados pelo Database Advisor. Ela é aditiva e não altera dados, grants, policies ou RLS.

Validação posterior:

- foreign keys sem índice: zero;
- avisos de segurança adicionais: zero;
- índices não usados: mantidos, pois as tabelas novas ainda não tiveram rollout.

## Publicação

O workflow Quality continua rodando em PR e push para `main`. A publicação Cloudflare foi
configurada para ocorrer somente depois de um Quality bem-sucedido causado por push no `main`,
no mesmo repositório. O checkout usa exatamente o `head_sha` aprovado.

A existência dos secrets e o estado atual da conta/deploy Cloudflare não são inspecionáveis neste
Work e permanecem não confirmados. O fluxo manual continua disponível.

Lovable está publicado no checkpoint de entrada. A atualização do projeto publicado só deve ser
considerada concluída quando o PR for mesclado e o deploy correspondente for verificado.

## Ajustes de ficha nesta continuidade

- DT de Resistência recolhível, sem alterar a fórmula;
- Defesa centralizada em Pontos Vitais;
- Atributos distribuídos em grade com radar preservado;
- Condições visuais já existentes foram preservadas;
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

Todas permanecem desligadas:

- `nexus_assets_v2_enabled`;
- `nexus_graph_enabled`;
- `nexus_knowledge_enabled`;
- `nexus_lighting_enabled`;
- `nexus_r2_enabled`;
- `nexus_realtime_enabled`;
- `nexus_tabletop_enabled`.

## Próximos critérios

1. Quality real aprovado: audit, lint, typecheck, testes e build.
2. Revisão do diff e merge somente após checks aprovados.
3. Verificação do deploy Cloudflare no SHA mesclado.
4. Canário de Nexus Assets com Supabase Storage, mestre e jogador, upload/download/negação/quota
   e rollback pela flag.
5. Canário de O Nexus com mestre e jogador, CRUD, escopos, conflito, Markdown e rollback pela flag.
6. Importação/exportação v2 somente depois dos canários.
7. Mesa Nexus somente depois de concluir os itens anteriores.
