# Fila de produção e decisões

> Gerado de [project-continuity.json](project-continuity.json). Edite o registro e rode `npm run sync:project`; não mantenha uma cópia manual.

Snapshot: 2026-10-27; referência de runtime: `b3713f2ffa0681c01c2f0e98999d4732f0217b0f`. PR #312 em `fix/nex-041-preserve-workspaces`; integração: `integrated`. Não é prova de deploy.

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
| NEX-007 | Mesa: hierarquia de ferramentas e workspace | Integrado | 6 | tabletop | NEX-004, NEX-013 |
| NEX-008 | Painel do Mestre: visão geral, ferramentas e condução | Integrado | 5 | master | NEX-003, NEX-013, NEX-020 |
| NEX-009 | Desempenho e motion | Planejado | 7 | delivery | NEX-003, NEX-007, NEX-023, NEX-024, NEX-025, NEX-026 |
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
| NEX-021 | Nexus: contexto da página e passagem para a Mesa | Integrado | 5 | knowledge | NEX-015 |
| NEX-022 | Mesa: persistência e projeção da cor-base personalizada | Integrado | 7 | tabletop | NEX-007 |
| NEX-023 | Véu & Trama: materiais e interação de todo o sistema | Integrado | 7 | shell | NEX-022, NEX-016 |
| NEX-024 | Dashboard editorial, acervo navegável e acabamento dos menus | Integrado | 7 | shell | NEX-023 |
| NEX-025 | Ficha: hierarquia, superfícies e condução visual | Integrado | 7 | sheet | NEX-024 |
| NEX-026 | Continuidade entre páginas, Nexus/Biblioteca e roda do Mais | Integrado | 7 | knowledge | NEX-024, NEX-025 |
| NEX-027 | Composição móvel, tipografia e seleção contínua de tecido | Integrado | 7 | shell | NEX-025, NEX-026 |
| NEX-028 | Tecido esculpido, instrumentos compactos e efeitos com custo limitado | Integrado | 7 | shell | NEX-027 |
| NEX-029 | Fólios compactos, material do shell e reflexão local exclusiva | Integrado | 7 | shell | NEX-028 |
| NEX-030 | Mesa circular e profundidade contida dos materiais | Integrado | 7 | tabletop | NEX-029 |
| NEX-031 | Mesa espacial: composição, conjuntos e edição 3D | Integrado | 7 | tabletop | NEX-030 |
| NEX-032 | Mesa: acabamento dos instrumentos, dobras e seleção | Integrado | 7 | tabletop | NEX-031 |
| NEX-033 | Fluidez: presença e movimento dos menus compartilhados | Integrado | 7 | popup | NEX-032 |
| NEX-034 | Ficha e celular: hierarquia, instrumentos e composição adaptável | Integrado | 7 | sheet | NEX-033 |
| NEX-035 | Atributos: instrumento vetorial leve e leitura acessível | Integrado | 7 | sheet | NEX-034 |
| NEX-036 | Ficha: registros de identidade, vínculos e instrumentos de estado | Integrado | 7 | sheet | NEX-035 |
| NEX-037 | Atributos em escala legível e Equilíbrio como relação entre polos | Integrado | 7 | sheet | NEX-036 |
| NEX-038 | Dossiê compacto, Exposição graduada e utilidades como registros | Integrado | 7 | sheet | NEX-037 |
| NEX-039 | Jogadores individuais, presença da Exposição e deslizamento lateral | Integrado | 7 | shell | NEX-038 |
| NEX-040 | TdV II v2.0: motor, fichas e condução integrados | Integrado | 7 | sheet | NEX-039 |
| NEX-041 | Restituir ferramentas da campanha e adaptar fichas existentes sem perda funcional | Integrado | 1 | sheet | NEX-040 |
| NEX-042 | Organização visual dos dossiês e instrumentos de campanha | Em andamento | 1 | sheet | NEX-041 |

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

## NEX-022 — Mesa: persistência e projeção da cor-base personalizada

- Conferir o contrato de cor-base entre editor, payload, recarga e visão protegida do jogador.
- Preservar a cor-base escolhida após salvar/reabrir sem criar divergência entre propriedades, fingerprint e renderização.
- Verificar round trip e compatibilidade das cenas antigas; conservar autorização da visão compartilhada.

