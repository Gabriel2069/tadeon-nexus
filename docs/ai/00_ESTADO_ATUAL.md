# Estado atual do Tadeon Nexus

Atualizado em 1º de agosto de 2026 pelo Work de continuidade independente.

## Fonte de verdade

- O estado real do GitHub, Supabase e Cloudflare prevalece sobre registros históricos; o Lovable é apenas uma conexão de construção.
- O Livro de Regras de Tessitura do Vazio governa mecânicas e terminologia.
- O Fio-Mestre governa identidade visual.
- Checkpoint de entrada: `1c5b66cf83bdd9d4b070019510080eb2d63dc74b`.
- Checkpoints integrados: PRs #25–#60 em `main`; o último lote integrado está em `9a715823977d7d656f1f14086c499910219e43c4`.

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

As bibliotecas estruturadas e 14 templates iniciais foram integrados no PR #44 e aplicados como
`20260730004019_knowledge_libraries_and_templates.sql`. Vínculos com campanha e ficha são
reversíveis e não copiam nem reescrevem a página canônica. Os três índices de FK posteriores estão
registrados como `20260801040642_cover_knowledge_library_foreign_keys.sql`.

A portabilidade de O Nexus foi integrada no PR #47 e aplicada como
`20260801044451_knowledge_vault_portability.sql`: ZIP versionado, Markdown, YAML, pastas, aliases,
tags, wikilinks, headings, anexos, preview, mapeamento de tipos, dry-run, conflitos não destrutivos,
relações em manifesto e exportação reimportável. A escrita ocorre em uma RPC transacional
`SECURITY INVOKER`; uploads de anexos são purgados se o commit do banco falhar.

### Mesa Nexus

A Fundação Gráfica do Comando 9 foi integrada no PR #49 com PixiJS 8 em chunk isolado. A rota
`/tabletop` é protegida para mestre e condicionada a `nexus_tabletop_enabled`. O motor separa
`TabletopEngine`, `SceneManager`, `CameraController`, `SelectionManager`, `LayerManager`,
`EntityRenderer`, `TextureManager`, `GridRenderer`, `InteractionController` e
`CommandHistory`.

O canvas cobre pan, zoom, centralização, fit, coordenadas mundo/tela, resize, grade quadrada
ou desligada, escala, snap, seleção múltipla, movimento, redimensionamento, rotação, bloqueio,
duplicação, exclusão, atalhos, menu contextual e undo/redo local. Cena vazia, falha de asset e
liberação de canvas, listeners e texturas são tratados.

A fundação persistente do Comando 10 foi integrada nos PRs #51 e #52 e aplicada como
`20260801113400_tabletop_persistent_scenes.sql` e
`20260801113727_cover_tabletop_composite_foreign_key.sql`. Ela inclui cenas, cinco camadas
padrão, entidades, snapshots, log mínimo, vínculos explícitos com asset/ficha/Página do Nexus,
versões otimistas, duplicação e restauração. As tabelas brutas são visíveis e editáveis somente
por master/co-master; jogadores continuam vendo zero linhas, inclusive propriedades de entidades.

O editor persistente foi integrado no PR #53. Ele conecta campanha e lista de cenas ao motor, permite
criar, carregar, duplicar e arquivar cenas, salva grade, camadas, tokens e objetos, cria snapshots
e restaura com ponto de recuperação. Cenas arquivadas ficam bloqueadas no próprio motor. A RPC
aditiva `20260801140620_save_tabletop_scene_state.sql` salva cena, camadas, inclusões, alterações e
exclusões em uma única transação `SECURITY INVOKER`; qualquer versão obsoleta aborta o lote todo.

O inspector persistente foi completado no PR #54: nome, tamanho, elevação, posição, rotação,
ocultação, condições visuais, estado e anotações podem ser editados sem sair do canvas. Presets de
tamanho e alterações em seleção múltipla, copiar/colar e vínculos reversíveis com fichas e Páginas
do Nexus usam o mesmo salvamento transacional. A consulta de alvos continua limitada pelas RLS
existentes, e camadas bloqueadas impedem também as operações de copiar e colar.

