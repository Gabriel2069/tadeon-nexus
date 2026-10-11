# Fila de produção e decisões

> Gerado de [project-continuity.json](project-continuity.json). Edite o registro e rode `npm run sync:project`; não mantenha uma cópia manual.

Snapshot: 2026-10-11; referência de runtime: `2b367163610dfc310099ee4a94908752bc6d97be`. PR #261 em `design/nexus-navigation-type-2026-10-11`; integração: `integrated`. Não é prova de deploy.

Estados: planejado → próximo → em andamento → validado na branch → integrado. Publicação exige evidência própria do SHA; adiado conserva o requisito. Se um requisito mudar, preservar o ID e registrar a decisão/evidência.

Cada PR usa IDs desta fila e declara dependências. Trabalho sobre o mesmo proprietário deve ser sequencial; não duplicar implementação. [Conciliação das PRs](PR_RECONCILIATION.md).

| ID | Trabalho | Estado | Prioridade | Responsável | Depende de |
| --- | --- | --- | --- | --- | --- |
| NEX-001 | Preparação estrutural | Integrado | 0 | delivery | — |
| NEX-002 | Mapa, continuidade e conciliação das PRs | Integrado | 0 | delivery | NEX-001 |
| NEX-003 | Véu & Trama: referência aplicada ao shell e Dashboard | Integrado | 1 | shell | NEX-001, NEX-002 |
| NEX-004 | Sidebar, navegação móvel e portais | Integrado | 2 | popup | NEX-003 |
| NEX-013 | Liquid fabric: login, Dashboard e componentes compartilhados | Validado na branch | 2 | shell | NEX-003, NEX-004 |
| NEX-005 | Ficha por seções e estados | Planejado | 3 | sheet | NEX-003, NEX-013 |
| NEX-006 | Biblioteca, documento e grafo do Nexus | Planejado | 4 | knowledge | NEX-003, NEX-013 |
| NEX-007 | Mesa: hierarquia de ferramentas e workspace | Planejado | 5 | tabletop | NEX-004, NEX-013 |
| NEX-008 | Painel do Mestre e administração | Planejado | 6 | master | NEX-003, NEX-013 |
| NEX-009 | Desempenho e motion | Planejado | 7 | delivery | NEX-003, NEX-007 |
| NEX-010 | Validação real de autorização e rollout | Planejado | 8 | session | NEX-001 |
| NEX-011 | Backup e restauração verificável | Planejado | 8 | assets | NEX-010 |
| NEX-012 | Revisão editorial do corpus canônico | Adiado | 9 | knowledge | NEX-006 |

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

Evidências: [docs/shared-fabric-validation.json](../docs/shared-fabric-validation.json).

## NEX-005 — Ficha por seções e estados

- Extrair identidade, pontos, atributos, perícias e condições preservando estado, regras e autosave.
- Validar ficha povoada, somente leitura, salvamento, erro e transição de usuário.
- Transferir vínculos/modificadores e inventário dos bridges antes de retirar suas funções.

Evidências: pendentes; não declarar concluído.

## NEX-006 — Biblioteca, documento e grafo do Nexus

- Revisar busca/lista/documento/propriedades e prioridades no celular.
- Verificar corpus povoado, filtros e legibilidade da teia sem sobrescrever escolhas manuais.
- Preservar vínculos, importação/exportação e diferenças entre cânone e material derivado.

Evidências: pendentes; não declarar concluído.

## NEX-007 — Mesa: hierarquia de ferramentas e workspace

- Mapear cada bridge para função e destino antes de consolidar.
- Separar estado persistente, estado ao vivo e estado local; conservar coordenadas mundo/tela.
- Verificar overlays, seleção, inspector, câmera, jogador/mestre e reconexão em cenas de teste.

Evidências: pendentes; não declarar concluído.

## NEX-008 — Painel do Mestre e administração

- Revisar densidade, tabs, editor e listas com dados longos.
- Separar seções do hub por responsabilidade sem duplicar autorização.
- Estados vazio/erro/sucesso e usuário sem acesso preservados.

Evidências: pendentes; não declarar concluído.

## NEX-009 — Desempenho e motion

- Medir carregamento por rota, chunk Pixi, frames e custos de efeitos antes de otimizar.
- Movimento reduzido, cancelamento e ausência de loops redundantes verificados.
- Registrar ganhos medidos; não inferir redução de bytes da redução de arquivos.

Evidências: pendentes; não declarar concluído.

## NEX-010 — Validação real de autorização e rollout

- Em ambiente adequado, testar mestre, jogador, espectador e acesso negado entre campanhas.
- Conferir migrations aplicadas, flags e OAuth com evidência datada; não reutilizar status histórico como atual.
- Não aplicar migrations, ativar flags ou mudar provedores durante refinamento visual.

Evidências: pendentes; não declarar concluído.

## NEX-011 — Backup e restauração verificável

- Verificar dump restaurável e inventário de objetos sem expor credenciais.
- Ensaiar restauração em ambiente isolado e registrar limites de banco, Storage e R2.

Evidências: pendentes; não declarar concluído.

## NEX-012 — Revisão editorial do corpus canônico

- Revalidar as fontes e o pacote antes de tratar contagens de agosto como atuais.
- Preservar proveniência, aliases e relações ao revisar as sínteses.

Evidências: pendentes; não declarar concluído.

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
