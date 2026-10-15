# Fila de produção e decisões

> Gerado de [project-continuity.json](project-continuity.json). Edite o registro e rode `npm run sync:project`; não mantenha uma cópia manual.

Snapshot: 2026-10-15; referência de runtime: `6f954c40df4b5611ef130818e97e79c12badd1c9`. PR #273 em `codex/nex-008-master-workspace`; integração: `integrated`. Não é prova de deploy.

Estados: planejado → próximo → em andamento → validado na branch → integrado. Publicação exige evidência própria do SHA; adiado conserva o requisito. Se um requisito mudar, preservar o ID e registrar a decisão/evidência.

Cada PR usa IDs desta fila e declara dependências. Trabalho sobre o mesmo proprietário deve ser sequencial; não duplicar implementação. [Conciliação das PRs](PR_RECONCILIATION.md).

| ID | Trabalho | Estado | Prioridade | Responsável | Depende de |
| --- | --- | --- | --- | --- | --- |
| NEX-001 | Preparação estrutural | Integrado | 0 | delivery | — |
| NEX-002 | Mapa, continuidade e conciliação das PRs | Integrado | 0 | delivery | NEX-001 |
| NEX-003 | Véu & Trama: referência aplicada ao shell e Dashboard | Integrado | 1 | shell | NEX-001, NEX-002 |
| NEX-004 | Sidebar, navegação móvel e portais | Integrado | 2 | popup | NEX-003 |
| NEX-013 | Liquid fabric: login, Dashboard e componentes compartilhados | Integrado | 2 | shell | NEX-003, NEX-004 |
| NEX-005 | Ficha por seções e estados | Integrado | 3 | sheet | NEX-003, NEX-013 |
| NEX-006 | Biblioteca, documento e grafo do Nexus | Integrado | 4 | knowledge | NEX-003, NEX-013 |
| NEX-007 | Mesa: hierarquia de ferramentas e workspace | Em andamento | 6 | tabletop | NEX-004, NEX-013 |
| NEX-008 | Painel do Mestre: visão geral, ferramentas e condução | Integrado | 5 | master | NEX-003, NEX-013, NEX-020 |
| NEX-009 | Desempenho e motion | Planejado | 7 | delivery | NEX-003, NEX-007 |
| NEX-010 | Validação real de autorização e rollout | Planejado | 8 | session | NEX-001 |
| NEX-011 | Backup e restauração verificável | Planejado | 8 | assets | NEX-010 |
| NEX-012 | Revisão editorial do corpus canônico | Adiado | 9 | knowledge | NEX-006 |
| NEX-014 | Reconciliar movimento e aprofundar Véu & Trama | Integrado | 3 | shell | NEX-005, NEX-013 |
| NEX-015 | Nexus: continuidade de abas e composição dos painéis | Integrado | 4 | knowledge | NEX-006, NEX-014 |
| NEX-016 | Navegação: menus estáveis e organizados | Integrado | 4 | shell | NEX-014 |
| NEX-017 | Consulta offline: conteúdo local e limites claros | Integrado | 4 | session | NEX-014 |
| NEX-018 | Usuários: papéis, busca e revisão de ações | Integrado | 4 | master | NEX-014 |
| NEX-019 | Backup e diagnóstico: revisão e histórico por conta | Integrado | 4 | assets | NEX-014 |
| NEX-020 | Símbolos reais de Mestre e Backup na navegação | Integrado | 4 | shell | NEX-016 |
| NEX-021 | Nexus: contexto da página e passagem para a Mesa | Em andamento | 5 | knowledge | NEX-015 |

## NEX-001 — Preparação estrutural

- 57 módulos CSS, 12 links globais e responsáveis únicos nos pontos saneados.
- Checks, auditoria e navegador documentados; integração em main é um estado separado.

Evidências: [docs/foundation-completion-validation.json](../docs/foundation-completion-validation.json), [docs/FOUNDATION.md](../docs/FOUNDATION.md), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38146306651), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/258).

## NEX-002 — Mapa, continuidade e conciliação das PRs

- Histórico preservado e separado da fila atual.
- Gate detecta referências ausentes, IDs/dependências inválidos, ciclos e mapas desatualizados.
- PR antiga preserva requisitos e não disputa a fila de integração.

Evidências: [scripts/check-project-continuity.mjs](../scripts/check-project-continuity.mjs), [docs/PR_RECONCILIATION.md](../docs/PR_RECONCILIATION.md), [.github/PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md), [docs/continuity-validation.json](../docs/continuity-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/258).