A paleta de drag and drop foi completada no PR #55. Ela carrega metadados mínimos de imagens do
Nexus Assets e itens visíveis da biblioteca de O Nexus, respeita o escopo workspace/campanha e
limita a renderização inicial. A Mesa persiste somente `asset_id` e
`linked_knowledge_node_id`; URLs assinadas nunca entram no banco ou no payload de drag e são
renovadas quando a cena é reaberta. O drop respeita câmera, snap e bloqueio da camada de destino.

A reordenação de cenas foi completada no PR #56 e aplicada como
`20260801145811_reorder_tabletop_scenes.sql`. A RPC `SECURITY INVOKER` bloqueia o conjunto da
campanha, exige todos os IDs, posições contíguas e versões atuais, normaliza a ordem numa única
transação e registra `scene.reordered`. Documentos incompletos ou obsoletos abortam sem atualização
parcial, e o jogador não possui autorização para executá-la.

O vínculo com Página do Nexus abre diretamente pelo PR #57. A rota aceita um identificador textual
limitado e delega a resolução à consulta normal de O Nexus sob RLS; referências inexistentes ou
proibidas usam o mesmo erro neutro e não expõem metadados laterais.

A robustez geométrica e de assets foi integrada no PR #58: hit-test e renderização compartilham a
mesma rotação, posição, tamanho e ângulo são limitados ao contrato da cena, sprites acompanham
redimensionamento, URLs temporárias são renovadas sem persistência e erros não exibem URLs
assinadas. O gesto móvel de pinça passou a combinar pan e zoom. Os testes unitários cobrem os
limites e as transformações, e a atualização compatível da cadeia de lint removeu 14 alertas altos
exclusivos das ferramentas de desenvolvimento.

A adaptação responsiva da Mesa foi integrada no PR #59. Navegação, cabeçalho, seletores, ferramentas,
canvas, paleta, camadas e inspector se reorganizam para celular e tablet; alvos de toque foram
ampliados, menus permanecem dentro da viewport e itens da paleta podem ser inseridos por toque sem
depender de drag and drop. O estado de salvamento diferencia conteúdo salvo, salvando e alterações
locais pendentes.

Os elementos visuais persistentes do Comando 10 foram concluídos no PR #60. O mapa de fundo usa o
`background_asset_id` e URL privada temporária sem gravar credenciais; o vínculo com ficha preenche
o proprietário do token; barras opcionais, ícones e condições são propriedades estritamente
visuais, sem rolagens nem automação de regras. Rótulos longos são recortados apenas na renderização.

A fundação segura do Realtime começou no PR #62, ainda sem assinatura de canais. O protocolo
versionado valida cena, idade, sequência, origem, limites e payloads; deduplicação e rate limit
locais protegem Broadcast, e Presence aceita apenas estado lento. A flag global e os overrides
`nexus_realtime_enabled` continuam desligados.

As salas persistentes foram integradas no PR #63 e aplicadas como
`20260801211122_tabletop_realtime_sessions.sql`. Elas reutilizam `campaign_members`, permitem no
máximo uma sala aberta por campanha e registram somente participação específica da sessão. RLS e
RPCs `SECURITY INVOKER` cobrem abrir, entrar, sair, trocar cena, bloquear entrada, remover e encerrar.
A FK composta da cena foi coberta por `20260801211246_cover_tabletop_session_scene_foreign_key.sql`.
Ambas as tabelas permanecem vazias e inacessíveis enquanto a flag estiver desligada.

O teste autenticado auto-revertido confirmou criação, cinco camadas, token, alteração, snapshot,
restauração, conflito `40001`, negação de escrita e leitura bruta zero para jogador, além de zero
resíduos. Não há Realtime, iluminação calculada, visão, névoa ou R2.

O estado atual da Mesa substitui as limitações históricas descritas acima. Os PRs #88 a #91
corrigiram a deriva da grade no zoom isométrico, acrescentaram andares persistentes com elevação,
oclusão estrita pelo andar ativo, arquitetura e visibilidade vinculadas ao nível, portas
explicitamente acionáveis por jogador, iluminação recalculada pela arquitetura autorizada e
imagens diretas do Nexus Assets para ambiente, tokens e objetos.