Evidências: [docs/tabletop-workspace-map.md](../docs/tabletop-workspace-map.md), [docs/visual-system-validation.json](../docs/visual-system-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/277), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885297456), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885591940), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885591995).

## NEX-023 — Véu & Trama: materiais e interação de todo o sistema

- Pesquisar fontes oficiais de Apple, Linear, Raycast e Obsidian e registrar o que será traduzido para a identidade TdV.
- Aplicar profundidade, tecido, campos, botões, navegação e presença de popups nos proprietários compartilhados, retirando concorrentes.
- Verificar telas representativas em 320/390/820/1440px, foco/retorno, interação e preferências de movimento e transparência.
- Consolidar fontes, critérios, limites e integração sem criar outra fila ou camada CSS.

Evidências: [docs/DESIGN.md](../docs/DESIGN.md), [docs/design/board.html](../docs/design/board.html), [docs/visual-system-validation.json](../docs/visual-system-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/277), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885297456), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885591940), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885591995).

## NEX-024 — Dashboard editorial, acervo navegável e acabamento dos menus

- Recompor o hero e seus indicadores com relevo e leitura compacta, preservando a arte e os dados reais.
- Organizar o acervo com busca por nome, ocupação ou responsável, filtro de propriedade e ordenação sem novas consultas ou alteração de permissões.
- Refinar os fólios de personagens e a navegação, sem cortar rótulos, mover alvos ou criar camadas CSS concorrentes.
- Validar estados vazio/erro/povoado, filtros, foco, quatro larguras e movimento reduzido.

Evidências: [docs/DESIGN.md](../docs/DESIGN.md), [docs/FOUNDATION.md](../docs/FOUNDATION.md), [docs/archive-composition-validation.json](../docs/archive-composition-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/279), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38948581282), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38950723190), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38951095689), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38951095753).

## NEX-025 — Ficha: hierarquia, superfícies e condução visual

- Revisar a composição e a leitura de valores em cada seção, preservando regras, edição e autosave.
- Aprofundar a identidade de dossiê com materiais e respostas locais, sem repetir molduras ou cobrir texto.
- Verificar condições, inventário e abertura/fechamento por teclado/toque nas quatro larguras e com movimento reduzido.

Evidências: [docs/DESIGN.md](../docs/DESIGN.md), [docs/FOUNDATION.md](../docs/FOUNDATION.md), [docs/sheet-design-validation.json](../docs/sheet-design-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/281), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39303671143), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39304286379), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39304572774), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39304572872).

## NEX-026 — Continuidade entre páginas, Nexus/Biblioteca e roda do Mais

- Unificar cabeçalhos e envelope de layout do Dashboard, Ficha, Nexus, Mesa, Mestre e utilidades, com a mesma anatomia, alinhamento e hierarquia; preservar os instrumentos de cada tarefa.
- Revisar a hierarquia do acervo, árvore, abas, contexto e leitura combinada sem duplicar seus estados.
- Aprofundar a materialidade dos instrumentos e das prévias, preservando conteúdo opaco e a referência Obsidian.
- Verificar navegação, divisores, filtros e retorno de foco em quatro larguras; conservar rascunhos, conflitos e limites de autorização.
- Restaurar o Mais como roda autoral de opções, com fios e material do tom da rota; validar rótulos, alvos sem sobreposição, teclado, Escape, navegação e mudança de breakpoint sem captura global.

Evidências: [docs/nexus-continuity-validation.json](../docs/nexus-continuity-validation.json), [docs/DESIGN.md](../docs/DESIGN.md), [docs/FOUNDATION.md](../docs/FOUNDATION.md), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/283), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39344053512), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39345104014), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39345104015).

## NEX-027 — Composição móvel, tipografia e seleção contínua de tecido

- Retirar a abertura extra do Dashboard, preservando a seção artística aprovada e um único h1.
- Substituir a interface genérica por uma família humanista com personalidade, com escala legível e números editoriais adequados ao celular.
- Recompor Ficha, acervo, Mestre e utilidades para larguras compactas: campos em pares, recursos em dois instrumentos, registros menos altos e contexto narrativo acessível por dobra explícita.
- Corrigir a disputa entre rolagem manual, foco e teclado; manter posicionamento e foco dos portais.
- Usar uma placa de seleção móvel compartilhada, finita e interrompível, em abas, navegação e modos de leitura; conservar a roda do Mais.
- Ampliar tramas vetoriais e luz de contato, evitando efeitos permanentes sobre a página longa; validar desktop, tablet, celular e movimento reduzido.