## NEX-003 — Véu & Trama: referência aplicada ao shell e Dashboard

- Registrar estados vazio, carregando, erro e dados povoados em 390, 820 e 1440 px.
- Revisar hierarquia, leitura, símbolos, superfície, respiro e três indicadores do Dashboard.
- Preservar Fio-Mestre; definir referência aprovada antes de expandir a linguagem às demais telas.

Evidências: [docs/DESIGN.md](../docs/DESIGN.md), [docs/design/board.html](../docs/design/board.html), [docs/design-board-validation.json](../docs/design-board-validation.json), [docs/dashboard-design-validation.json](../docs/dashboard-design-validation.json), [scripts/verify-dashboard-design.mjs](../scripts/verify-dashboard-design.mjs), [src/lib/dashboard-read.test.tsx](../src/lib/dashboard-read.test.tsx), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/259), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38156149188), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38156316960).

## NEX-004 — Sidebar, navegação móvel e portais

- Validar expansão/recolhimento, drawer, busca e conta por mouse, toque e teclado.
- Testar foco, Escape, retorno ao controle, safe areas e teclado real quando disponível.
- Cada propriedade alterada mantém uma autoridade; reduzir dívida CSS em vez de adicionar remendo.

Evidências: [docs/navigation-design-validation.json](../docs/navigation-design-validation.json), [scripts/verify-dashboard-design.mjs](../scripts/verify-dashboard-design.mjs), [scripts/verify-header-ownership.mjs](../scripts/verify-header-ownership.mjs), [src/components/mobile-more-menu.test.tsx](../src/components/mobile-more-menu.test.tsx), [src/components/ui/sheet.test.tsx](../src/components/ui/sheet.test.tsx), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/261), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38162310175), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38162497219), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38162497262).

## NEX-013 — Liquid fabric: login, Dashboard e componentes compartilhados

- Substituir a tipografia editorial rejeitada e os números do Dashboard, preservando dados e três famílias.
- Aplicar trama e profundidade coesas ao login, Dashboard, cabeçalhos, navegação, popups e botões compartilhados.
- Um responsável por material e propriedade animada; retirar concorrentes e limpar frames ao sair/desmontar.
- Verificar telas e estados em 320/390/820/1440px, toque, teclado, foco, redução de movimento e fallback de material.

Evidências: [docs/shared-fabric-validation.json](../docs/shared-fabric-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/263), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38166007425), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38166156123), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38166156073).

## NEX-005 — Ficha por seções e estados

- Extrair identidade, pontos, atributos, perícias e condições preservando estado, regras e autosave.
- Validar ficha povoada, somente leitura, salvamento, erro e transição de usuário.
- Transferir vínculos/modificadores e inventário dos bridges antes de retirar suas funções.

Evidências: [docs/sheet-design-validation.json](../docs/sheet-design-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38171064466), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38182952991).

## NEX-006 — Biblioteca, documento e grafo do Nexus

- Revisar busca/lista/documento/propriedades e prioridades no celular.
- Verificar corpus povoado, filtros e legibilidade da teia sem sobrescrever escolhas manuais.
- Preservar vínculos, importação/exportação e diferenças entre cânone e material derivado.

Evidências: [docs/material-reading-validation.json](../docs/material-reading-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554284521), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554551969).

## NEX-007 — Mesa: hierarquia de ferramentas e workspace

- Mapear cada bridge para função e destino antes de consolidar.
- Separar estado persistente, estado ao vivo e estado local; conservar coordenadas mundo/tela.
- Verificar overlays, seleção, inspector, câmera, jogador/mestre e reconexão em cenas de teste.

Evidências: [docs/tabletop-workspace-map.md](../docs/tabletop-workspace-map.md), [docs/tabletop-workspace-validation.json](../docs/tabletop-workspace-validation.json).

## NEX-008 — Painel do Mestre: visão geral, ferramentas e condução

- Revisar densidade, tabs, editor e listas com dados longos.
- Separar seções do hub por responsabilidade sem duplicar autorização.
- Estados vazio/erro/sucesso e usuário sem acesso preservados.
- Salvar snapshots manualmente, preservar edições durante o envio, invalidar leituras ao desmontar e revisar saída com rascunho pendente.

Evidências: [docs/master-workspace-validation.json](../docs/master-workspace-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/273), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38721993131), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38722287524), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38722287420).

## NEX-009 — Desempenho e motion