A visão do jogador nunca recebe paredes completas: recebe somente a geometria mínima das portas
marcadas como acionáveis. A troca usa versão otimista; eventos Realtime contêm apenas ID, tipo e
versão, e cada cliente recarrega a visão filtrada pelo servidor. A Edge Function `tabletop-view`
está ACTIVE na versão 5 com JWT obrigatório. O teste transacional confirmou porta aberta/fechada,
rejeição de versão obsoleta, isolamento de andar e rollback sem resíduos.

No modo isométrico, tokens, criaturas, personagens e objetos com imagem usam billboard legível por
padrão; o inspetor permite alternar para imagem plana. Tiles e mapas continuam acompanhando o chão.
Paredes, janelas e portas são renderizadas como prismas com espessura, faces, tampas e topo. A grade
usa reprojeção correta depois de cada zoom e os testes cobrem deriva simples e acumulada.

As migrations `20260809183045_tabletop_levels_and_player_doors.sql`,
`20260809183328_harden_tabletop_spatial_rpc_privileges.sql`,
`20260809183559_isolate_tabletop_privileged_rpcs.sql` e
`20260809183735_cover_tabletop_level_actor_foreign_keys.sql` estão aplicadas. Implementações
privilegiadas ficam no schema `private`; a API pública é composta por wrappers
`SECURITY INVOKER`. O Advisor confirma zero FKs sem índice e nenhum alerta de função
`SECURITY DEFINER` exposta.

## Segurança

- O Advisor de segurança mantém um aviso: proteção contra senhas vazadas desabilitada.
- A proteção é um recurso do plano Supabase Pro; ativá-la pode criar custo e não foi autorizada.
- `@lovable.dev/mcp-js` é dependência funcional do servidor MCP, das rotas e do build.
- A auditoria isolada encontrou três avisos moderados e um baixo, sem alto ou crítico.
- Os avisos moderados vêm do adaptador Hono e do servidor de desenvolvimento esbuild em Windows;
  o runtime publicado é Cloudflare Worker. A cadeia continua monitorada e não foi removida.
- O issuer OAuth do manifesto MCP foi alinhado ao projeto Supabase real.
- `@cloudflare/vite-plugin` foi atualizado para `^1.48.0`, removendo a cadeia vulnerável de `sharp`.
- `yaml` foi atualizado para `^2.9.0`, removendo o advisory corrigível de pilha profunda.
- O audit de produção após a atualização encerrou sem alto ou crítico; permanecem somente os
  três avisos moderados e um baixo da cadeia Lovable descritos acima.
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

As migrations `20260730004019_knowledge_libraries_and_templates.sql`,
`20260801040642_cover_knowledge_library_foreign_keys.sql` e
`20260801044451_knowledge_vault_portability.sql` acrescentam bibliotecas, templates, índices e
portabilidade transacional sem alterar dados existentes.

As migrations `20260801113400_tabletop_persistent_scenes.sql`,
`20260801113727_cover_tabletop_composite_foreign_key.sql` e
`20260801140620_save_tabletop_scene_state.sql` acrescentam a persistência manager-only da Mesa,
cobrem todas as FKs e tornam o salvamento do editor atômico. A migration
`20260801145811_reorder_tabletop_scenes.sql` acrescenta reordenação atômica otimista. Os timestamps
locais foram reconciliados ao histórico remoto sem mudar o SQL aplicado.

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

A Quality nº 158 da Fundação Gráfica aprovou `npm ci`, audit, lint, typecheck, testes e build.
O PR #49 foi mesclado por squash no SHA
`8bd465aceff2216cf66a80a76bafb615bbbeb0b0`, confirmado pelo marcador público do Worker.

O runtime canônico é o Worker Cloudflare. O smoke test público do Worker carregou a aplicação,
redirecionou corretamente para `/login` e não apresentou erro de console da aplicação. O único
erro observado veio da extensão do navegador de inspeção, fora do app.

As Qualities nº 171 e nº 173 do editor persistente aprovaram instalação, audit, lint, typecheck,
testes e build. As Qualities nº 175 e nº 176 do inspector e a nº 178 da paleta aprovaram os mesmos
seis gates. A Quality nº 181 aprovou o primeiro lote da reordenação, a nº 182 confirmou seu
checkpoint final e a nº 184 aprovou a navegação direta Mesa → O Nexus.