Evidências: [docs/visual-system-validation.json](../docs/visual-system-validation.json), [docs/DESIGN.md](../docs/DESIGN.md), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/285), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39404389981), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39404719667), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39404719684).

## NEX-028 — Tecido esculpido, instrumentos compactos e efeitos com custo limitado

- Refinar a trama de fundo, dobras e luz dos materiais compartilhados, mantendo os símbolos e a tipografia aprovados.
- Recompor a barra compacta da Ficha sem alterar dados ou remover acesso às ações.
- Reduzir varreduras repetidas, leituras de geometria e loops decorativos; preservar estados, limpeza e movimento reduzido.
- Comparar a mesma fixture antes/depois, validar celular/desktop, foco, portais e seleção; não declarar desempenho físico a partir de emulação.

Evidências: [docs/visual-system-validation.json](../docs/visual-system-validation.json), [docs/DESIGN.md](../docs/DESIGN.md), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/287), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39443164733), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39488053106), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39488053260).

## NEX-029 — Fólios compactos, material do shell e reflexão local exclusiva

- Compactar o acervo sem truncar nomes, preservar busca/filtros/ordem/permissões e alvos de ação.
- Reforçar lombada, identificação de propriedade e hierarquia editorial nos módulos existentes.
- Limitar a reflexão à superfície material mais próxima e retirar o blur do plano opaco lateral; preservar movimento/transparência reduzidos.
- Comparar baseline e implementação em navegador, validar celular/tablet/desktop, foco e portais; não declarar desempenho físico a partir de fixtures.

Evidências: [docs/visual-system-validation.json](../docs/visual-system-validation.json), [docs/DESIGN.md](../docs/DESIGN.md), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/289), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39494025169), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39494025229), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39494974487), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39494974499).

## NEX-030 — Mesa circular e profundidade contida dos materiais

- Restabelecer o menu circular junto à entidade selecionada com um único proprietário de coordenadas e portal de viewport.
- Preservar foco, teclado, ações, controles de modelo e limites visíveis no celular; seguir câmera e rolagem por eventos, sem loop permanente de acompanhamento.
- Aprofundar relevo óptico de cards e transições de menus sem inclinar texto ou alterar o material aprovado dos botões.
- Validar ações reais do motor em fixtures, quatro larguras, foco/retorno e redução de movimento; preservar limites de hardware e contas reais.

Evidências: [docs/visual-system-validation.json](../docs/visual-system-validation.json), [docs/DESIGN.md](../docs/DESIGN.md), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/291), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39526551047), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39526550963), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39575515524), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39575515416).

## NEX-031 — Mesa espacial: composição, conjuntos e edição 3D

- Recompor a Mesa com cabeçalho operacional compacto, instrumentos junto ao mapa e editor contextual, preservando as funções existentes.
- Oferecer formações e repetição de conjuntos com intervalo, giro e elevação, respeitando limites, peças bloqueadas e desfazer atômico.
- Preservar escala, orientação, altura, animação e cor de peças reutilizáveis 3D; nunca tratar GLB como miniatura de imagem.
- Desenhar modelos estáticos e pausados por demanda; manter animações reais, acompanhar câmera e suspender a aba oculta.
- Manter editor, roda e popups operáveis na tela inteira; validar foco, toque, movimento reduzido e quatro larguras com o motor real em fixtures.
- Registrar referências oficiais Owlbear, Foundry e TaleSpire e distinguir medição local, CI, produção e hardware real.

Evidências: [docs/visual-system-validation.json](../docs/visual-system-validation.json), [docs/DESIGN.md](../docs/DESIGN.md), [scripts/verify-tabletop-workspace.mjs](../scripts/verify-tabletop-workspace.mjs), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/292), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39670991307), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39672882787).

## NEX-032 — Mesa: acabamento dos instrumentos, dobras e seleção

