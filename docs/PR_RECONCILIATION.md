# Conciliação das PRs

Conferência de 11/10/2026. Estados de GitHub são um snapshot: reconferir antes de integrar.

| PR | Papel | Destino |
| --- | --- | --- |
| [#258](https://github.com/Gabriel2069/tadeon-nexus/pull/258) | Consolidação integrada | Merge `c6c1ea6` em main; produção confirmada pelo workflow 38151368993. |
| [#259](https://github.com/Gabriel2069/tadeon-nexus/pull/259) | Única proposta visual ativa — NEX-003 | Prancheta aprovada e implementação de shell/Dashboard validada na branch. Ainda não integrada nem publicada. NEX-004 é o próximo lote da fila. |
| [#216](https://github.com/Gabriel2069/tadeon-nexus/pull/216) | Patch histórico conflitante | Encerrado como proposta de integração; branch `agent/final-visual-publish-217` e commits preservados. Requisitos conciliados abaixo. |

A #216 tem HEAD `15e93ebe778ff55ecfebfaaf67b61b45469a86ac` e compara nove commits com a base `7df1734964804d2d9bdd0bdbb4114127af4b3625`. Além de símbolos, CSS e teste visual, altera quatro workflows. Integrar esse patch para recuperar um requisito visual misturaria decisões antigas de publicação, backup e qualidade com a base atual. Não fazer merge nem cherry-pick em bloco.

## Destino dos requisitos antigos

| Requisito | Conciliação | Responsável / tarefa |
| --- | --- | --- |
| Backup usar Wrench igual ao menu | Superado pela identidade autoral atual `BackupSigil`; não restaurar o Wrench automaticamente. Uma troca futura exige decisão visual. | `section-symbols.tsx`; NEX-003 |
| Separar símbolo de Backup da coluna de texto | Cabeçalho renderiza `PageSectionMark` e consome CSS consolidado. As fixtures foram verificadas; nomes longos e estados povoados ainda precisam da referência visual. | `page-hero-parity.css`; NEX-003 |
| Marca Tadeon no foco da Mesa, desktop/celular | `FocusBrandMark` é renderizado pelo shell; o bridge global antigo foi removido. Geometria/cor dos cabeçalhos têm evidência nas 21 vistas. | `app-layout.tsx`, `section-symbols.tsx`; NEX-001 |
| Símbolo da Mesa no slot do studio sem ampliar cabeçalho | O workspace renderiza o símbolo diretamente. Refinamento de ferramentas e espaço do cabeçalho permanece na tarefa da Mesa. | `tabletop-workspace.tsx`; NEX-007 |
| Três indicadores do Dashboard alinhados | Reconciliados com os dados da consulta existente: fichas disponíveis, seus personagens e maior exposição. Quatro estados × três larguras validados na PR #259; os sinais antigos foram aposentados. | `index.tsx`, `page-hero-parity.css`; NEX-003 |
| Não acrescentar motion para corrigir geometria | Mantido como regra de manutenção; motion deve ter propósito e respeitar redução de movimento. | `AGENTS.md`; NEX-009 |
| Alterações dos workflows | A base atual mantém gates e limite de produção em `main`. Backups/heartbeat precisam de prova operacional própria; não restaurar workflow antigo para resolver UI. | NEX-010 e NEX-011 |

Encerrar a proposta antiga não declara todos os requisitos visuais concluídos: preserva os que precisam de revisão na fila atual. O texto original continua no histórico da PR e seus commits não são apagados.

## Fluxo das próximas PRs

- Criar a partir de main integrado. Enquanto #259 estiver aberta, continuar seu escopo nela; um lote que altere os mesmos responsáveis deve aguardar integração ou declarar base/dependência na #259. Reconferir o diff ao atualizar a base.
- Cada PR cita IDs existentes da fila, responsáveis tocados, critérios de aceitação e evidências. Não duplicar a tarefa em outra lista.
- Trabalhos simultâneos que alteram os mesmos proprietários devem ser sequenciais ou declarar dependência explícita. Não abrir duas implementações concorrentes para a mesma tarefa.
- Antes de merge, comparar HEAD/base e resultados do CI no HEAD atual. Sucesso de commit anterior não aprova commit posterior.
- Merge em `main` pode acionar publicação pelo workflow. Aprovação de organização, documentação ou refinamento na branch não é um registro de publicação executada.
- Após merge, registrar commit integrado; após deploy, confirmar SHA publicado separadamente. Preservar a possibilidade de recuperação pelo Git.
