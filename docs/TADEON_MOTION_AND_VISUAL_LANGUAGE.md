# Tadeon — linguagem de animação, interação e personalização

Este documento resume o padrão visual e comportamental aprovado no Tadeon Nexus para ser reaplicado em outros projetos.

## 1. Princípio geral

A interface não deve parecer uma coleção de componentes genéricos. Cada página precisa ter identidade própria, mas todas devem pertencer ao mesmo universo visual. A sensação desejada é de um sistema autoral, elegante, tecnológico e ritualístico: profundo sem ser pesado, animado sem ser espalhafatoso, detalhado sem perder legibilidade.

O design deve sempre partir de três camadas simultâneas:

1. **estrutura funcional clara** — hierarquia, leitura, encaixe e responsividade impecáveis;
2. **identidade cromática por seção** — cada área tem uma cor própria usada de modo consistente;
3. **microinterações e motion** — mudanças de estado nunca devem simplesmente “pular” quando uma transição pode comunicar melhor o que aconteceu.

## 2. Identidade por página

Cada seção principal possui uma assinatura cromática, aplicada de forma coerente em ícones, bordas, halos, indicadores ativos, pequenos brilhos, linhas, estados de hover e elementos ornamentais. A cor não deve ser espalhada indiscriminadamente pelo fundo inteiro.

Paleta canônica atual:

- Dashboard: dourado / marfim quente — `217 215 164`, com apoio cobre `183 129 77`;
- O Nexus: verde / véu — identidade própria já consolidada;
- Mesa Nexus: azul frio — `84 123 148`, com apoio verde acinzentado `79 110 93`;
- Painel do Mestre: vermelho profundo — `116 36 45`;
- Gerenciar Usuários: laranja / cobre — `183 129 77`;
- Backup & Diagnóstico: metálico / aço — `122 129 135`;
- Consulta Offline: roxo acinzentado — `113 107 123`.

A regra essencial é: **o mesmo estado visual deve usar a cor da própria seção**. Um hover da Mesa não deve ficar dourado; um hover de Usuários não deve ficar azul.

## 3. Heroes / cabeçalhos

Os heads são uma peça de identidade, não apenas um título dentro de um retângulo.

O padrão aprovado inclui:

- ícone autoral da seção dentro de um **medalhão circular**;
- anel fino principal;
- um ou mais halos discretos ao redor;
- profundidade por `box-shadow` interna e externa;
- brilho localizado na própria cor da seção;
- elementos circulares/orbitais parcialmente recortados pelo hero;
- gradientes radiais de baixa opacidade;
- borda do hero relacionada à cor da seção;
- títulos e eyebrow podendo herdar a cor da seção, enquanto textos longos permanecem neutros para leitura.

O Nexus é a referência de equilíbrio. Outros heads podem variar a geometria, mas devem falar a mesma linguagem.

Densidade por página não precisa ser idêntica. O Dashboard pode ser deliberadamente mais elaborado e cerimonial; a Mesa deve ser mais discreta para não competir visualmente com o canvas.

## 4. Motion

### 4.1 Regra principal

Mudanças de interface não devem aparecer/desaparecer abruptamente quando existe relação espacial ou causal entre os estados.

Use motion especialmente em:

- abertura e fechamento de menus;
- painéis recolhíveis;
- guias/tabs;
- popups e dialogs;
- menus radiais;
- painéis contextuais;
- drawers e sheets;
- expansão/recolhimento de grupos;
- seleção de itens;
- mudanças entre estados 2D/3D;
- hover de ícones e botões;
- entrada/saída de controles contextuais.

### 4.2 Sensação das animações

As animações devem ser rápidas, elegantes e legíveis. O objetivo não é chamar atenção para a animação, mas fazer o sistema parecer fisicamente coerente.

Padrão recomendado:

- microinterações: aproximadamente `120–180ms`;
- menus/painéis: `180–280ms`;
- grandes mudanças de layout: `220–360ms` quando necessário;
- easing preferencial: curvas de desaceleração (`ease-out`) em entradas e transições espaciais;
- movimentos curtos: poucos pixels, evitando deslizes exagerados;
- combinar opacidade + deslocamento + escala mínima quando fizer sentido;
- evitar bounce/cartoon salvo quando a linguagem do elemento justificar.

### 4.3 Clique e pressão

Botões devem responder fisicamente ao clique. O padrão atual usa compressão muito pequena (`scale` em torno de `0.97–0.985`) para dar sensação tátil sem parecer brinquedo.

O estado pressionado não substitui o hover nem o selecionado; são camadas distintas.

### 4.4 Menus e tabs

Ao mudar de guia, a interface deve sugerir continuidade espacial. Preferir deslizamento curto, fade ou indicador que migra/acompanha a seleção em vez de trocar conteúdo instantaneamente.

