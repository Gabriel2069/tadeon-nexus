# Tadeon Nexus — Contratos centrais da expansão

Este documento define os contratos estáveis da Fase 1. Eles não ativam O Nexus, Mesa Nexus,
Realtime, iluminação, Nexus Assets ou R2.

## Papéis e alcance

| Papel                      | Contrato                                 | Alcance   | Poder principal                                     |
| -------------------------- | ---------------------------------------- | --------- | --------------------------------------------------- |
| Administrador da aplicação | `AppRole = "mestre"` durante a transição | aplicação | administra usuários, flags e qualquer workspace     |
| Proprietário do workspace  | `WorkspaceRole = "owner"`                | workspace | controla o workspace e suas campanhas               |
| Administrador do workspace | `WorkspaceRole = "admin"`                | workspace | auxilia o proprietário sem transferir propriedade   |
| Mestre                     | `CampaignRole = "master"`                | campanha  | controla a campanha e suas cenas                    |
| Co-mestre                  | `CampaignRole = "co_master"`             | campanha  | edita conteúdo e cenas, mas não substitui o mestre  |
| Jogador                    | `CampaignRole = "player"`                | campanha  | cria/edita os próprios recursos e interage em cena  |
| Observador                 | `CampaignRole = "observer"`              | campanha  | consulta conteúdo liberado, sem editar ou interagir |
| Sem acesso                 | nenhum papel aplicável                   | nenhum    | todas as ações protegidas são negadas               |

O valor legado `mestre` continua sendo tratado como administrador da aplicação para preservar o
painel atual. Ele não será duplicado nas tabelas de participação. Os novos papéis de workspace e
campanha representam escopos diferentes.

## Autorização central

Toda autorização de interface nova deve passar por `src/lib/permissions.ts`. Componentes não
devem inventar matrizes próprias de papéis.

Regras principais:

- o administrador da aplicação tem acesso administrativo global;
- proprietário e administrador gerenciam o workspace;
- mestre gerencia a campanha;
- co-mestre gerencia conteúdo e cenas, mas não operações exclusivas do mestre;
- jogador interage e edita recursos próprios;
- observador é somente leitura;
- ausência de papel significa negação;
- RLS continua sendo a autoridade final no banco, independentemente da interface.

## Feature flags

| Chave                     | Padrão    |
| ------------------------- | --------- |
| `nexus_knowledge_enabled` | desligada |
| `nexus_graph_enabled`     | desligada |
| `nexus_assets_v2_enabled` | desligada |
| `nexus_tabletop_enabled`  | desligada |
| `nexus_realtime_enabled`  | desligada |
| `nexus_lighting_enabled`  | desligada |
| `nexus_r2_enabled`        | desligada |

Precedência:

1. todos os recursos começam desligados;
2. uma variável pública de build pode definir o padrão de um ambiente;
3. uma configuração administrativa protegida pelo banco pode sobrescrever esse padrão.

Variáveis `VITE_` são públicas e nunca podem conter segredo. Chaves privadas, service role,
credenciais do Postgres e credenciais do R2 não pertencem ao frontend.

## Contratos de domínio

Os tipos centrais ficam em `src/lib/nexus-contracts.ts`:

- `WorkspaceRole`;
- `CampaignRole`;
- `AssetProvider`;
- `AssetVisibility`;
- `KnowledgeNodeType`;
- `KnowledgeNodeStatus`;
- `KnowledgeVisibility`;
- `RelationType`;
- `SceneEntityType`;
- `ScenePermission`;
- `TabletopRole`.

Esses tipos são contratos compartilhados. As fases futuras podem acrescentar valores de modo
compatível, mas não devem redefinir versões locais dentro de componentes.

## Fundação persistente

A migration da Fase 1 acrescenta:

- `workspaces` e `workspace_members`;
- `campaigns` e `campaign_members`;
- `feature_flags`;
- `audit_events`;
- `campaign_id` opcional nas fichas e na configuração legada.

`user_roles` continua existindo e representa o papel global da aplicação. `workspace_members`
representa somente o vínculo com um workspace; `campaign_members` representa somente o vínculo
com uma campanha. Portanto, as tabelas de participação não duplicam o mesmo alcance.

O backfill cria um workspace e uma campanha padrão, associa todos os registros existentes e
mantém as policies legadas das fichas e do painel. As novas colunas permanecem opcionais durante
a transição para permitir rollback de código sem perda de acesso. Em instalações vazias, o
backfill é simplesmente adiado até existir um perfil, sem impedir a criação limpa do banco.

As funções auxiliares de RLS ficam no schema não exposto `private`, recebem o usuário apenas de
`auth.uid()` e não aceitam um ID arbitrário de usuário. A interface ajuda na experiência, mas o
banco permanece a autoridade final.

## Contratos de O Nexus

A taxonomia completa, os estados de ciclo de vida, as visibilidades, as direções de relação e os
níveis de ACL agora são definidos em `src/lib/nexus-contracts.ts` e espelhados pelos enums do
Postgres. O vocabulário de tipos permanece extensível sem criar uma tabela por tipo de página.

As permissões de interface `knowledge:view`, `knowledge:create`, `knowledge:edit`,
`knowledge:manage` e `knowledge:publish` passam pela mesma camada central. A RLS faz a
validação definitiva com o usuário de `auth.uid()` e bloqueia todas as tabelas enquanto a flag
`nexus_knowledge_enabled` estiver desligada.