As Qualities nº 189, nº 191 e nº 193 aprovaram, respectivamente, a robustez do núcleo, a revisão
responsiva e os elementos visuais persistentes. Cada uma passou pelos seis gates: instalação,
auditoria de dependências, lint, typecheck, testes e build. O marcador público do Worker confirma o
SHA `9a715823977d7d656f1f14086c499910219e43c4`.

As Qualities nº 275, nº 277 e nº 279 aprovaram, respectivamente, andares/elevação,
portas do jogador e billboards/prismas nos mesmos seis gates. O deploy automático confirmou no
Worker o SHA `9634590890b20ee44c88527cb6cd31103631316c`.

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

O formato legado continua cobrindo `character_sheets` e `game_settings`. O Nexus agora possui
um formato próprio `tadeon-nexus-vault@1`, limitado a 500 páginas, 2.000 relações e 2.000 vínculos
de anexos por ZIP. Ele preserva Markdown UTF-8, YAML, aliases, tags, caminhos, wikilinks, relações e
anexos permitidos pelo Nexus Assets.

O dry-run é obrigatório; conflitos preservam a página existente por padrão ou criam uma cópia com
slug novo. Nenhuma opção sobrescreve ou apaga conteúdo anterior. Testes unitários cobrem roundtrip,
caracteres especiais, links relativos seguros e rollback de uploads. Testes SQL em rollback
confirmaram criação, reimportação com `skip` e `copy`, isolamento do jogador e zero resíduos.

## Flags confirmadas

Todas as flags globais permanecem desligadas. O mecanismo de overrides continua aplicando
precedência somente ao usuário autenticado e não expõe linhas de terceiros.

O proprietário mestre possui seis overrides ativos:

- `nexus_assets_v2_enabled=true`;
- `nexus_knowledge_enabled=true`;
- `nexus_graph_enabled=true`;
- `nexus_tabletop_enabled=true`;
- `nexus_realtime_enabled=true`;
- `nexus_lighting_enabled=true`.

O jogador membro da campanha `bf9e85a7-0403-4de8-8d93-dd4d8706bab2` possui somente três
overrides ativos: `nexus_tabletop_enabled`, `nexus_realtime_enabled` e
`nexus_lighting_enabled`. Sob RLS ele enxerga exatamente essas três linhas; `anon` não possui
privilégio de leitura. `nexus_r2_enabled` continua desligada para todos.

## Estado do rollout

Nexus Assets, O Nexus, grafo e Mesa permanecem em canário individual; nenhuma flag global foi
ligada. Assets e O Nexus continuam disponíveis apenas ao proprietário mestre. O rollout novo da
Mesa alcança também o único jogador já membro da campanha, de forma reversível e sem ampliar acesso
a tabelas brutas.

O banco preserva uma cena, um nível Térreo e zero entidades, paredes, luzes, névoa, sessões ou
snapshots. Os testes de duplicação, snapshot v2, restauração, visibilidade, porta, conflito otimista
e isolamento foram executados em transações revertidas e deixaram zero dados temporários.

O Worker canônico confirmou o SHA funcional `9634590890b20ee44c88527cb6cd31103631316c`. A
primeira interação visual autenticada do jogador ainda depende de ele abrir a Mesa e de o mestre
iniciar uma sala com token controlável. O rollback específico do jogador é remover as três linhas
de override; as flags globais não participam desse rollback.

## Próximos critérios

1. Mestre iniciar uma sala canário, inserir um token com imagem e atribuí-lo ao jogador.
2. Jogador entrar autenticado, alternar uma porta autorizada e confirmar o recálculo de luz e sombra
   sem receber arquitetura secreta.
3. Validar no frontend real imagens vertical/plana, elevação, troca de andar, oclusão, portas e
   prismas em desktop e celular.
4. Medir fluidez, memória e liberação de texturas em uma cena representativa antes de ampliar o
   canário.
5. Evoluir o editor com mapas específicos por andar, transições de portas, recortes de teto e
   oclusão por altura, sempre atrás do canário existente.
6. Manter R2 e todas as flags globais desligados até seus próprios critérios de aceite.