- Organizar câmera, enquadramento e histórico em grupos estáveis com alvos de 44 px nas quatro larguras.
- Usar o menu de câmera compartilhado com abertura/fechamento, retorno de foco e portal dentro de fullscreen.
- Dar continuidade por altura às dobras de composição, com redução de movimento, interrupção e campos fora da interação quando fechadas.
- Levar SelectionPlate às abas do editor sem duplicar preenchimento de seleção; preservar navegação por teclado e geometria local.
- Refinar luz de contato e profundidade estática no painel e na composição, preservando o material aprovado dos botões.
- Executar check, audit e matriz visual/funcional; distinguir fixtures, integração e produção.

Evidências: [docs/tabletop-finishing-validation.json](../docs/tabletop-finishing-validation.json), [scripts/verify-tabletop-workspace.mjs](../scripts/verify-tabletop-workspace.mjs), [docs/DESIGN.md](../docs/DESIGN.md), [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [.github/workflows/visual-review.yml](../.github/workflows/visual-review.yml), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/294), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39877504251), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/39879914021).

## NEX-033 — Fluidez: presença e movimento dos menus compartilhados

- Suspender medições e assinaturas de geometria quando o conteúdo do pop-up está ausente; limpar frames e observers ao sair.
- Coalescer resize/viewport em um frame e ignorar rolagem interna que não muda a moldura.
- Conservar um responsável pelo movimento de menus e fundos, com alvos estáveis e saída sem captura de cliques.
- Preservar foco, portais em tela inteira, botões aprovados e menus circulares; testar reabertura rápida e movimento reduzido.
- Comparar trabalho de layout em condições equivalentes e publicar somente após check, audit e gates; não inferir FPS/INP físicos.
- Preservar valor, rótulo e coleção oculta do Select com redução de movimento, inclusive após fechar e trocar a preferência.

Evidências: [docs/shared-motion-validation.json](../docs/shared-motion-validation.json), [scripts/verify-shared-motion.mjs](../scripts/verify-shared-motion.mjs), [docs/DESIGN.md](../docs/DESIGN.md), [src/components/ui/select-presence.test.tsx](../src/components/ui/select-presence.test.tsx), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/296), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40055704967), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40056793969).

## NEX-034 — Ficha e celular: hierarquia, instrumentos e composição adaptável

- Retirar o cabeçalho grande fixo da Ficha e reduzir seu volume sem perder ações e estado de gravação.
- Reorganizar Identidade e vínculos, Atributos, Equilíbrio e Exposição com títulos íntegros, leitura clara e alvos estáveis.
- Conferir Ficha, Maestria, História e demais áreas em 320/390/820/1440; usar colunas somente quando conteúdo e controles couberem.
- Preservar cálculos, dados, permissões, autosave, botões aprovados, portais e rodas circulares.
- Validar comparação renderizada, fluxos editáveis/somente leitura, foco, movimento reduzido, check e audit; publicar após gates.

Evidências: [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [docs/adaptive-layout-validation.json](../docs/adaptive-layout-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/298), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40060516314), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40062046584).

## NEX-035 — Atributos: instrumento vetorial leve e leitura acessível

- Substituir a infraestrutura de gráfico do radar por SVG local, preservando valores, cores e escala mínima de 0 a 5.
- Conservar valores excepcionais dentro da escala visível e fornecer descrição acessível dos atributos.
- Evitar atualizar dados do radar quando apenas outros campos mudam; aplicar à Ficha e Forma de Poder.
- Comparar bytes de build e estrutura renderizada com o mesmo cenário, sem inferir FPS/INP físicos.
- Conferir quatro larguras, edição, leitura, portais e movimento reduzido; publicar após check, audit e gates.

Evidências: [src/components/sheet/attribute-radar.tsx](../src/components/sheet/attribute-radar.tsx), [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [src/components/sheet/attribute-radar.test.tsx](../src/components/sheet/attribute-radar.test.tsx), [docs/attribute-instrument-validation.json](../docs/attribute-instrument-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/300), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40083897202), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40085253889).

## NEX-036 — Ficha: registros de identidade, vínculos e instrumentos de estado

- Dar acesso independente aos vínculos, com rótulos persistentes e leitura integral no celular.
- Organizar identidade em registros complementares, sem esticar cartões curtos.
- Separar leitura, ajuste e efeitos de Equilíbrio; mostrar contexto derivado de Exposição sem alterar regras.
- Conferir 320/390/820/1440, vínculos longos/múltiplos, edição/leitura, abas, foco, portais e movimento reduzido.
- Executar check e audit, inspecionar capturas e publicar somente após gates.

