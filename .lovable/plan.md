# Auditoria de UI/UX e responsividade — Tadeon Nexus

Modo somente auditoria: nenhum arquivo de código foi alterado. Abaixo, apenas problemas concretos que o código evidencia, com caminho, classe/linha aproximada e correção recomendada.

## 1. Crítico — `transform` de animação quebra todo `position: fixed` dentro das rotas

- `src/styles/desktop-studio.css:278-280` → `.tadeon-route-stage > * { animation: tadeon-stage-reveal 360ms var(--ease-out) both }`
- `src/styles/mobile-studio.css:304-306` → mesma regra com `tadeon-mobile-stage-reveal`
- Ambos os keyframes usam `transform: translateY(...)` e `animation-fill-mode: both`, então o filho da rota permanece com `transform` computado **depois** do fim da animação.

Consequência real: qualquer descendente `position: fixed` renderizado dentro da página (não portalizado) passa a se posicionar em relação ao elemento da página, não à viewport, e ainda é recortado por `.tadeon-route-stage { overflow: clip }` (`desktop-studio.css:243-247`). Afetados diretos:

- `.tadeon-sheet-mobile-dock` (`src/styles/sheet-premium.css:1516`) e `.tadeon-sheet-top-button` (`src/routes/sheet.$id.tsx:2651`)
- `.tadeon-tactical-overlay` (`src/components/tabletop/tabletop-player-interaction-bridge.tsx:338`, CSS `tabletop-player-interaction.css:1-8`, `inset:0; width:100vw`) — overlay tático desalinha do canvas
- `.tadeon-tabletop-now` (`tabletop-integration-tools-bridge.tsx:381`), `.tadeon-placeables` (`tabletop-placeables-inspector-bridge.tsx:181`)
- O `fog-polygon-preview` já é `createPortal` (`tabletop-fog-geometry-bridge.tsx:392`), o que confirma o padrão correto e a inconsistência dos demais.

Correção: trocar `both` por `forwards`→não resolve (o transform final permanece); o certo é animar **apenas `opacity`** no estado final e usar `animation-fill-mode: backwards`, ou remover `transform` do keyframe `to` (`transform: none`) para que o valor final seja `none`. Alternativa: portalizar os overlays `fixed` da Mesa para `document.body` como já é feito no fog.

## 2. Crítico — docks flutuantes ficam por cima de modais/menus

Os componentes Radix usam `z-50` (`src/components/ui/dialog.tsx:35,53`, `sheet.tsx:35`, `drawer.tsx:38,56`, `popover.tsx:52`, `dropdown-menu.tsx:72`, `select.tsx:99`, `tooltip.tsx:56`). Já os docks fixos da Mesa usam z-index bem maiores:

- `tabletop-nexus-locator` z62, `semantic-transform` z63, `placeables` z64, `player-interaction` z64/88/110, `integration-tools` z65, `atmosphere` z56/72/90, `creative-dock`/`radial-actions` z86, `reliability-editor` z84/92/130, `director` z100/150, `progressive-ui` z95/96/180/200, `spatial-finish` z124.

Com um Dialog/Sheet/Select aberto na Mesa, esses docks continuam desenhados **acima** do overlay escuro e do conteúdo do modal, e permanecem clicáveis. Correção: definir uma escala única de camadas em `src/styles.css` (ex.: `--z-dock: 40; --z-overlay: 50; --z-toast: 60`) e rebaixar todos os docks para abaixo de 50, ou elevar os componentes Radix acima de 200 de forma consistente.

## 3. Alto — três docks disputam o mesmo canto inferior direito na Mesa

- `.tadeon-nexus-tabletop-locator` — `right:1rem; bottom:1rem; z-index:62` (`nexus-tabletop-locator.css:1`)
- `.tadeon-placeables` — `right:1rem; bottom:1rem; z-index:64` (`tabletop-placeables-inspector.css:1`)
- `.tadeon-creative-dock` — `right: max(.75rem,…); bottom: max(.85rem,…); z-index:86` (`tabletop-creative-dock.css:2`)

Quando dois ou mais estão ativos, eles se sobrepõem literalmente no mesmo ponto (o de z maior tapa os outros). No mobile (`max-width:639px`) o locator vira `width: calc(100vw - 1.3rem)` e cobre a faixa inteira, tapando também `.tadeon-placeables`. Correção: empilhar em uma coluna única (um contêiner `position: fixed` com `display:grid; gap` no canto) ou escalonar `bottom` por dock, como já foi feito com `.tadeon-semantic-transform` (`bottom:4.3rem`).

Mesmo padrão no rodapé central: `tabletop-player-interaction` (z88, `bottom: max(1rem,…)`) x `tabletop-progressive-ui` (z96 `bottom: max(.8rem,…)` e z95 `+3.65rem`) — três barras concorrendo na mesma faixa central.

## 4. Alto — conteúdo da ficha fica sob o dock móvel

`.tadeon-shell[data-mobile-dock="visible"] .tadeon-route-stage { padding-bottom: calc(5.35rem + safe-area) }` (`mobile-studio.css:308-310`) só se aplica quando o dock global está visível. Em `/sheet/…` o dock global é desativado (`src/components/app-layout.tsx:182,494`), mas a ficha renderiza o próprio `.tadeon-sheet-mobile-dock` fixo (`sheet.$id.tsx:2600`, altura ≥3,65rem). Não existe nenhum `padding-bottom` compensatório em `.tadeon-sheet-page`. Resultado: o último bloco da ficha fica escondido atrás do dock no celular. Correção: adicionar `padding-bottom: calc(4.4rem + env(safe-area-inset-bottom))` a `.tadeon-sheet-page` dentro da media query do dock (`sheet-premium.css:1516`).

