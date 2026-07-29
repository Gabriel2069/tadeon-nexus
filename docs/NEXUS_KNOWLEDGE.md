# O Nexus — fundação de conhecimento

## Estado

O modelo foi preparado de forma aditiva e permanece bloqueado enquanto
`nexus_knowledge_enabled` estiver desligada. Nenhuma rota ou tela existente depende destas
tabelas.

## Escopos e papéis

- `workspace_id` é obrigatório em todo nó;
- `campaign_id` é opcional e, quando preenchido, deve pertencer ao mesmo workspace;
- os vínculos existentes em `workspace_members` e `campaign_members` são reutilizados;
- não existe uma nova tabela de membros;
- RLS é a autoridade final, mesmo quando a interface já esconde uma ação.

Os níveis de acesso aos nós são:

| Visibilidade       | Leitura normal                                                    |
| ------------------ | ----------------------------------------------------------------- |
| `author`           | autor e curadores                                                 |
| `masters`          | mestre, co-mestre e gestores do workspace                         |
| `campaign`         | membros autorizados da campanha                                   |
| `users`            | usuários listados em `knowledge_node_acl`                          |
| `workspace`        | membros autorizados do workspace                                  |
| `internal_public`  | usuários autenticados; somente gestores podem selecionar o nível  |

O autor pode editar o próprio conteúdo. Mestre, co-mestre, proprietário e administrador podem
curar conteúdo dentro do respectivo escopo. Apenas curadores podem promover uma página para
`canonical` ou `deprecated`.

## Conteúdo portável

`knowledge_nodes.content_markdown` é a representação canônica e portável. `plain_text` existe
para pesquisa e acessibilidade, e não substitui o Markdown. Renderizadores devem sanitizar HTML;
o banco nunca considera HTML enviado pelo navegador como confiável.

O modelo usa uma única tabela para todos os tipos de página. Campos específicos vivem em
`properties`, sempre como objeto JSON, e podem ser definidos por `knowledge_templates`.

## Relações e navegação

- `knowledge_edges` mantém relações tipadas e direcionais;
- uma relação só é exibida quando o usuário pode ler os dois nós e a própria visibilidade da
  relação;
- `knowledge_mentions` armazena ocorrências resolvidas de wikilinks;
- `knowledge_aliases` possui escopo de workspace ou campanha e resolução normalizada;
- `knowledge_favorites` e `knowledge_recent` são privados por usuário.

## Histórico

Uma alteração relevante cria uma versão do estado anterior. Mudanças somente técnicas não criam
versão. O limite padrão é 50 versões automáticas por nó e pode ser configurado entre 5 e 200 em
`knowledge_workspace_settings`. Versões manuais futuras não serão removidas por essa retenção.

## Assets

`knowledge_assets` associa páginas ao Nexus Assets. Um trigger mantém também `asset_links`, para
que o painel de arquivos consiga mostrar onde cada anexo é usado. O binário continua no Supabase
Storage ou no futuro R2; nenhum arquivo é armazenado no Postgres.

## Exclusão e auditoria

Nós são arquivados ou removidos logicamente por `archived_at` e `deleted_at`. O cliente não recebe
permissão de `DELETE` físico na tabela de nós. Criação, atualização, arquivamento, restauração e
remoção lógica geram eventos em `audit_events`.

## Camada de serviço

`src/lib/knowledge/knowledge-service.ts` é a única fachada de dados para a nova interface. Ela
normaliza títulos e slugs, mantém texto de pesquisa, aplica atualização otimista por `updated_at`,
resolve aliases e wikilinks, recompõe menções, acessa versões, relações, ACL, anexos, favoritos e
recentes.

Erros do Postgres nunca são apresentados diretamente. `knowledge-errors.ts` converte falhas de
RLS, conflitos e validação em mensagens seguras. Uma divergência de `updated_at` retorna
`KNOWLEDGE_CONFLICT`, permitindo que o editor preserve o rascunho local e peça ao usuário para
comparar as versões.

O parser aceita `[[Título]]`, `[[Título|Rótulo]]` e `[[Título#Seção]]`, ignora links escapados e
blocos de código e preserva posições para backlinks. Links não resolvidos são retornados com
`broken=true`; a criação da página ausente será uma decisão explícita da interface.