- Medir carregamento por rota, chunk Pixi, frames e custos de efeitos antes de otimizar.
- Movimento reduzido, cancelamento e ausência de loops redundantes verificados.
- Registrar ganhos medidos; não inferir redução de bytes da redução de arquivos.

Evidências: pendentes; não declarar concluído.

## NEX-010 — Validação real de autorização e rollout

- Em ambiente adequado, testar mestre, jogador, espectador e acesso negado entre campanhas.
- Conferir migrations aplicadas, flags e OAuth com evidência datada; não reutilizar status histórico como atual.
- Não aplicar migrations, ativar flags ou mudar provedores durante refinamento visual.
- Requisito de NEX-015 conciliado em DEC-010: verificar filtros, grupos, leitura longa, rascunhos e conflitos com corpus real autorizado, incluindo campanhas e o limite de 500 candidatos; fixtures não satisfazem essa autorização.

Evidências: pendentes; não declarar concluído.

## NEX-011 — Backup e restauração verificável

- Verificar dump restaurável e inventário de objetos sem expor credenciais.
- Ensaiar restauração em ambiente isolado e registrar limites de banco, Storage e R2.

Evidências: pendentes; não declarar concluído.

## NEX-012 — Revisão editorial do corpus canônico

- Revalidar as fontes e o pacote antes de tratar contagens de agosto como atuais.
- Preservar proveniência, aliases e relações ao revisar as sínteses.

Evidências: pendentes; não declarar concluído.

## NEX-014 — Reconciliar movimento e aprofundar Véu & Trama

- Abas com um proprietário, sem indicador deslizante concorrente.
- Dobras e popups com presença interrompível, foco e movimento reduzido.
- Métricas do Dashboard em placas com relevo, fios com desaparecimento gradual; cores locais na ficha.

Evidências: [docs/material-reading-validation.json](../docs/material-reading-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554284521), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554551969).

## NEX-015 — Nexus: continuidade de abas e composição dos painéis

- Refinar fechamento da última aba, reabertura e recuperação de rascunhos com testes de navegação.
- Adicionar dimensionamento e preferências de painéis sem estado paralelo ou bridge de DOM.
- Ampliar cobertura de filtros, grupos e leitura longa com fixtures de 120/500 páginas; preservar o limite de 500 candidatos e explicitar paginação. Validação do corpus real autorizado pertence a NEX-010.

Evidências: [docs/nexus-continuity-validation.json](../docs/nexus-continuity-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38669420714), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38669674635).

## NEX-016 — Navegação: menus estáveis e organizados

- Menu Mais em lista, sidebar recolhida acessível e transição entre drawer e conta com foco consistente.
- Eliminar movimentos concorrentes dos controles e manter abertura/fechamento direcional com redução de movimento.

Evidências: [docs/navigation-utilities-validation.json](../docs/navigation-utilities-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/271), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675134229), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675372253).

## NEX-017 — Consulta offline: conteúdo local e limites claros

- Busca local, contagem de detalhes, atualização da leitura e limpeza confirmada da cópia desta conta.
- Preservar separação por conta/cargo e distinguir cópia local, sessão verificada e backup.

Evidências: [docs/navigation-utilities-validation.json](../docs/navigation-utilities-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/271), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675134229), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675372253).

## NEX-018 — Usuários: papéis, busca e revisão de ações

- Busca por nome/e-mail, filtro por papel, estados de erro e confirmação antes de alterar papéis ou excluir contas.
- Isolar leituras e respostas por identidade; bloquear alterações simultâneas e preservar revisão após falha.

Evidências: [docs/navigation-utilities-validation.json](../docs/navigation-utilities-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/271), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675134229), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675372253).

## NEX-019 — Backup e diagnóstico: revisão e histórico por conta

- Histórico local por mestre verificado, validação de importação e revisão antes de mesclar registros.
- Cópia prévia confirmada por transação local, falhas parciais explícitas e diagnóstico com invalidação de leituras.
- Distinguir exportação parcial de fichas/configurações e restauração completa de DB/Storage/R2, que permanece em NEX-011.

Evidências: [docs/navigation-utilities-validation.json](../docs/navigation-utilities-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/271), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675134229), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38675372253).

## NEX-020 — Símbolos reais de Mestre e Backup na navegação

- Retirar máscaras e regras que escondem os SVGs autorais na sidebar e no dock.
- Verificar SVG real, dimensões, pseudo-elementos e estados ativo, normal, recolhido e drawer em 320/390/820/1440px.

Evidências: [docs/master-workspace-validation.json](../docs/master-workspace-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/273), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38721993131), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38722287524), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38722287420).