Quando o menu precisa de rolagem horizontal no mobile/tablet, a **moldura externa deve permanecer fixa** e apenas o trilho interno deve deslizar.

## 5. Hover

Hover deve ser informativo e localizado.

No menu lateral, por exemplo, o botão não precisa mudar inteiro de cor. O comportamento aprovado é intensificar **o próprio símbolo** com a mesma assinatura cromática usada quando aquela aba está ativa.

Outras regras:

- ícones podem ganhar cor, glow discreto e leve intensificação;
- bordas podem subir alguns pontos de alpha;
- fundos podem responder de forma muito leve;
- texto não deve perder contraste;
- não usar uma única cor genérica para todos os itens quando cada item já possui identidade própria.

## 6. Ícones

Ícones devem ser tratados como parte da identidade visual, não meros pictogramas utilitários.

- usar o ícone semanticamente correspondente à função/aba;
- manter proporções e centralização óptica;
- aplicar cor da seção em estados ativos/hover;
- permitir halos e rings em contextos de destaque;
- animações pequenas no hover podem reforçar o significado do ícone, mas não devem prejudicar reconhecimento;
- em grupos de controles, preservar paridade de tamanho, borda, raio, fundo e alinhamento.

## 7. Popups, dialogs e overlays

Nenhum popup pode sair da tela em desktop, tablet ou celular.

O comportamento esperado:

- respeitar `visualViewport` em dispositivos móveis e quando o teclado está aberto;
- respeitar safe areas;
- limitar largura e altura à região realmente visível;
- input/cabeçalho e rodapé permanecem estáveis;
- somente o corpo central rola quando o conteúdo excede a altura;
- dialogs devem ter abertura/fechamento animados;
- evitar múltiplas autoridades geométricas concorrendo por `top/left/transform`.

## 8. Responsividade

Tablet é uma referência forte de qualidade visual no Tadeon: elementos não devem ser simplificados automaticamente no desktop só porque há mais espaço.

Cada breakpoint precisa preservar:

- hierarquia;
- personalidade;
- riqueza ornamental útil;
- áreas clicáveis confortáveis;
- ausência de colisões e cortes;
- alinhamento consistente;
- mesma linguagem de motion.

Não se deve simplesmente “encolher o desktop” para mobile. A composição pode reorganizar-se, mas deve manter intenção e qualidade.

## 9. Superfícies e profundidade

A estética usa camadas escuras, bordas discretas, gradientes radiais, brilho interno e sombras controladas.

Evitar:

- caixas pretas extras sem função;
- wrappers visuais duplicados;
- moldura dentro de moldura quando uma superfície única basta;
- sombras pesadas em todos os componentes;
- fundo colorido saturado em grandes áreas.

Preferir profundidade construída por pequenas diferenças de luminância, bordas translúcidas e halos de baixa opacidade.

## 10. Personalização sem perda de consistência

O projeto deve parecer artesanal. Botões, cards, heads, menus, seletores e painéis podem receber tratamentos específicos, desde que respeitem os tokens e contratos comuns.

A personalização deve acontecer principalmente em:

- ornamentação;
- ritmo e composição;
- ícones;
- cores por seção;
- microinterações;
- indicadores ativos;
- animações contextuais;
- fundos e halos sutis.

Não deve acontecer por meio de inconsistências acidentais de tamanho, espaçamento, borda ou comportamento.

## 11. Filosofia de detalhe

O objetivo é que quase tudo que possa responder ao usuário dê alguma resposta visual: botão, ícone, card, tab, grupo recolhível, seletor, menu, painel, token ou objeto interativo.

Mas essa resposta deve ter hierarquia. Elementos frequentes usam motion pequeno; ações importantes podem ter presença maior; elementos de fundo ficam abaixo da atenção funcional.

A sensação desejada é: **interface viva, coerente, autoral e responsiva**, nunca interface “barulhenta”.

## 12. Checklist para outro projeto

Ao adaptar esta linguagem para outro produto, validar sempre:

- todos os estados possuem transição coerente;
- nenhum menu ou popup simplesmente pula sem motivo;
- cada seção possui uma assinatura cromática clara;
- hover e estado ativo compartilham a mesma identidade do item;
- ícones estão centralizados e semanticamente corretos;
- menus fixos não deslizam quando apenas o conteúdo interno deveria rolar;
- desktop, tablet e mobile mantêm qualidade equivalente;
- dialogs não escapam da tela nem com teclado aberto;
- nenhum wrapper visual redundante cria “caixas fantasmas”;
- controles irmãos têm exatamente a mesma geometria base;
- elementos ornamentais nunca prejudicam leitura ou clique;
- `prefers-reduced-motion` é respeitado;
- animações servem à continuidade espacial e ao entendimento, não apenas ao enfeite.
