# Manutenção do Tadeon Nexus

Leia `docs/ai/00_ESTADO_ATUAL.md`, `docs/WORKPLAN.md`, `docs/PROJECT_MAP.md` e `docs/FOUNDATION.md` antes de alterar interface, sessão ou publicação.

- Preserve o Fio-Mestre: fundo escuro, marfim, EB Garamond, Inter, PT Mono, símbolos autorais e cores por seção. Redesign exige uma decisão visual explícita.
- Procure o proprietário da regra em `docs/style-architecture.json` e no mapa de `docs/FOUNDATION.md`. Edite o módulo existente. Não crie outro arquivo numerado, `final`, `repair`, `polish` ou uma nova camada para vencer a anterior.
- O CSS tem uma transição documentada, não uma cascata já saneada por completo. Ao modificar uma propriedade, identifique todas as declarações concorrentes, mantenha um responsável e elimine as anteriores somente depois de validar os estados e tamanhos afetados.
- Não repita regras idênticas no mesmo contexto; mantenha a última autoridade existente. A geometria de Área em foco pertence a `page-hero-parity.css`, e os símbolos pertencem aos componentes de cabeçalho.
- As medidas `--tadeon-vv-*` pertencem somente ao `VisualViewportPopupBridge` do root. A busca consome essas medidas por CSS; rotas não devem reescrevê-las. O grafo e as condições da ficha pertencem ao estado React, sem presets ou anotação por varredura do DOM.
- Não acrescente `!important`, imports CSS aninhados ou observadores globais para contornar um conflito. Resolva a origem. O verificador de estilos usa tetos por módulo; reduza os tetos quando eliminar regras.
- Não edite arquivos gerados de rotas. Não una/squashe migrações SQL já aplicadas. Não integre branches antigos sem reavaliar seus requisitos contra a base atual.
- Cache offline só aceita usuário e cargo verificados. Escritas assíncronas devem carregar a identidade que iniciou a operação; nunca atribua uma resposta antiga à conta atual.
- Leituras concorrentes devem invalidar respostas anteriores, erros e a finalização do loading. Limpe timers, observadores e frames ao desmontar.
- Prefira testes de comportamento. Testes textuais existentes têm uma ponte temporária de procedência; novos testes não devem exigir nomes de correções históricas.
- Rode `npm run check` e `npm audit --audit-level=high`. Para mudanças visuais, valide também desktop, tablet, celular, portais, foco e redução de movimento. Registre limites de validação sem confundir fixture com uso real.
- Publique produção somente a partir de `main`, após os gates do workflow. Não use PR como atalho de produção.

- Cite IDs de `docs/project-continuity.json` nas PRs. Preserve decisões e evidências; não mantenha filas paralelas. Atualize o registro, regenere com `npm run sync:project` e valide `npm run check:project`.
- Validação na branch, integração em main e publicação são estados distintos. Antes de retomar, reconfira HEAD/base, PR e CI. Requisitos de PRs antigas ficam conciliados, nunca restaurados por merge automático.
