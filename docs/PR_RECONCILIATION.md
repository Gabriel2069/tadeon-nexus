# Conciliação das PRs

Conferência de 14/10/2026. Estados de GitHub são um snapshot: reconferir antes de integrar.

| PR | Papel | Destino |
| --- | --- | --- |
| [#258](https://github.com/Gabriel2069/tadeon-nexus/pull/258) | Consolidação integrada | Merge `c6c1ea6` em main; produção confirmada pelo workflow 38151368993. |
| [#259](https://github.com/Gabriel2069/tadeon-nexus/pull/259) | Primeiro lote visual integrado — NEX-003 | Prancheta aprovada, revisão aprofundada e merge `ca49ce0`. Correção #260 integrada; publicação confirmada no workflow 38157372540, SHA 6621802. Falha inicial preservada como histórico. |
| [#261](https://github.com/Gabriel2069/tadeon-nexus/pull/261) | NEX-004 integrado — Grenze, navegação e portais | Merge `2b36716`, Quality 38162310175 aprovado. Produção confirmada no [workflow 38162497262](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38162497262): HTTP 200 e SHA exato `2b36716`. |
| [#262](https://github.com/Gabriel2069/tadeon-nexus/pull/262) | Consolidação documental de NEX-004 | Histórico e prova de entrega organizados; base posterior `4736913`. |
| [#263](https://github.com/Gabriel2069/tadeon-nexus/pull/263) | NEX-013 integrado — Cormorant, métricas e liquid fabric comum | Merge `41c2c88`, Quality 38166007425 aprovado no HEAD `eba345b`; produção HTTP 200/SHA exato em [38166156073](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38166156073). |
| [#264](https://github.com/Gabriel2069/tadeon-nexus/pull/264) | Registro de entrega de NEX-013 | Tipografia e liquid fabric consolidados; decisões em DEC-009 e evidências próprias. |
| [#265](https://github.com/Gabriel2069/tadeon-nexus/pull/265) / [#266](https://github.com/Gabriel2069/tadeon-nexus/pull/266) | NEX-005 e registro de publicação | Ficha por seções integrada em `1d92120`; continuidade consolidada em main. |
| [#267](https://github.com/Gabriel2069/tadeon-nexus/pull/267) / [#268](https://github.com/Gabriel2069/tadeon-nexus/pull/268) | NEX-014/NEX-006 e registro de publicação | Movimento, Dashboard, biblioteca e leitura integrados em `d638567`; consolidação `3173d27`, base de NEX-015. |
| [#269](https://github.com/Gabriel2069/tadeon-nexus/pull/269) | NEX-015 integrado — continuidade e composição | Merge `778d444`; Quality HEAD/main e [produção](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38669674635) aprovados, HTTP 200/SHA exato. Corpus real autorizado conciliado em NEX-010/DEC-010. |
| [#216](https://github.com/Gabriel2069/tadeon-nexus/pull/216) | Patch histórico conflitante | Encerrado como proposta de integração; branch `agent/final-visual-publish-217` e commits preservados. Requisitos conciliados abaixo. |

A #216 tem HEAD `15e93ebe778ff55ecfebfaaf67b61b45469a86ac` e compara nove commits com a base `7df1734964804d2d9bdd0bdbb4114127af4b3625`. Além de símbolos, CSS e teste visual, altera quatro workflows. Integrar esse patch para recuperar um requisito visual misturaria decisões antigas de publicação, backup e qualidade com a base atual. Não fazer merge nem cherry-pick em bloco.

## Destino dos requisitos antigos

| Requisito | Conciliação | Responsável / tarefa |
| --- | --- | --- |
| Backup usar Wrench igual ao menu | Superado pela identidade autoral atual `BackupSigil`; não restaurar o Wrench automaticamente. Uma troca futura exige decisão visual. | `section-symbols.tsx`; NEX-003 |
| Separar símbolo de Backup da coluna de texto | Cabeçalho renderiza `PageSectionMark` e consome CSS consolidado. As fixtures foram verificadas; nomes longos e estados povoados ainda precisam da referência visual. | `page-hero-parity.css`; NEX-003 |
| Marca Tadeon no foco da Mesa, desktop/celular | `FocusBrandMark` é renderizado pelo shell; o bridge global antigo foi removido. Geometria/cor dos cabeçalhos têm evidência nas 21 vistas. | `app-layout.tsx`, `section-symbols.tsx`; NEX-001 |
| Símbolo da Mesa no slot do studio sem ampliar cabeçalho | O workspace renderiza o símbolo diretamente. Refinamento de ferramentas e espaço do cabeçalho permanece na tarefa da Mesa. | `tabletop-workspace.tsx`; NEX-007 |
| Três indicadores do Dashboard alinhados | Reconciliados com os dados da consulta existente: fichas disponíveis, seus personagens e maior exposição. Quatro estados × quatro larguras validados na revisão da PR #259; os sinais antigos foram aposentados. | `index.tsx`, `page-hero-parity.css`; NEX-003 |
| Não acrescentar motion para corrigir geometria | Mantido como regra de manutenção; motion deve ter propósito e respeitar redução de movimento. | `AGENTS.md`; NEX-009 |
| Alterações dos workflows | A base atual mantém gates e limite de produção em `main`. Backups/heartbeat precisam de prova operacional própria; não restaurar workflow antigo para resolver UI. | NEX-010 e NEX-011 |

Encerrar a proposta antiga não declara todos os requisitos visuais concluídos: preserva os que precisam de revisão na fila atual. O texto original continua no histórico da PR e seus commits não são apagados.

## Fluxo das próximas PRs

- Criar a partir de main integrado e selecionar o próximo ID em [WORKPLAN.md](WORKPLAN.md), gerado da fila canônica. Este arquivo registra o destino das PRs; não mantém uma segunda lista de prioridades. Reconferir diff, dependências e responsáveis antes de expandir. Não reutilizar branches integradas para reabrir requisitos antigos.
- Cada PR cita IDs existentes da fila, responsáveis tocados, critérios de aceitação e evidências. Não duplicar a tarefa em outra lista.
- Trabalhos simultâneos que alteram os mesmos proprietários devem ser sequenciais ou declarar dependência explícita. Não abrir duas implementações concorrentes para a mesma tarefa.
- Antes de merge, comparar HEAD/base e resultados do CI no HEAD atual. Sucesso de commit anterior não aprova commit posterior.
- Merge em `main` pode acionar publicação pelo workflow. Aprovação de organização, documentação ou refinamento na branch não é um registro de publicação executada.
- Após merge, registrar commit integrado; após deploy, confirmar SHA publicado separadamente. Preservar a possibilidade de recuperação pelo Git.


## Reorganização dos menus e utilidades — PR #271

NEX-016 a NEX-019 substituem o menu Mais circular por lista Radix e padronizam Consulta offline, Usuários e Backup e diagnóstico, conforme DEC-011. O shell usa os símbolos autorais de `SectionSymbol`, inclusive Mestre e Backup. A nova revisão não restaura máscaras nem movimentos de navegação de PRs antigas; os testes históricos pertinentes foram conciliados com os alvos estáveis e os símbolos atuais. A evidência e o estado de entrega pertencem a [navigation-utilities-validation.json](navigation-utilities-validation.json) e à fila canônica; NEX-008/010/011 conservam o escopo ainda não certificado.


## Símbolos e Painel do Mestre (NEX-020/008)

DEC-012 prioriza a correção de Mestre/Backup e o painel, a partir de main `6e1087c`. A verificação de #271 provava apenas o wrapper dos ícones; seletores antigos ainda escondiam o SVG real. O lote atual remove as máscaras da sidebar e do dock, sem restaurar patches históricos. A verificação passa a medir SVG, pseudo-elemento, dimensões e estado nos próprios destinos.

Navegação interna, visão geral e rascunho possuem responsáveis explícitos na fila canônica. Os testes textuais que exigiam máscaras/ocultação foram conciliados com a nova guarda arquitetural e as interações em navegador. Controles da Mesa, autorização real e restauração completa conservam seus IDs e limites. A [PR #273](https://github.com/Gabriel2069/tadeon-nexus/pull/273) integrou a fonte `c22015b` em `6f954c4`, após Quality. [Produção](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38722287420) confirmou HTTP 200 e SHA exato; prova completa na [evidência](master-workspace-validation.json). A consolidação documental conserva sua própria confirmação de entrega na PR correspondente, sem reescrever o checkpoint da implementação.

## NEX-007 / NEX-021 — PR #275

[PR #275](https://github.com/Gabriel2069/tadeon-nexus/pull/275), base main `66acb8e`, fonte `5893bd7`: organização da Mesa, consistência de salvamento/câmera e contexto de leitura do Nexus. Validada na branch por check completo, 141 suítes/581 testes, audit zero e matriz de navegador documentada. Integrada em `269e408`, após [Quality do HEAD](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38840950329) aprovado. Quality de main e [produção](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38841186367) aprovados; HTTP 200/SHA exato em 2026-10-16T02:37:13.8743476Z. A consolidação documental registra sua própria verificação no corpo da PR. NEX-022 registra a cor-base personalizada; NEX-009/010 preservam performance/autorização reais.


## NEX-022 / NEX-023 — PR #277

[PR #277](https://github.com/Gabriel2069/tadeon-nexus/pull/277), base main `f726d0b`, fonte `4f48507`: cor-base persistente da Mesa e evolução de materiais/interações do sistema. A pesquisa primária e a tradução para TdV ficam em DESIGN.md; a prancheta isolada conserva seus limites. Card, campos, controles e presença têm proprietários explícitos; as regras genéricas concorrentes deixam de escrever nas superfícies controladas.

[Quality da fonte](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38883830326) aprovado. A validação de fixtures, a revisão de asserts históricos e a procedência por fonte pertencem a [visual-system-validation.json](visual-system-validation.json). Integrada em `40ed153` após [Quality do HEAD](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885297456) aprovado. [Quality de main](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885591940) e [publicação](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38885591995) aprovados; HTTP 200/SHA exato em 2026-10-16T10:14:17.2990084Z. `tabletop-view` v12 ACTIVE mantém JWT e os dois arquivos do main; requisição anônima retornou 401. Isso não certifica autorização entre contas reais. A consolidação documental tem sua própria confirmação no corpo da PR. A fila canônica preserva NEX-009/010/011 e seus limites.


## NEX-024 — PR #279

[PR #279](https://github.com/Gabriel2069/tadeon-nexus/pull/279), base main `0a75866`, fonte `7ce823b`: composição editorial do Dashboard, busca/filtro/ordenação sobre o acervo já autorizado e consolidação da geometria dos menus. Os quatro casos textuais que exigiam geometrias antigas e os dois asserts de localização CSS foram conciliados na [evidência](archive-composition-validation.json). Os requisitos de rótulo legível, ícone visível, alinhamento e alvos são medidos pelo navegador; os demais requisitos históricos foram preservados. O gate recusa novos escritores de geometria fora de navigation-layout.css.

[Quality da fonte](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38948581282) aprovado. Validação local aprovada: 142 suítes/587 testes, audit zero, 16 estados do Dashboard e 28 combinações das áreas compartilhadas. Integrada em `e5ba2df` após [Quality do HEAD](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38950723190) aprovado. [Quality de main](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38951095689) e [publicação](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38951095753) aprovados; HTTP 200 e SHA exato em 2026-10-16T18:58:24.8406512Z. A consolidação documental registra sua própria confirmação no corpo da PR correspondente. Regras, backend, schema e flags não foram alterados.
