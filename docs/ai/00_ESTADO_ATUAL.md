# Estado de continuidade do Tadeon Nexus

Verificado em 14/10/2026. Entrada curta de retomada; o registro único de tarefas e responsáveis é [project-continuity.json](../project-continuity.json).

## Referências estruturais históricas

- PR [#258](https://github.com/Gabriel2069/tadeon-nexus/pull/258), branch `refactor/nexus-foundation-2026-10-11`: preparação estrutural integrada a `main` em `c6c1ea6c5e3338b4ff111329a8b2b37841e8245d`, após Quality aprovado no HEAD `20ba787`.
- Referência de runtime: `2a458d97531e1d5dc314bdc42df3eadb7b26ef67`. Base da integração: `353808af68c8ba0d08bbc90d6f8ad9117c9e25f8`; merge em `main`: `c6c1ea6`.
- 57 módulos CSS, 12 links globais, proprietários de viewport/grafo/condições unificados. Evidências em [FOUNDATION](../FOUNDATION.md) e [validação](../foundation-completion-validation.json).
- O código dessa referência passou por 119 suítes/515 testes, builds, auditorias sem vulnerabilidades e 21 telas de fixture. A verificação não representa campanhas reais ou autorização ponta a ponta.
- A PR antiga #216 é conciliada em [PR_RECONCILIATION](../PR_RECONCILIATION.md); seu patch não é uma base de trabalho.

## Direção visual integrada

Tadeu aprovou Véu & Trama e autorizou sua implementação. NEX-003 foi integrado pela PR [#259](https://github.com/Gabriel2069/tadeon-nexus/pull/259): hero autoral, galeria, dados existentes e estados vazio/loading/erro/povoado. Leituras antigas não alteram o estado nem o cache de outra conta. A limpeza retirou os concorrentes das classes Dashboard aposentadas e dos marcadores externos da navegação; a superfície ativa voltou a usar seu token escuro, separado da cor de destaque.

[DESIGN](../DESIGN.md) orienta a expansão. #259 e #260 estão integradas; a produção confirmou HTTP 200 e SHA `662180278fc7b3d872fae2a8b05267d9800db9c6` no [workflow 38157372540](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38157372540). A falha inicial é histórica. NEX-004 foi integrado pela [PR #261](https://github.com/Gabriel2069/tadeon-nexus/pull/261), merge `2b36716`, após Quality 38162310175: Tadeu pediu uma fonte mais sofisticada e medieval; Grenze substitui EB Garamond no token editorial, preservando Inter e PT Mono. O menu Mais passa do bridge com captura global para `MobileMoreMenu`, renderizado pelo shell com primitivo Radix. Os símbolos pertencem ao render; o anel conserva destinos e deixa de girar continuamente. Sheet respeita retorno de foco e transferência para conta/instalação; a conta retorna ao controle permanente após fechar o drawer.

A [evidência de NEX-004](../navigation-design-validation.json) registra as 37 vistas, seis casos de portais e dois teclados simulados aprovados. O foco de rota acompanha o main efetivamente montado, sem rAF ou observer. Evidências anteriores de NEX-003 conservam seus limites. A integração de NEX-004 consta na fila canônica; produção confirmada no [workflow 38162497262](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38162497262): HTTP 200 e SHA exato `2b36716`. NEX-005 ainda não estava implementado nessa referência histórica. A revisão posterior NEX-013 está integrada pela [PR #263](https://github.com/Gabriel2069/tadeon-nexus/pull/263), merge `41c2c88`: Cormorant Garamond editorial, Inter nas métricas e liquid fabric no login, Dashboard e componentes compartilhados. [Evidência própria](../shared-fabric-validation.json): 123 suítes/546 testes, 49 vistas, seis portais e dois teclados simulados. Produção confirmou HTTP 200 e SHA exato no [workflow 38166156073](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38166156073), às 19:01:29Z de 11/10/2026. NEX-005 foi integrado conforme o checkpoint abaixo; continuar pela fila canônica a partir do main atual.

NEX-005 integrado pela [PR #265](https://github.com/Gabriel2069/tadeon-nexus/pull/265), merge `1d92120`: cinco seções controladas, materiais coesos, controles explícitos, leitura cancelável e autosave protegido ao desmontar. [Evidência](../sheet-design-validation.json): 126 suítes/557 testes e 16 casos de fixture em quatro larguras. Produção confirmou HTTP 200 e SHA exato no [workflow](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38182952991). 5.409 `!important`, sem novos módulos/observers. NEX-006 (O Nexus) é o próximo lote pronto; preservar limites de contas reais, RLS, VoiceOver e GPU.

## Como retomar

1. Conferir `git status`, branch, HEAD e estado remoto da PR; preservar mudanças de terceiros.
2. Ler o [índice](../README.md), [mapa](../PROJECT_MAP.md) e [fila](../WORKPLAN.md).
3. Selecionar o ID da tarefa e seu proprietário; conferir dependências e último checkpoint antes de editar.
4. Atualizar somente o registro JSON, regenerar mapas com `npm run sync:project` e verificar `npm run check:project`.
5. Ao encerrar, anexar evidência e declarar se foi validado na branch, integrado ou publicado. Confirmar HEAD e CI remoto em vez de reutilizar um sucesso antigo.

## Limites preservados

Fio-Mestre é a identidade deste projeto; NexOS é separado. A referência estrutural tem confirmação de publicação histórica. A integração visual e a correção de entrega têm Quality e publicação confirmados na referência indicada. NEX-004 é um lote posterior, com estado próprio. O workflow de main é a autoridade atual de publicação, sem equivaler a teste com contas reais. Banco, flags, rollout, OAuth, backup restaurável e contas reais não foram reconsultados nesta etapa. Não transformar claims do histórico em fatos atuais. Não há promessa de ausência absoluta de conflitos futuros.

O registro anterior permanece em [history/continuity-2026-08.md](../history/continuity-2026-08.md), sem perda de texto. As prioridades históricas foram substituídas por IDs da fila atual; requisitos pertinentes continuam registrados.

## NEX-014 / NEX-006 integrados em 14/10/2026

A [PR #267](https://github.com/Gabriel2069/tadeon-nexus/pull/267) integrou a revisão de movimento, materiais e leitura, merge `d638567`. Abas têm uma placa ativa única; diálogos conservam a centralização durante a animação; botões seguem os tons locais da ficha. Dashboard recebeu indicadores com relevo e fios que desaparecem gradualmente. Biblioteca compartilha os filamentos, usa colunas pela largura disponível e abre a prévia móvel somente por seleção explícita.

O Nexus recebeu árvore de parentesco real, teclado, abas de páginas e modos documento/grafo/combinado. Grafo com nós pequenos, linhas finas e grupos opcionais; um clique abre, arraste e cancelamento não abrem. Altura definida do canvas evita realimentação de resize; respostas atrasadas de páginas/buscas são invalidadas. Contratos de serviços, migrations, flags, autorização e cálculos RPG foram preservados.

[Evidência](../material-reading-validation.json): 128 suítes/561 testes, audit zero, 16 casos da ficha e Dashboard; repetição final do Dashboard e Nexus/biblioteca em 320/390/820/1440px, corpus fictício de 120 páginas, foco e movimento reduzido. [Quality do HEAD](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554284521), [Quality de main](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554552056) e [publicação](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38554551969) aprovados. O endpoint confirmou HTTP 200 e SHA exato `d638567c511f547fd76be2899790ab6f8a01ea85` às 11:11:25Z. O primeiro retorno antigo foi superado pelo segundo; não declarar publicação a partir de um HTTP 200 sem conferir o marcador.

A fila canônica registra NEX-015 para continuidade de abas e painéis e conserva os demais lotes. Esta entrega aproxima a leitura da referência Obsidian; vault, plugins e acoplamento arbitrário de painéis não foram implementados. A validação continua restrita às fixtures e ao marcador público; contas reais, RLS e dispositivos físicos não foram certificados.

## Continuidade de leitura — NEX-015

NEX-015 integrado pela [PR #269](https://github.com/Gabriel2069/tadeon-nexus/pull/269), merge `778d444`, sobre main `3173d27`. Abas conservam sua ordem; fechar a última mostra a entrada do acervo e permite reabertura explícita. Editor permanece montado entre modos. Painéis ajustam a orientação à largura disponível, com proporções independentes, teclado/arraste e preferências por usuário/workspace/campanha. Rascunhos são identificados por usuário/workspace/página; texto digitado durante uma gravação continua na fila. Respostas antigas não trocam a página ou o editor de outra conta. Conflitos têm revisão explícita; o RPC conserva a versão esperada.

[Evidência](../nexus-continuity-validation.json): `npm run check` aprovado, 131 suítes/575 testes, audit zero; fixtures de 500 páginas e documento longo em 320/390/820/1440px, sem overflow ou erros. Navegação, divisor, persistência, filtros/grupos e portal/foco verificados. Serviços, migrations, flags e identidade visual preservados; 57 módulos CSS e 12 links, sem crescimento dos tetos. A validação do corpus real autorizado pertence a NEX-010 por DEC-010, com o requisito original preservado. [Quality do HEAD](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38669420714), [Quality de main](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38669674673) e [publicação](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38669674635) aprovados. O endpoint confirmou HTTP 200 e SHA exato `778d4449b01adc9ae5eab498d27606d2d7c3b35f` em 2026-10-15T02:13:38.7334855Z. Próximo lote conforme fila canônica: NEX-007. Este registro preserva a entrega da implementação; a consolidação documental tem sua própria PR e prova pública.
