# Revisão de design engineering — agosto de 2026

Esta revisão percorre as 12 rotas visuais, o shell autenticado e as superfícies compartilhadas do Tadeon Nexus. As decisões de movimento e interação seguem as orientações do repositório [emilkowalski/skills](https://github.com/emilkowalski/skills): resposta imediata no pressionar, movimento curto e interruptível, continuidade espacial, alvos de toque confortáveis e animação apenas quando esclarece uma mudança de estado.

## Antes, depois e motivo

| Before                                                             | After                                                                                                                 | Why                                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Drawer móvel montado manualmente e removido sem transição de saída | Drawer Radix com foco contido, Escape, overlay e entrada/saída simétricas                                             | Mantém contexto espacial e cobre o fluxo de teclado sem reinventar comportamento de diálogo |
| Controles compactos entre 28 e 40 px no celular                    | Primitivos de botão, campo, select, item de select e aba com piso móvel de 44 px                                      | Reduz erros de toque sem inflar a interface de desktop                                      |
| Rótulos chegando a 7–9 px em navegação, ficha, mesa e cards        | Piso tipográfico prático de 10–11 px e tracking menos aberto                                                          | Preserva a hierarquia sem sacrificar leitura em telas densas                                |
| Hover genérico em toda superfície translúcida                      | Hover visual restrito a cards e navegação realmente interativos, apenas em ponteiro fino                              | Evita prometer clique onde não há ação e elimina estados presos no toque                    |
| Pulsação infinita no indicador de tempo real                       | Anel estático com cor de estado                                                                                       | O status já comunica por cor e texto; movimento contínuo só competia por atenção            |
| Abas do Nexus com ícone de fechar dentro de outro botão            | Ação de abrir e ação de fechar separadas, ambas focáveis e rotuladas                                                  | Corrige semântica, teclado e alvo de toque                                                  |
| No celular, a lista do Nexus vinha antes do documento aberto       | Documento selecionado sobe para o primeiro bloco; busca volta ao topo quando não há seleção                           | Prioriza a tarefa atual sem perder descoberta                                               |
| 404, erro de rota e acesso negado tinham tratamentos distintos     | Estado de página compartilhado, com ação de recuperação clara                                                         | Dá consistência e reduz becos sem saída                                                     |
| Lista de usuários dependia de uma única linha horizontal           | Card responsivo, identidade e ações refluindo em duas áreas                                                           | Evita colisão entre e-mail, papel e exclusão em telas estreitas                             |
| Background fixo e movimento suave global                           | Background não fixo em toque; rolagem suave só na navegação intencional do documento e respeitando movimento reduzido | Diminui custo no celular e evita animação em ações de alta frequência                       |

## Cobertura funcional

| Área                  | Rotas ou superfícies revisadas                    | Resultado                                                                   |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Entrada e recuperação | `/login`, `/reset-password`, 404 e erro global    | Estados, formulário, leitura, foco e recuperação coerentes                  |
| Shell                 | navegação lateral, cabeçalho móvel, busca e conta | Safe areas, colapso, alvos, drawer e hierarquia revisados                   |
| Dashboard             | `/`                                               | Hero, sinais, galeria, vazios, criação e exclusão revisados                 |
| Administração         | `/master-panel`, `/manage-users`, `/nexus-tools`  | Densidade, controles compactos, listas e estados revisados                  |
| Nexus                 | `/nexus`                                          | Toolbar, busca, filtros, tabs, editor, propriedades e ordem móvel revisados |
| Mesa                  | `/tabletop`                                       | Toolbar, sessão ao vivo, presença, participante e responsividade revisados  |
| Ficha                 | `/sheet/$id`, `/sheet/$id/power`                  | Tipografia micro, steppers, dock móvel e controles densos revisados         |
| Consulta              | `/offline`                                        | Metadados compactos e leitura móvel revisados                               |

## Regras preservadas

- Nenhuma rota, permissão, política RLS, integração, feature flag ou contrato de dados foi alterado.
- Nenhuma rolagem ou animação foi adicionada a atalhos de teclado ou ações de alta frequência.
- Transições de interface permanecem abaixo de 300 ms e usam `transform`/`opacity` quando há movimento.
- `prefers-reduced-motion`, `prefers-reduced-transparency` e `prefers-contrast` continuam cobertos.
- O vocabulário visual permanece Fio-Mestre: vazio, reflexão, tinta, véu, metal e fluxo, sem convergir para um dashboard genérico.