Evidências: [src/components/sheet/sheet-identity-section.tsx](../src/components/sheet/sheet-identity-section.tsx), [src/styles/sheet-premium.css](../src/styles/sheet-premium.css), [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [docs/sheet-register-validation.json](../docs/sheet-register-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/302), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40148827926), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40150710642).

## NEX-037 — Atributos em escala legível e Equilíbrio como relação entre polos

- Aumentar a área real do radar e dos rótulos na Ficha e Forma de Poder, preservando SVG leve e escala dos valores.
- Representar Equilíbrio como eixo Medo–Inteireza–Conhecimento, com tensão direcional e efeitos coerentes com os dados existentes.
- Conservar limites de cargo, deslocamento em ±4, autosave e fonte única das regras.
- Verificar tamanho físico do gráfico, quatro larguras, leitura/edição, limiares de tensão, foco e movimento reduzido; publicar após gates.

Evidências: [src/components/sheet/sheet-equilibrium-section.tsx](../src/components/sheet/sheet-equilibrium-section.tsx), [src/components/sheet/sheet-equilibrium-section.test.tsx](../src/components/sheet/sheet-equilibrium-section.test.tsx), [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [docs/equilibrium-axis-validation.json](../docs/equilibrium-axis-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/304), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40216726243), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40218832040).

## NEX-038 — Dossiê compacto, Exposição graduada e utilidades como registros

- Recompor dimensões dos painéis da Ficha: radar ampliado preservado, instrumentos horizontais onde couberem e par Equilíbrio/Exposição alinhado sem altura fixa.
- Dar a Exposição escala própria, bases reais e controles estáveis; refinar condições, perícias, Maestria e História com tipografia e organização adequadas.
- Organizar Offline, Backup e Usuários por tarefa, com disponibilidade real, registro contínuo de pessoas, histórico e importação distintos; preservar contratos e confirmações.
- Incorporar o dossiê Véu & Trama como referência do sistema, retirar escritores concorrentes e verificar quatro larguras, foco/portais/redução de movimento, check e audit antes da publicação.

Evidências: [docs/VEU_E_TRAMA.md](../docs/VEU_E_TRAMA.md), [docs/dossier-density-validation.json](../docs/dossier-density-validation.json), [src/components/sheet/sheet-exposure-section.tsx](../src/components/sheet/sheet-exposure-section.tsx), [src/components/sheet/sheet-exposure-section.test.tsx](../src/components/sheet/sheet-exposure-section.test.tsx), [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [scripts/verify-navigation-utilities.mjs](../scripts/verify-navigation-utilities.mjs), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/306), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40251173586), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40251173547), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40293915897), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40293915696).

## NEX-039 — Jogadores individuais, presença da Exposição e deslizamento lateral

- Restaurar cartões individuais de jogadores com dimensões adaptáveis, papéis legíveis e confirmações preservadas.
- Dar cor, relevo e preenchimento proporcional à Exposição, mantendo bases, controles e regras existentes.
- Reconciliar abertura/recolhimento lateral, rótulos persistentes, interrupção e movimento reduzido; preservar botões aprovados e rodas.
- Validar quatro larguras, teclado/foco/portais, check e auditoria; distinguir fixtures, integração e publicação.

Evidências: [docs/navigation-presence-validation.json](../docs/navigation-presence-validation.json), [scripts/verify-navigation-utilities.mjs](../scripts/verify-navigation-utilities.mjs), [scripts/verify-sheet-design.mjs](../scripts/verify-sheet-design.mjs), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/308), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40432582240), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40432582165), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40476036876), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40476036880).

## NEX-040 — TdV II v2.0: motor, fichas e condução integrados