## NEX-021 — Nexus: contexto da página e passagem para a Mesa

- A localização na Mesa acompanha a página realmente selecionada e permite escolher os destinos retornados.
- A localização participa do layout sem cobrir a leitura; abas ativas permanecem visíveis no trilho sem rolar a página.
- Respostas de páginas anteriores não reaparecem na leitura atual.

Evidências: [docs/tabletop-workspace-validation.json](../docs/tabletop-workspace-validation.json).

## Decisões vigentes

| ID | Decisão | Motivo |
| --- | --- | --- |
| DEC-001 | Preservar Fio-Mestre; NexOS é outro projeto. | Preservar identidade autoral. O brief de 11/10 permite explorar vidro dimensional no Tadeon, sem importar identidade cósmica do NexOS. |
| DEC-002 | Uma fonte de verdade para cada responsabilidade. | Estado React, viewport, tokens e dados não recebem escritores paralelos. |
| DEC-003 | Manter estrutura atual; extrair módulos por responsabilidade. | Criar src/features e src/services em paralelo repetiria os serviços já existentes. |
| DEC-004 | Preservar migrations e corpus editorial separadamente. | Consolidação do código não autoriza reescrever SQL aplicado ou fontes narrativas. |
| DEC-005 | Uma fila canônica e PRs de escopo verificável. | Planos históricos não reabrem tarefas sem confrontar a implementação atual. |
| DEC-006 | Branch validada não significa main integrado ou produção publicada. | Merge em main pode acionar deploy; nenhum desses estados é presumido. |
| DEC-007 | Explorar suspense mitológico, vidro dimensional e movimento de tecidos/fios a partir do Fio-Mestre. | Direção solicitada e aprovada por Tadeu em 11/10/2026. Véu & Trama foi aplicado ao shell/Dashboard na PR #259; expansão segue os responsáveis e dependências da fila canônica. |
| DEC-008 | Tipografia editorial Grenze; menu Mais renderizado pelo shell e primitivo Radix. | Tadeu pediu fonte mais sofisticada e medieval e autorizou prosseguir em 11/10/2026. Retirar captura global e mutação de SVG preservando destinos e círculo. Escolha de fonte superada por DEC-009; navegação consolidada permanece válida. |
| DEC-009 | Tadeu rejeitou Grenze e os números monoespaçados; Cormorant Garamond 500/600/700 e itálico 500 assumem o editorial, Inter 500 com números tabulares assume métricas. PT Mono fica em metadados. Vidro nos controles e navegação, conteúdo opaco, tecido vetorial e reflexos locais; nenhuma simulação física ou loop global novo. | Nova instrução explícita de Tadeu em 11/10/2026: rever fonte, métricas e presença de fundo/motion antes da ficha. A parte tipográfica de DEC-008 passa a ser histórica, sem desfazer a navegação consolidada. |
| DEC-010 | NEX-015 implementa e valida continuidade/composição com fixtures; sua verificação com corpus real autorizado permanece em NEX-010. | A etapa não certifica contas reais, RLS ou rollout. Consolidar essa verificação no lote existente de autorização evita uma fila duplicada ou declarar validação fictícia como real. |
| DEC-011 | Priorizar menus, Consulta offline, Usuários e Backup e diagnóstico antes da Mesa, conforme novo pedido de Tadeu. | NEX-016 a NEX-019 delimitam navegação e utilidades. URLs e identidade visual permanecem; a revisão não conclui o restante do Painel do Mestre, autorização real ou restauração completa de infraestrutura (NEX-008/010/011). Os nomes visíveis são Consulta offline, Usuários e Backup e diagnóstico. |
| DEC-012 | Corrigir os símbolos de Mestre e Backup e priorizar o Painel do Mestre antes da Mesa, conforme pedido de Tadeu em 15/10/2026. | NEX-020 retira a sobreposição dos ícones; NEX-008 organiza visão geral, ferramentas e persistência manual. Não altera regras RPG, autorização/RLS, restauração de infraestrutura ou o motor da Mesa. A validação anterior só media o wrapper dos ícones e não provava a visibilidade do SVG real. |
| DEC-013 | Concluir o contexto de leitura do Nexus e iniciar a revisão abrangente dos controles da Mesa, conforme pedido de Tadeu. | NEX-021 fecha a passagem entre página selecionada e entidade. NEX-007 organiza controles, painel e gravação sem trocar o motor, coordenadas, serviços/RPCs ou audiência. NEX-009/010 conservam desempenho medido e validação real. |