Relacionado: a Versão de Poder (`src/routes/sheet.$id_.power.tsx`) não renderiza dock nenhum e o dock global está desligado para `/sheet/` — no celular a VP fica sem navegação inferior, diferente da ficha base.

## 5. Alto — barra de comando da ficha desaparece sob a toolbar no desktop

`.tadeon-sheet-commandbar` é `position: sticky; top: 0; z-index: 25` (`sheet-premium.css:23-26`), enquanto `.tadeon-desktop-toolbar` é `position: sticky; top: 0; z-index: 30; min-height: 4.65rem` (`desktop-studio.css:159-163`). Ao rolar no desktop, a barra com “Salvar”/VP gruda no topo **atrás** da toolbar e some. Correção: no desktop usar `top: 4.65rem` (ou `top: var(--tadeon-desktop-toolbar-height)`) na commandbar. Observação: no mobile isso já foi tratado (`sheet-premium.css:1148-1154` e `.tadeon-vp-commandbar { top: var(--sheet-mobile-header-height) }`, linha 1575), o que reforça que o caso desktop ficou de fora.

## 6. Médio — recorte vertical em barras com `overflow-x-auto`

`src/components/master/master-panel-navigation.tsx:89` → `.tadeon-master-navigation -mx-3 overflow-x-auto px-3 pb-1`. `overflow-x: auto` força `overflow-y: auto` computado, recortando anel de foco, glow e qualquer `title`/badge que ultrapasse a caixa (o `pb-1` cobre só 0,25rem). O mesmo vale para `.tadeon-sheet-jumpbar` (`sheet-premium.css:165-174`).

Correção: aumentar padding vertical do contêiner (`py-2 -my-2`) ou usar `overflow: visible` no eixo Y com `clip-path` lateral.

Além disso, a lista de abas do mestre tem 15 abas em `min-w-max`: ao trocar de aba por teclado/URL a aba ativa não é rolada para dentro da vista. Correção: `scrollIntoView({ inline: "center", block: "nearest" })` no trigger ativo, ou `scroll-snap-align`.

## 7. Médio — barra lateral sem transição de largura

`src/components/app-layout.tsx:363-366`: alterna `w-16` / `w-64` sem `transition-[width]`; `.tadeon-sidebar` (`interaction-polish.css:469-471`) também não declara transição. O recolher/expandir “pula”, e o botão em `absolute -right-5 top-6` salta junto. Correção: `transition-[width] duration-200 ease-[var(--ease-out)]` no `aside` (com `@media (prefers-reduced-motion: reduce)` desligando).

## 8. Médio — `width: 100vw` gera scroll horizontal no desktop

- `.tadeon-tactical-overlay` (`tabletop-player-interaction.css:5`)
- `.tadeon-fog-polygon-preview` (`tabletop-world-systems.css:97`, ainda com `height: 100vh` em vez de `100dvh`)

`100vw` inclui a largura da barra de rolagem clássica; combinado com `inset: 0` é redundante e cria overflow lateral. Correção: remover `width/height` e manter só `inset: 0`; onde precisar de altura, usar `100dvh`.

## 9. Médio — grades rígidas em painéis estreitos

- `src/routes/master-panel.tsx:1464` → `grid grid-cols-5 gap-1 text-[10px]` para atributos dentro de mini-fichas; em coluna estreita (comparação lado a lado em tablet) os valores colam e cortam. Correção: `grid-cols-3 sm:grid-cols-5` ou `auto-fit minmax(2.5rem,1fr)`.
- `src/components/knowledge/nexus-workspace.tsx:1597-1621` → `grid grid-cols-4` com ícone + rótulo (“Relações”, “Versões”) sem `truncate`; o `<span>` transborda o botão em painel de contexto estreito. Correção: `min-w-0` no span + `truncate`, ou esconder o rótulo abaixo de certa largura (`hidden @[14rem]:inline`).

## 10. Menor — cabeçalho móvel muito rígido

`src/components/app-layout.tsx:437` → `grid-cols-[5.9rem_minmax(0,1fr)_5.9rem]` deixa ~7rem para o bloco central em telas de 320–360px; com `currentSection` longo (“Mesa Nexus”, “Saúde do arquivo”) o texto trunca quase inteiro. Já existe `truncate`, então não quebra, mas fica ilegível. Correção: reduzir para `4.6rem` nas colunas laterais abaixo de 380px, ou esconder o subtítulo “Área em foco”.

## Ordem sugerida de correção

1. Item 1 (transform/fill-mode) — destrava itens 3, 4 e boa parte dos bugs de overlay da Mesa.
2. Item 2 (escala de z-index unificada).
3. Itens 4 e 5 (fichas: dock cobrindo conteúdo e commandbar sob a toolbar).
4. Itens 3, 6, 7.
5. Itens 8, 9, 10.

Nenhuma alteração foi feita. Aprove se quiser que eu implemente as correções nesta ordem (ou diga quais itens priorizar).