- Aplicar o Livro de Regras fornecido: Feição, Matrizes/Alinhavos, dois Fios, PV/PI/PE, Defesas/Guarda, Marcos/PU, Equilíbrio/Tensão e procedimentos de continuidade.
- Preservar dados da edição anterior e oferecer conversão revisável, sem equivalência numérica inventada nem alterações em massa de personagens.
- Atualizar a condução do Mestre para objetivos, Posição, Pressão 0–4, 2 Impulsos/1 Resposta, prioridade contestada, Ameaças 0–4, Investigação e Selagem.
- Oferecer fluxos de Auxílio, Resto/Redobra, consequências físicas, operações prolongadas, Lavor/Costura, Tramas, sustentação e Refluxo, com custos e saídas explícitos e sem automatismos contrários ao livro.
- Propagar a edição correta à Mesa autorizada, histórico, acervo/offline e Nexus; preservar segredos, permissões e conteúdo personalizado.
- Validar regras, banco/guardas e fluxos editáveis/somente leitura em quatro larguras; registrar migração, Edge Function, CI, integração e produção separadamente.

Evidências: [docs/rules/tdv-ii-v2.md](../docs/rules/tdv-ii-v2.md), [docs/tdv-ii-migration.md](../docs/tdv-ii-migration.md), [docs/tdv-ii-validation.json](../docs/tdv-ii-validation.json), [src/lib/tdv2.ts](../src/lib/tdv2.ts), [src/lib/tdv2.test.ts](../src/lib/tdv2.test.ts), [supabase/migrations/20261027093709_tdv_ii_versioned_rules.sql](../supabase/migrations/20261027093709_tdv_ii_versioned_rules.sql), [scripts/verify-tdv2.mjs](../scripts/verify-tdv2.mjs), [scripts/verify-tdv2-postgres.mjs](../scripts/verify-tdv2-postgres.mjs), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/310), [src/lib/mcp/tools/list-my-sheets.test.ts](../src/lib/mcp/tools/list-my-sheets.test.ts), [src/lib/nexus-backup.test.ts](../src/lib/nexus-backup.test.ts), [docs/tdv-ii-coverage.md](../docs/tdv-ii-coverage.md), [src/lib/tdv2-play.ts](../src/lib/tdv2-play.ts), [src/lib/tdv2-play.test.ts](../src/lib/tdv2-play.test.ts), [src/lib/tdv2-operations.ts](../src/lib/tdv2-operations.ts), [src/lib/tdv2-round.ts](../src/lib/tdv2-round.ts), [supabase/migrations/20261027191353_tdv_ii_operational_play.sql](../supabase/migrations/20261027191353_tdv_ii_operational_play.sql), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40574957707), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40574957603), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40577120744), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40577120805).

## NEX-041 — Restituir ferramentas da campanha e adaptar fichas existentes sem perda funcional

- Restaurar a navegação completa do Mestre e da Mesa como entrada principal, com novas regras dentro das ferramentas existentes.
- Abrir fichas anteriores na estrutura TdV II com revisão dos valores sem equivalências inventadas; preservar registros, detalhes, narrativa, inventário e organização.
- Validar edição, leitura, CAS, navegação, foco e quatro larguras antes de publicar.

Evidências: [src/components/master/master-panel-navigation.tsx](../src/components/master/master-panel-navigation.tsx), [src/lib/tdv2-conversion.ts](../src/lib/tdv2-conversion.ts), [scripts/verify-tdv2.mjs](../scripts/verify-tdv2.mjs), [src/lib/master-sheet-reading.test.ts](../src/lib/master-sheet-reading.test.ts), [src/components/sheet/tdv2-retained-tools.tsx](../src/components/sheet/tdv2-retained-tools.tsx), [docs/tdv-ii-validation.json](../docs/tdv-ii-validation.json), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/pull/312), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40597779150), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40597779387), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40599233213), [CI/referência](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/40599233315).

## NEX-042 — Organização visual dos dossiês e instrumentos de campanha

- Reorganizar Feição, detalhes pessoais e Âncora com hierarquia clara, preservando todos os campos e ações.
- Agrupar radar e Matrizes; alinhar resumos atuais e recompor a fila manual para nomes legíveis no celular.
- Preservar identidade, regras, salvamento e acessibilidade; comparar quatro larguras e publicar após os gates.
- Corrigir a densidade em todas as guias: campos e Alinhavos em colunas úteis no celular, abertura compacta e narrativa sem caixas excessivas, mantendo texto legível e acesso completo.

Evidências: [src/components/sheet/tdv2-sheet.tsx](../src/components/sheet/tdv2-sheet.tsx), [src/styles/sheet-premium.css](../src/styles/sheet-premium.css), [src/styles/workspace.css](../src/styles/workspace.css), [scripts/verify-tdv2.mjs](../scripts/verify-tdv2.mjs).

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
| DEC-014 | Aprofundar Véu & Trama como sistema de materiais e interações após a Mesa, com pesquisa primária sobretudo Apple; preservar identidade, símbolos e tipografia aprovados. | Pedido de Tadeu em 16/10/2026: elevar organização, cards, motion, transições, botões, hover, profundidade e fundos em todo o sistema. NEX-023 concentra a evolução compartilhada; NEX-009/010 conservam performance física e autorização real. |
| DEC-015 | Tadeu considera que o sistema ainda precisa de maior elaboração após NEX-023. Priorizar composição do Dashboard, organização do acervo e acabamento da navegação em NEX-024; NEX-009 mantém a medição em hardware físico. | Pedido de Tadeu em 16/10/2026 após a publicação da PR #277: ainda há muito a melhorar. A composição e a descoberta do acervo precedem a medição em dispositivos físicos. NEX-025/026 preservam a continuidade visual por tela; NEX-009 deve medir a base resultante de NEX-024. |
| DEC-016 | Um contrato de layout e cabeçalho para as páginas principais; mudar a área altera símbolo, tom e contexto, sem inventar outro padrão de head. | Pedido de Tadeu em 19/10/2026 ao iniciar NEX-026. PageHeader compartilha identidade, ações e contexto; o envelope comum respeita a mesma margem. Conteúdo e instrumentos conservam suas funções e densidades. |
| DEC-017 | Restaurar a roda de opções do Mais no dock inferior; personalidade e continuidade devem coexistir entre páginas. | Pedido explícito de Tadeu ao fechar NEX-026, em 19/10/2026. Substitui a apresentação em lista de NEX-016, preservando o componente React/Radix, os destinos estáveis e a dispensa acessível. Cabeçalhos, margens, materiais e movimentos compartilham regras; símbolos e instrumentos mantêm sua autoria. |
| DEC-018 | Recompor o celular por função; retirar o cabeçalho adicional do Dashboard e adotar Alegreya Sans na interface, mantendo Cormorant Garamond editorial e PT Mono documental. | Pedido explícito de Tadeu em 19/10/2026: reduzir cards e rolagem, evitar aparência Arial/ABNT, seleção viajante e atmosfera de tecido. Dashboard é uma exceção deliberada à aplicação universal de PageHeader em DEC-016; a arte aprovada continua sendo sua abertura. Os nomes --font-inter e --font-cinzel são aliases compatíveis, não fontes adicionais. |
| DEC-019 | A Mesa usa PageHeader em faixa operacional compacta e uma barra de visão junto ao tabuleiro. | Pedido explícito de aprimoramento da Mesa: reduzir a abertura, dar espaço ao mapa e tornar câmera, encaixe e composição acessíveis. A anatomia e as fontes continuam compartilhadas; a geometria do cabeçalho permanece em page-hero-parity.css. |
| DEC-020 | O cabeçalho grande da Ficha rola com o dossiê em todas as larguras; instrumentos usam hierarquia adaptável pela largura do cartão. | Pedido explícito de Tadeu para retirar o topo fixo exagerado, melhorar celulares e reorganizar Identidade/vínculos, Atributos, Equilíbrio e Exposição. PageHeader preserva anatomia compartilhada; controles e regras permanecem estáveis. |
| DEC-021 | A estrutura TdV II segue os procedimentos do livro: Pessoa, Constituição, Ação, Expressão e Percurso, com ferramentas operacionais próprias na condução. | Pedido explícito de Tadeu em 27/10/2026 autoriza mudar a estrutura antiga para comportar o novo sistema. Identidade Véu & Trama, rodas, fontes e cabeçalho não fixo são preservados; cálculos comuns têm uma autoridade e decisões ficcionais exigem declaração. |
| DEC-022 | A adaptação de regras preserva as ferramentas da campanha e apresenta fichas existentes na estrutura atual por padrão. | Correção explícita de Tadeu: mudar mecânicas não autoriza retirar funções. Dados anteriores permanecem preservados; revisão de competências não inventa equivalências de atributos, dano ou PM/PU. |
