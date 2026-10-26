# Tadeon Nexus: Véu & Trama

Direção solicitada por Tadeu em 11/10/2026. **Direção aprovada por Tadeu**, vinculada a NEX-003. O primeiro lote de shell/Dashboard foi integrado pela PR #259; a publicação foi confirmada após #260, em 6621802, no workflow 38157372540; o estado atual sempre depende do workflow de main. [Prancheta navegável](design/board.html). A fila de execução continua exclusivamente em [project-continuity.json](project-continuity.json).

## Tese e identidade

Um arquivo vivo de mitos, personagens e vínculos, sustentado pelo Fio-Mestre. Suspense na atmosfera e precisão na interação: luz parcial, vazios intencionais, tecido tensionado e controles com profundidade. O símbolo autoral representa um ponto onde os fios encontram continuidade. A trama original da prancheta prolonga essa geometria, sem substituir a marca.

Público: jogadores e mestres que consultam, editam e conduzem sessões. Dashboard orienta a retomada; Nexus preserva conhecimento; ficha exige leitura e edição precisas; Mesa privilegia o mapa e as ferramentas. A mitologia é uma linguagem de memória, destino e vínculos, não a introdução de deuses ou fatos novos no cânone. NexOS continua separado. O pedido atual autoriza explorar vidro dimensional no Tadeon, sem importar a identidade cósmica do outro projeto.

Preservar: fundo escuro, marfim, Cormorant Garamond, Inter, PT Mono, símbolos existentes de `brand-mark.tsx` e `section-symbols.tsx` e cores locais. Não redesenhar os símbolos nem converter toda interface em uma composição ornamental. A direção apresenta uma assinatura coerente; alternativas só se uma decisão material exigir comparação.

## Hierarquia, composição e densidade

1. Localização e nome da área.
2. Tarefa que o usuário pode retomar ou executar.
3. Resumo pertinente e origem dos dados.
4. Exploração e ações secundárias.

Um título editorial e uma ação dominante por região. Tipos funcionais, alinhamento e agrupamento carregam a hierarquia; numeração só quando houver sequência real. Respiro inicial: 8, 12, 16, 24, 32 e 48 CSS px. Conteúdo de painéis com 20–24px de padding; medida de leitura 60–70 caracteres; raio de painel 16px, campo 10–12px. Esses valores são propostas, não tamanhos medidos da aplicação.

Compacto: uma coluna, margem de referência 16px, métricas empilhadas e navegação que mantém acesso a todas as áreas. Intermediário: duas colunas apenas quando textos e controles couberem. Regular: sidebar de referência 224px e margem 32px. Breakpoints derivam do conteúdo. 390, 820 e 1440px são vistas de validação, não leis de dispositivos. Também verificar 320px, zoom/reflow, texto a 200%, rótulos longos e teclado virtual real.

A prancheta contém Dashboard regular e composição compacta com dados fictícios. Os três números da prancheta ilustram hierarquia. Na implementação, foram reconciliados com `src/routes/index.tsx`: fichas disponíveis, seus personagens e maior exposição, todos provenientes da leitura existente. Não criar consultas ou indicadores só para reproduzir o mockup.

## Materiais e sua função

| Camada | Aplicação | Limite |
|---|---|---|
| Vazio | Fundo #080A0E e intervalos | Luz localizada fora da leitura; sem starfield |
| Tinta | Painéis #12151A / #22262D, documentos, ficha e tabelas | Conteúdo opaco e estável |
| Véu | Trama vetorial, cabeçalho e momentos de descoberta | Não passar sobre parágrafos, números ou cursor |
| Vidro | Navegação, barra de ferramentas e controles transitórios | Um plano funcional; sem vidro sobre vidro |

Receita inicial de tradução CSS: fundo `rgb(21 24 30 / 88%)`, `backdrop-filter: blur(16px)`, borda de luz, reflexo interno de 1px e sombra `0 12px 32px rgb(0 0 0 / 28%)`. Raio inicial 16px. Não equivale ao Liquid Glass nativo: refração dinâmica verdadeira não está implementada. A profundidade vem de luz, separação de planos e sombra de contato, sem necessidade inicial de WebGL.

Fallback opaco: #15181E, contorno #7A8187, mesmas dimensões e estados. Aplicar sem suporte ao filtro, com redução de transparência quando suportada e com preferência manual de efeitos caso implementada no app. Nenhuma função depende da aparência translúcida. Conteúdo do popup continua estável; controles e moldura podem receber a linguagem de vidro. Medir contraste no pior fundo composto; um ratio de cor opaca não valida uma superfície translúcida.

## Tokens e tipografia

Editar os tokens existentes em `src/styles.css`; a prancheta não é uma segunda folha de produção. A revisão autorizada por Tadeu em 11/10/2026 substitui a família editorial EB Garamond por Cormorant Garamond, de contraste refinado e caráter editorial. Não ampliar o trio de famílias; Inter e PT Mono preservam leitura e utilidade. Verificar carregamento, glifos portugueses e licenças antes de redistribuir fontes no app; a prancheta usa as famílias já solicitadas pelo root via Google Fonts, com fallback sem rede.

| Papel | Valor / família | Uso |
|---|---|---|
| Base | #080A0E | Vazio |
| Painel | #12151A | Dados opacos |
| Tinta | #22262D | Superfície elevada estável |
| Texto | #E9E3D5 | Leitura principal |
| Texto secundário | #9A9793 | Informação complementar sobre painel opaco |
| Ação / foco | #D9D7A4 com texto #080A0E | Conhecimento |
| Véu | #716B7B | Atmosfera, sem texto pequeno nessa cor |
| Metal | #7A8187 | Sinal/contorno funcional quando necessário |
| Editorial | Cormorant Garamond 500/600; Georgia, serif | 36–48px regular, 28–36px compacto, line-height 1,1 |
| Interface | Inter 400/500/600; system-ui, sans-serif | Corpo 16px/1,5; label 14px/1,4; título funcional 20–24px |
| Métricas | Inter 500; lining/tabular nums | Números do Dashboard 24–32px/1,2 |
| Utilidade | PT Mono 400; ui-monospace, monospace | Metadados/atalhos 12–14px/1,5 |

A capa da prancheta é editorial; sua escala não deve ser transplantada ao Dashboard. Metadados essenciais não devem diminuir para caber. Os resultados de pares opacos estão na [evidência](design-board-validation.json), calculados pela luminância relativa sRGB, sem arredondamento para determinar o limiar. Não constituem auditoria de todos os estados da aplicação.

Acentos preservados: Dashboard #D9D7A4; Nexus #4F6E5D; Mesa #547B94; Mestre #74242D; Usuários #B7814D; Ferramentas #7A8187; Offline #716B7B. Esses acentos localizam áreas, não substituem status. Verde e vinho escuros ficam em assinatura/atmosfera; erros recebem texto legível, ícone e correção pertinente. Não comunicar seleção, acesso ou risco somente por cor.

## Componentes e dados

Botão primário: uma ação dominante, hit area preferida 44×44 CSS px; secundário com contorno funcional. Hover localizado; pressão com deslocamento único de 1px (NEX-014); foco visível 2px marfim afastado 3px. 44px é decisão do projeto; WCAG 2.2 AA estabelece 24×24 CSS px com exceções, não uma regra universal de 44px.

Campos têm rótulo persistente, ajuda associada e erro que indique a correção. Vínculos/seleção recebem texto, contorno e estado acessível. Sidebar indica localização por texto e forma. Busca e dialogs mantêm abertura por teclado, foco inicial, contenção, Escape e retorno; medidas continuam sob `VisualViewportPopupBridge`. Animação não atrasa foco, leitura ou submissão.

Registrar default, hover, focus-visible, pressed, selected, disabled, loading, error e success quando aplicáveis. Vazio explica o conteúdo e uma ação útil; loading reserva geometria e anuncia o estado; erro preserva entrada e oferece recuperação; sem acesso e offline explicam limite/saída e respeitam identidade/cargo. Nunca simular sucesso visual para uma escrita ainda pendente. Não alterar datas, unidades, cálculos, autorização, cache ou persistência para atender ao desenho.

Ficha: identidade e números legíveis, texto e seleção estáveis, autosave preservado. Nexus: trilha, leitura e lista alternativa aos vínculos do grafo. Mesa: mapa e peças protagonistas, vidro no chrome externo, sem textura animada no canvas. Mestre: precisão e risco explícitos, vinho contido. Não uniformizar a densidade entre telas que têm tarefas diferentes.

## Gramática de movimento

| Intenção | Faixa proposta | Propriedade / destino |
|---|---|---|
| Tensionar | 120–180ms | Press/foco ou fio decorativo, sem deslocar o alvo |
| Desdobrar | 180–280ms | Painel acompanha a origem; percurso até 8px |
| Conectar contextos | 220–320ms | Somente quando esclarece continuidade |
| Repouso | Sem animação ambiente | Composição estática sustenta o suspense |

Easing inicial `cubic-bezier(.23, 1, .32, 1)`. Preferir transform/opacity em contêiner decorativo separado; não deformar glifos, números ou coordenadas. Cancelar execução anterior, último estado vence; desmontagem limpa recursos. Sem ondas infinitas, simulação de tecido global, cursor magnético, tilt obrigatório ou parallax de leitura. A prancheta demonstra tensão por escala de um SVG decorativo, não uma simulação física.

`prefers-reduced-motion` elimina o percurso e mostra o destino, preservando a informação. Oferecer equivalente a drag quando não essencial; estados não dependem de hover. Na implementação, medir frames, CPU, memória e filtros em hardware representativo antes de aumentar a intensidade. Não alegar fluidez de produção com base nesta demonstração.

## Construção no terreno existente

| Decisão | Responsável atual | Como evitar sobreposição |
|---|---|---|
| Tokens / tipo | `src/styles.css` | Atualizar token existente; nenhuma camada paralela |
| Superfícies | `src/styles/experience-surfaces.css`, `nexus-material.css` | Separar material de geometria |
| Cabeçalho | `page-hero-parity.css`, `hero-backgrounds.css`, `section-symbols.tsx` | Preservar símbolo e uma autoridade de geometria |
| Shell | `desktop-shell.css`, `navigation-layout.css`, `app-layout.tsx` | Localização e navegação pertencem ao componente |
| Motion | `motion-foundation.css`, `motion-interactions.css`, `motion-composition.css` | Uma propriedade animada por responsável |
| Portais | Primitivos UI e módulos existentes de popup | Não reintroduzir writers de viewport por rota |

Antes de alterar uma propriedade, buscar todos os concorrentes e conferir `style-architecture.json`. Modificar o módulo responsável; remover regras antigas somente após validar os estados afetados. Não adicionar `!important`, arquivo numerado, `final`, `repair`, `polish` ou observer global. Esta prancheta vive em docs e não entra no bundle da aplicação.

NEX-003 foi integrado pela PR #259, após aprovação da direção e implementação de shell/Dashboard. Outras etapas conservam as dependências em WORKPLAN gerado; não duplicar aqui outra fila. A expansão para navegação/portais, ficha, Nexus e Mesa depende do fechamento dos critérios pertinentes. Performance real e autenticação real continuam com seus próprios IDs e limites.

## Referências e transferência

Consultadas em 11/10/2026. Estas fontes orientam mecanismos; números e receitas acima são escolhas propostas para o Tadeon.

- [Apple HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials): fonte oficial, conteúdo recuperado no índice de busca; abertura direta exige JavaScript. Diferenciar conteúdo de camada funcional, com uso contido de vidro. Aplicar fundamentos à web, sem impor navegação nativa ou alegar equivalência de renderização.
- [Apple WWDC25: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/): transcrição oficial sobre profundidade, resposta à interação e continuidade entre origem/destino.
- [V&A: What is tapestry?](https://www.vam.ac.uk/articles/what-is-tapestry): estrutura da urdidura tensionada e trama entrelaçada. Transformada em desenho vetorial original; nenhuma imagem do acervo incorporada.
- [Remedy / Adobe: Environment Art Technology and Workflows in Alan Wake 2](https://blog.adobe.com/en/publish/2024/08/07/remedy-entertainments-environment-art-technology-workflow-alan-wake-2): entrevista com a equipe de ambiente, especialmente art direction. Transferir o método de trabalhar luz/material para uma atmosfera estranha; sem copiar arte, identidade ou narrativa.
- [W3C: WCAG 2.2](https://www.w3.org/TR/WCAG22/) e explicações de [contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) / [alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): texto comum 4,5:1, texto grande 3:1 e sinais não textuais aplicáveis 3:1; requisitos de reflow, foco e alvos devem ser verificados nos componentes efetivos. Animação desativável por interação é SC 2.3.3 AAA; aqui também é decisão de produto, sem confundir níveis.

A consulta a um arquivo específico do atlas VoltAgent retornou 404; ele não sustenta decisões desta proposta. A direção parte do próprio Fio-Mestre e das fontes acima. A prancheta usa vetores e CSS originais; não há colagem de imagens licenciadas nem imagem generativa representada como material técnico exato.

## Evidência e limites

A estrutura foi integrada pela PR #258 em `c6c1ea6c5e3338b4ff111329a8b2b37841e8245d`, após Quality bem-sucedido no HEAD `20ba787e496eea4285ee147a0380c175f2f4fe02`. O workflow de publicação no SHA do merge passou, incluindo a confirmação do endpoint público: [execução](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38151368993). A consulta independente local retornou HTTP 403; não houve validação de conta real.

A [evidência da prancheta](design-board-validation.json) registra vistas, interações demonstradas, movimento reduzido, pares de cor e limites de exportação. A confirmação inicial falhou; a correção #260 confirmou HTTP 200 e SHA exato em 6621802. O gate de entrega mantém essa verificação por commit. A [validação da implementação](dashboard-design-validation.json) cobre fixtures e interações no navegador; VoiceOver, contas reais, teclado virtual e performance de hardware continuam fora dessa evidência.


## Revisão tipográfica e navegação — NEX-004

Tadeu solicitou uma fonte mais sofisticada e medieval e autorizou prosseguir. Grenze 500/600/700 substitui a família editorial, com Georgia como fallback; nomes legados de utilidade `font-cinzel` são compatibilidade, não outra família. Corpo, campos, atalhos e números conservam Inter/PT Mono. A fonte é carregada pelo link único do root, com `display=swap`; glifos portugueses e métricas devem ser verificados no navegador. Fonte e licença: [Omnibus-Type/Grenze](https://github.com/Omnibus-Type/Grenze), SIL OFL 1.1; nenhum binário é redistribuído por este lote. A prancheta HTML acompanha a escolha; os exports e evidências anteriores são históricos.

O menu Mais organiza as três áreas em lista com rótulos compartilhados e alvos de pelo menos 44px. A mudança de radial para lista foi autorizada pelo pedido de reorganização de menus, registrado em DEC-011. O shell renderiza o gatilho e os símbolos; Radix controla posicionamento, colisão, setas, typeahead, Escape e retorno. Não há captura global de cliques nem reescrita de SVG. A moldura tem abertura e fechamento finitos; os destinos permanecem estáveis, sem órbita. O vidro fica na moldura funcional, com fallback opaco; dialogs de formulário usam conteúdo opaco e cabeçalho separado. Sheet conserva foco de retorno e respeita transferência para conta/instalação. A validação deste lote pertence à fila canônica.

A [evidência de NEX-004](navigation-design-validation.json) registra 16 vistas do Dashboard, 21 vistas de rotas, seis casos de busca/conta e dois viewports de teclado simulado, aprovados sem overflow ou erros de página. O foco acompanha o main efetivamente montado, inclusive quando o router substitui um nó na mesma URL. As fixtures usam as fontes reais e glifos portugueses; não certificam teclado físico, VoiceOver, contas reais ou campanhas povoadas. Integração e publicação têm confirmação separada na PR e workflow atuais.

NEX-004 integrado pela [PR #261](https://github.com/Gabriel2069/tadeon-nexus/pull/261), merge `2b36716`, após Quality 38162310175. A fila canônica conserva critérios e limites, com NEX-005 como próximo lote. Produção confirmada no [workflow 38162497262](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38162497262): HTTP 200 e SHA exato `2b36716`.

## Liquid fabric compartilhado — NEX-013

Tadeu rejeitou a fonte de NEX-004 e a tipografia numérica do Dashboard, e pediu fundos, animações e interações mais presentes antes da ficha. Cormorant Garamond 500/600/700 e itálico 500 assume o editorial; Inter 500 com lining/tabular nums assume as três métricas, preservando valores e leituras. PT Mono permanece em metadados. A decisão DEC-009 supera a escolha de Grenze em DEC-008, preservada no histórico. Fonte/licença: [CatharsisFonts/Cormorant](https://github.com/CatharsisFonts/Cormorant), OFL 1.1.

A trama vetorial aparece no fundo do login e shell, e em fitas do manifesto; não cobre textos ou recebe foco. Cards conservam tinta opaca com borda/reflexo e uma resposta decorativa finita. Navegação e controles recebem vidro escuro, sombra de contato e luz de borda. Formulários mantêm conteúdo opaco e moldura com reflexo. A tradução CSS segue a separação entre controles e conteúdo descrita em [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials), sem alegar equivalência com refração nativa.

useMaterialLight controla somente coordenadas locais de luz para mouse fino, com um frame pendente e limpeza no sair/desmontar; não altera geometria, dados, foco ou transform do conteúdo. CSS controla pressão, abertura e tensão de tecido em camadas decorativas. Toque/teclado recebem estados equivalentes, e movimento reduzido elimina deslocamentos. Sem novo observer, loop global, dependência ou módulo CSS; Button exclui writers genéricos legados de material/motion, preservando estilos funcionais específicos de outras áreas.

A evidência atual pertence a [shared-fabric-validation.json](shared-fabric-validation.json). NEX-013 é a prioridade autorizada antes de NEX-005; a fila continua exclusivamente no JSON canônico. Validação em fixture, integração e publicação exigem provas próprias.

NEX-013 integrado pela [PR #263](https://github.com/Gabriel2069/tadeon-nexus/pull/263), merge `41c2c88`, após Quality 38166007425 no HEAD `eba345b`. [Produção 38166156073](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38166156073) confirmou HTTP 200 e o SHA exato às 19:01:29Z de 11/10/2026. A evidência registra 49 vistas de fixture, seis portais e dois teclados simulados; contas reais, VoiceOver e GPU permanecem fora da certificação. A expansão segue NEX-005, usando os componentes atuais.

## Ficha por seções — NEX-005

A ficha estende o material aprovado sem introduzir outra família tipográfica. Identidade, atributos, recursos/defesa, condições e perícias recebem valores controlados da rota; nenhuma seção mantém uma cópia persistida. O recolhimento e os campos pertencem a `sheet-ui`, com nomes associados e gatilhos de 44px. Histórico e organização do inventário são renderizados na própria ficha; os RPCs e a presença conservam seus contratos. Modo de leitura conserva consulta, com escrita e drop bloqueados.

`sheet-premium.css` é o responsável pelos materiais dos painéis e métricas: tinta opaca, reflexo local, sombra de contato e borda discreta, com as cores funcionais de cada seção. Vidro fica na barra e no dock; Cormorant Garamond conserva os títulos, e Inter usa números tabulares. Não se deslocam textos, campos ou painéis; o radar não anima dados. A evidência e o estado de integração pertencem a [sheet-design-validation.json](sheet-design-validation.json) e à fila canônica.

NEX-005 integrado pela [PR #265](https://github.com/Gabriel2069/tadeon-nexus/pull/265), merge `1d92120`, após Quality no HEAD `363dbb8`. [Produção](https://github.com/Gabriel2069/tadeon-nexus/actions/runs/38182952991) confirmou HTTP 200 e SHA exato. A evidência conserva 126 suítes/557 testes, 16 casos de fixture e os limites; a próxima etapa é NEX-006.

## Revisão de movimento e leitura — NEX-014 / NEX-006, 14/10/2026

A revisão solicitada por Tadeu dá mais presença ao tecido e retira a disputa entre animações. Abas usam uma placa ativa local, sem indicador deslizante ou observer de medição; conteúdos têm uma revelação curta de opacidade. Dobras usam a altura do Radix e não deslocam ou comprimem os textos. Diálogos animam opacidade e a propriedade individual `scale`, enquanto o positioner conserva a centralização. Popovers mantêm a origem e as colisões do Radix. Movimento reduzido desativa esses efeitos. Botões pressionados usam apenas um deslocamento de 1px, e controles dentro da ficha recebem o RGB da seção; ação destrutiva conserva seu tom explícito.

Os três indicadores do Dashboard são placas com luz de borda, sombra de contato e fios autorais. A trama da capa recebe uma máscara de desaparecimento nos extremos. Reflexos e inclinação afetam a decoração; texto e alvo de interação permanecem estáveis. `FabricFilaments` reutiliza os mesmos fios na ficha e na biblioteca, com um único hook local de ponteiro. Não há refração física ou simulação de tecido: são superfícies CSS e vetores originais.

A referência de leitura é o comportamento documentado do Obsidian: [Graph view](https://obsidian.md/help/plugins/graph), [File explorer](https://obsidian.md/help/plugins/file-explorer) e [Tabs](https://obsidian.md/help/tabs), consultados em 14/10/2026. A tradução preserva o Fio-Mestre: árvore baseada em `parent_node_id`, teclado e expansão dos ancestrais da página ativa; abas de páginas; documento, grafo ou leitura combinada. O grafo inicia com nós pequenos, linhas finas e cores neutras; os grupos e afinidades de conteúdo são opções explícitas. Os controles ficam recolhidos, disponíveis na barra; zoom, arraste, filtros, forças e posições fixadas continuam sob estado React. Um clique abre a página; arraste e cancelamento não abrem. A árvore visual segue a hierarquia real, sem confundir distância de relações com parentesco.

Não é uma reprodução completa do Obsidian: não inclui seu sistema de plugins, vault local, painéis arbitrariamente acopláveis ou uma física continuamente simulada. Os limites do corpus e a autorização continuam nos serviços existentes. Evidência e limites desta implementação: [material-reading-validation.json](material-reading-validation.json).

## Continuidade da leitura — NEX-015

Documento e grafo compartilham uma composição ajustável, usando o componente de painéis já instalado. A largura do espaço de leitura decide a orientação: abaixo de 720px, os painéis ficam em coluna; acima, lado a lado. As proporções horizontal e vertical são independentes. O divisor usa sombra de contato, reflexo verde local, teclado e área de captura ampliada em ponteiros de toque. Não anima o deslocamento de texto. O editor permanece montado quando se alterna documento/grafo/combinado; o grafo só carrega após a primeira solicitação e preserva seu estado enquanto está oculto.

Preferências pertencem ao usuário, workspace e campanha. Rascunhos v2 pertencem ao usuário, workspace e página; gravações aceitas atualizam a versão-base dos trechos digitados depois. Fechar a última aba mostra a entrada do acervo e leva o foco a Reabrir página fechada. A ordem das abas é estável, e páginas não são descartadas por um limite implícito de seis abas. A revisão de conflito compara rascunho e versão salva antes de usar a versão salva ou aplicar o rascunho à versão atual; o RPC continua verificando concorrência.

Rascunhos legados sem identidade permanecem no storage e não são importados automaticamente para outra conta. Preferências não fazem sincronização entre dispositivos. A composição não inclui acoplamento arbitrário de painéis ou plugins. [Evidência e limites](nexus-continuity-validation.json); validação com corpus real autorizado segue NEX-010. Referência de API: [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels), versão instalada 4.6.5, consultada em 14/10/2026.


## Navegação e utilidades — NEX-016 a NEX-019

Nomes visíveis vêm de `utility-areas.ts`: Consulta offline, Usuários e Backup e diagnóstico. As URLs permanecem estáveis. “Saúde do arquivo” continua apenas como identificador interno de apresentação para conservar o tema existente. O nome `mobile-more-radial.css` é mantido por compatibilidade de inventário; seu conteúdo agora pertence à lista Radix.

`navigation-layout.css` concentra feedback e movimento direcional da navegação. Sheets com proprietário explícito de movimento recebem `data-motion-surface`; as regras legadas conservam geometria, mas deixam a animação para esse proprietário. A camada do drawer fechado é descartada sem manter bloqueio invisível após resize. As três utilidades compartilham um resumo de estado com números Inter e filamentos autorais; campos, leitura e confirmações permanecem estáveis. Escopo e limites de validação estão em [navigation-utilities-validation.json](navigation-utilities-validation.json), sem outra fila de tarefas.


## Condução do Mestre (NEX-008/020)

O vinho fica na borda, no plano selecionado e nos filamentos; o título conserva marfim legível. A visão geral reúne campanha/objetivo, entrada na sessão, indicadores acionáveis e personagens em perspectiva. Cormorant sustenta títulos e nomes; Inter tabular mantém recursos e métricas. Tecido aparece como luz vetorial localizada, sem atravessar os campos ou deformar os dados.

A navegação organiza Condução, Elenco, Ritmo e Arquivo. O seletor compacto permite alcançar todas as ferramentas sem depender de arrastar a faixa; foco, abas e URL permanecem sob React/Router. Os alvos mantêm posição; o material dos botões vem do primitivo compartilhado. A revisão não acrescenta animação ambiente nem outra camada para vencer os estilos antigos.

A prova visual e de interação deste lote pertence a [master-workspace-validation.json](master-workspace-validation.json); publicação depende do workflow de main e do SHA servido.


## Mesa: instrumentos em torno da cena — NEX-007/021

O mapa recebe espaço contínuo e altura delimitada; controles de navegação ficam no dock, enquanto a criação aparece no modo de edição. Grupos nomeados substituem ações sem legenda. Azul da Mesa conduz bordas e seleção, marfim mantém leitura, e vidro escuro distingue instrumentos do conteúdo. A biblioteca criativa começa fechada. Campos e números permanecem estáveis durante as transições.

A largura disponível decide entre editor lateral e diálogo. No compacto, um seletor alcança montagem, ambiente, bastidores, cena e inspeção. Os comandos usam busca por texto, navegação por teclado e disponibilidade real; o foco volta ao controle de origem. O contexto da Mesa fica dentro da leitura do Nexus, sem uma notificação fixa sobre o editor. A prova executada e seus limites pertencem a [tabletop-workspace-validation.json](tabletop-workspace-validation.json).


## Evolução de sistema — NEX-023, 16/10/2026

Tadeu solicitou elevar todo o sistema após a Mesa, com pesquisa de grandes aplicativos e sistemas operacionais, sobretudo Apple. A tese permanece Véu & Trama: um arquivo de memórias e vínculos, com tecido tensionado, instrumentos de vidro escuro e conteúdo em tinta. A evolução reforça a materialidade e a continuidade entre estados. Símbolos, tipografia, paleta e cânone permanecem autorais.

### Pesquisa e tradução

Fontes primárias consultadas em 16/10/2026. As interpretações na última coluna são decisões do projeto, não prescrições das marcas.

| Referência / superfície | Evidência consultada | Tradução para TdV |
| --- | --- | --- |
| Apple — camadas do sistema | [Materials / Liquid Glass](https://developer.apple.com/design/human-interface-guidelines/materials), seção Liquid Glass; [WWDC25, Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/), transcrição | Instrumentos flutuam acima da leitura. Moldura com borda luminosa, sombra de contato e material mais espesso ao abrir. Não espalhar transparência por documentos ou campos. |
| Apple — organização | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), Visual hierarchy | Agrupamento por tarefa e densidade por espaço disponível; alvos e rótulos não se deformam com o material. |
| Apple — movimento | [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), Providing feedback, recuperado como Markdown oficial | Abertura preserva relação com a origem; saída mais curta. Sem espera para executar ações. Movimento reduzido chega diretamente ao estado final. |
| Apple — legibilidade | [Sufficient Contrast](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/sufficient-contrast-evaluation-criteria), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color) | Texto estável sobre tinta; contrastes medidos nos pares concretos. Manter o trio aprovado, sem importar SF Pro ou estética literal do iOS. |
| Windows / Fluent — materiais | [Materials used in Windows apps](https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/materials), Acrylic e Mica | Distinguir superfície de base e ferramenta transitória. A tradução web usa tokens próprios; não promete acesso ao compositor ou wallpaper do sistema. |
| macOS — trabalho em janelas | [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos/), Best practices | Aproveitar espaço regular para painéis e precisão; comandos e atalhos sem empilhar modais. Preservar leitura e composição adaptáveis já construídas. |
| Linear — interface de trabalho | [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh), 12/03/2026, hierarquia e estrutura | Conteúdo recebe prioridade. Material não exige multiplicar molduras, etiquetas ou ícones; proprietários compartilhados evitam deriva entre rotas. |
| Raycast — ação contextual | [A fresh look and feel](https://www.raycast.com/blog/a-fresh-look-and-feel), barra de ações e foco compacto | Ações próximas do contexto, busca legível e atalhos descobríveis; aproveitar comandos e agrupamentos já implementados, sem criar menu concorrente. |
| Obsidian — conhecimento espacial | [Graph view](https://obsidian.md/help/plugins/graph), interação e filtros | Vínculos e leitura continuam protagonistas. A linguagem material envolve o workspace, sem cobrir nós/arestas nem mudar sua semântica. |

As páginas HIG em HTML retornaram o invólucro dependente de JavaScript. Motion, Typography e Color foram recuperadas pelo endereço `.md` oficial; Materials, Layout e Accessibility também tiveram conteúdo no índice de busca. Não foi feita inspeção de sessões autenticadas desses aplicativos, nem uma comparação de desempenho com eles.

### Vocabulário implementado

| Papel | Propriedade / mecanismo | Proprietário |
| --- | --- | --- |
| Tinta com relevo | `--surface-ink`, `--shadow-relief`, borda iluminada; Card recebe reflexão local | `styles.css`, Card, `experience-surfaces.css` |
| Instrumento elevado | `--shadow-float`, vidro escuro, borda de 1px; conteúdo de diálogo opaco | `navigation-layout.css`, `route-popup-frame.css` |
| Tecido | Faixas vetoriais com brilho e fios finos, sem bitmap ou física contínua | ThreadField, FabricFilaments, ContinuityHero |
| Campo rebaixado | Fundo #0D1117, sombra interna, aro de foco; sem deslocar cursor | Input, Textarea, SelectTrigger; `button.css` |
| Botão | Raio .85rem, luz local, 1px de pressão; hover modifica borda/reflexo, sem mover o alvo | Button e `button.css` |
| Painel / popup | Raio 1.35rem; popup ancorado 1rem; curvas internas menores que a moldura | Tokens e primitivos; exceções de geometria continuam nos módulos de seção |
| Seleção | Placa local com luz superior e sombra de contato; sem indicador global viajante | Tabs e `button.css` |
| Abrir / fechar | Painel 260ms (210ms no compacto pelo token existente), saída 150ms; menu parte até 6px da origem Radix; diálogo conserva o positioner | `route-popup-frame.css` |
| Atmosfera | Faixas estáticas no fundo; cabeçalhos respondem por opacidade à interação/foco | `experience-surfaces.css`, `hero-backgrounds.css` |

O shell define o tom iluminado dos controles e o distribui por contexto React; dialogs, popovers, dropdowns, submenus e Select preservam esse tom nos portais, sem observação do DOM. O hook de frame continua responsável somente pela geometria. Isso evita que a saída do DOM do shell faça controles transitórios voltarem ao tom de outra área. Styles explícitos do consumidor ainda têm precedência. A geometria de viewport permanece com os proprietários anteriores.

### Aplicação por família

| Família | Composição e limite |
| --- | --- |
| Login / Dashboard | Tecido com volume e faixas largas; selo autoral preservado. Indicadores mantêm Inter tabular e ganham relevo. Cartas de personagens mantêm identidade editorial. |
| Ficha / documentos / biblioteca | Leitura opaca, campos rebaixados, ações com luz local. Filamentos desvanecem nas extremidades; nenhuma animação sobre parágrafos ou números. |
| Nexus | Painéis e instrumentos aderem à gramática compartilhada; árvore, abas, editor e grafo conservam seus estados e coordenadas. |
| Mesa | Ferramentas usam os primitivos comuns. Cena, miniaturas, iluminação e projeção continuam no motor; não aplicar textura animada ao mapa. |
| Mestre / utilidades | Material compartilhado e cor local em controles. Densidade, rascunhos, confirmações e audiência continuam nos módulos existentes. |
| Navegação / popups | Vidro funcional, foco e retorno; abertura e saída têm um único dono. Não adicionar glass dentro de glass ou deformação de texto. |

### Acessibilidade, custos e continuidade

A aparência escura é a única aparência suportada pelo produto nesta etapa; não foi criado modo claro incompleto. Fallback de material opaco, redução de transparência e contraste aumentado têm regras explícitas. As combinações e estados efetivamente medidos pertencem à evidência, sem certificação geral de WCAG/HIG.

A revisão retira os defaults concorrentes de Card no desktop e exclui o Card com proprietário explícito dos escritores genéricos de material legados. Classes de animação duplicadas dos primitivos ancorados são retiradas. O backdrop compartilha a presença do diálogo; fechado, tem fallback oculto, inclusive quando a preferência de movimento muda durante a saída. A busca usa a altura visual também no tablet, e ações de utilidades quebram a linha pela largura disponível. Notificações consomem os tokens hexadecimais diretamente, sem wrappers HSL inválidos. O cabeçalho deixa de iniciar loops próprios de brilho/órbita. Os títulos das utilidades usam marfim; três declarações de cor concorrentes foram retiradas, preservando cor de seção nos símbolos e no eyebrow. Não há dependência, observer global ou arquivo CSS novo. A prancheta demonstra decisões; runtime, fixtures e produção mantêm provas distintas. Performance física e autorização real continuam em NEX-009/010; a fila exclusiva permanece em project-continuity.json.


## Composição e descoberta do acervo — NEX-024

Após NEX-023, Tadeu pediu maior elaboração. O Dashboard passa de caixas uniformes a um acervo de fólios: lombada, índice estável do fio, título editorial, responsável e exposição separados da ação. A busca por nome, ocupação ou responsável, o filtro de propriedade e a ordenação operam apenas sobre os registros já autorizados. Não criam consultas, regras de acesso ou histórico fictício. A ordem de chegada mantém o significado de “Mais recentes”; mudar a ordenação não renumera os fios.

O hero preserva a arte e o símbolo aprovados, com uma armadura de fios finos que responde de forma finita à interação. Os indicadores formam um único registro gravado, com divisórias e figuras tabulares, sem uma caixa de vidro dentro de outra. No celular, a arte ocupa menos altura e o registro conserva os três valores e seus detalhes em colunas.

Rótulos da navegação podem quebrar a linha em vez de serem cortados. O render controla a presença dos rótulos; navigation-layout.css controla ícones e dimensões dos itens, e desktop-shell.css a largura do trilho. Os remendos anteriores de ícone/recolhimento foram retirados dos demais módulos. Reflexos não movem textos nem alvos; armadura e ações assentam diretamente com movimento reduzido. Evidências de execução e limites acompanham o lote na fila canônica.


## Ficha como dossiê — NEX-025, 19/10/2026

A identidade ganha um campo de nome editorial com quebra de linha, selo autoral e registros narrativos separados por espaço e linhas discretas. Cabeçalhos mantêm o índice real das seções, com título maior e rótulos em Inter; PT Mono fica nos índices e siglas. O resumo usa um único registro de quatro valores, com os acentos funcionais preservados. Leitura desabilitada mantém contraste, em vez de esmaecer o conteúdo da personagem.

Recursos usam instrumentos com arco proporcional ao valor atual/máximo, ambos explícitos em texto. O arco é vetorial e decorativo; valor, campo e alvo não inclinam. Os controles herdam o RGB do próprio recurso, com 44px e modificador separado. Tecido responde somente na decoração; a fonte do nome e os demais símbolos continuam os aprovados.

O índice oferece as doze seções, com seletor nativo no compacto e links de ação no regular. A escolha foca o título e revela uma seção recolhida sem editar valores. Vínculos têm Collapsible controlado pelo componente; Novo vínculo revela a lista antes de acrescentar o registro pelo callback existente. Maestria e História são rótulos reais dos Tabs, sem substituir texto por pseudo-elementos CSS.

A dobra pertence a `button.css`, pelo contrato `data-motion-surface="fold"`; não anima transform dos glifos. Gatilhos da Ficha recebem uma fronteira explícita contra os escritores legados. Uma camada própria da seta representa o estado, inclusive com movimento reduzido, sem disputar a rotação do SVG com regras genéricas. Materiais e geometria do dossiê pertencem a `sheet-premium.css`; `sheet-layout.css` conserva as exceções de densidade do modo Jogo, excluindo campos/rótulos do dossiê, recursos e índice. Os steppers mantêm a geometria no modo Jogo; campos de Nome não recebem corte por altura de uma linha.

Reconsultadas em 19/10/2026: [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials), Liquid Glass; [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), Providing feedback; [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), Visual hierarchy. O conteúdo oficial foi recuperado no índice de busca; HTML retornou invólucro JavaScript e o Markdown não foi aceito pelo mecanismo de abertura. A tradução para web mantém vidro nos instrumentos, conteúdo estável e resposta breve/cancelável. Não é renderização Liquid Glass nativa. Evidência e limites desta revisão ficam em `dossierRevision` de [sheet-design-validation.json](sheet-design-validation.json), preservando a procedência de NEX-005.

A barra da Ficha conserva acesso durante a leitura no regular. Seu encaixe e o respiro dos atalhos acompanham as alturas reais dos cabeçalhos; popouts sem shell têm deslocamento zero. A medição é local, sem deformação ou observador global.

## Continuidade entre páginas e instrumentos do acervo — NEX-026

Decisão explícita de Tadeu: o layout geral deve continuar entre páginas, com o mesmo padrão de cabeçalho. `PageHeader` organiza símbolo, localização, título editorial, descrição, ações e contexto adicional. A cor e o símbolo identificam a área; tipografia, margens, proporções e alinhamento seguem o mesmo contrato. Dashboard, Ficha, Forma de Poder, Nexus, Mestre, Mesa de mestre/jogador, utilidades e laboratórios usam essa anatomia. A arte aprovada do Dashboard continua como uma seção editorial abaixo da identidade da rota.

O envelope `data-page-layout` mantém largura e margens comuns. Conteúdo e ferramentas conservam a densidade apropriada: leitura em tinta opaca, instrumentos de vidro escuro, filamentos com desaparecimento nas bordas e reflexão local. O cabeçalho da Ficha conserva sua extensão sticky e medição local. As barras de edição da Mesa ficam abaixo da identidade, preservando espaço e contexto da cena. Autenticação e consentimento mantêm a composição de entrada; popouts e embeds conservam seus limites de apresentação.

No Nexus, Bibliotecas e Nova página têm acesso direto; Ferramentas reúne importação/exportação, grafo local, comandos e janela dedicada. Explorar alcança a busca do acervo no compacto, com retorno à leitura por foco. Categorias derivam dos tipos das páginas carregadas e deixam esse limite explícito; não representam pastas reais, nem as 500 candidatas possíveis do grafo. A árvore continua seguindo `parent_node_id`, com guias de profundidade e seleção estável. Abas, editor, preferências e divisores conservam seus proprietários.

Nova janela e Salvar sessão passam a ser renderizados nos slots das rotas. A ligação por arrasto recebe ID e título da página realmente selecionada. Nenhuma ação descobre ou altera títulos por um observer. A biblioteca compartilha o cabeçalho, distingue falha de consulta de resultado vazio e permite tentar novamente; a prévia da tabela funciona no compacto e devolve foco ao controle que a abriu. Os status têm rótulos em português.

A prova desta revisão fica em `compositionRevision` de `nexus-continuity-validation.json`. Fixtures, integração e publicação têm registros distintos; dispositivos físicos, contas reais e corpus autorizado permanecem em NEX-009/010.

### NEX-026 — roda do Mais e continuidade autoral (DEC-017)

Tadeu pediu explicitamente o retorno da roda, substituindo a lista adotada em NEX-016. O Mais abre um plano circular: três destinos orbitais, fios de ligação e fechamento central. Os rótulos permanecem horizontais, as áreas de toque são imóveis e o material recebe o tom da rota pelo contexto React, inclusive no portal. A entrada e a saída são curtas e finitas, sem girar textos, sem deslocar alvos no hover e com redução de movimento. A geometria pertence somente a `mobile-more-radial.css`; foco, colisão e dispensa continuam no Radix, sem captura global de eventos.

Continuidade não elimina os gestos autorais: a roda, os símbolos e os instrumentos de cada área coexistem com o mesmo envelope de página, anatomia de cabeçalho, tipografia, luz e disciplina de movimento. Nenhuma alteração neste lote troca a identidade Fio-Mestre ou promete Liquid Glass nativo.

## Composição móvel e fio de seleção — NEX-027 (DEC-018)

Pedido de Tadeu em 19/10/2026: o celular precisa de uma composição própria, com relações em pares e registros compactos, sem uma sucessão automática de cards grandes. O Dashboard perde o cabeçalho adicional de NEX-026 e conserva a abertura artística anteriormente aprovada. Esta é a exceção explícita à aplicação universal de PageHeader; as demais rotas continuam compartilhando sua anatomia.

A interface usa Alegreya Sans, de desenho humanista e caráter caligráfico, em lugar de Inter. Cormorant Garamond continua nos títulos e nos números editoriais compactos; PT Mono permanece nos códigos. Os três pesos da interface são servidos localmente como WOFF, com cobertura latina e licença OFL junto dos arquivos, sem depender de uma chamada ao Google para a interface. O token legado `--font-inter` é um alias da nova família, e `--font-sans` recebe a mesma família para evitar o fallback genérico dos componentes. Fonte consultada: [HT Fonts — Alegreya Sans](https://htfonts.com/en/fonts/alegreya-sans/), em 20/10/2026. A decisão é uma interpretação para TdV, não uma recomendação obrigatória do fabricante.

Na Ficha, nome, ocupação, origem e marca permanecem à vista; convicções, pergunta e vínculos têm uma dobra explícita, inicialmente recolhida no celular. Uma escolha manual permanece ao mudar a largura. Recursos são instrumentos em pares, com áreas de toque de 44 px e modificadores separados do valor atual; aparecem antes dos atributos no compacto. O acervo passa a registros com metadados e ação lado a lado. Os resumos das utilidades ocupam colunas e os controles de contexto do Nexus cabem em pares.

`SelectionPlate` desenha um único plano de seleção entre controles imóveis. A transição converge à última escolha e respeita movimento reduzido; a navegação mede o destino anterior no shell novo, conservando o deslocamento entre páginas sem reutilizar coordenadas de outro viewport; ResizeObserver mede somente o grupo local e seus controles. Abas mantêm as semânticas Radix, e modos explícitos mantêm `aria-pressed`. A roda do Mais continua preservada. Tramas vetoriais e cruzamentos reforçam o tecido sem um loop de renderização. O brilho dos medidores é finito e a página longa termina a entrada sem filtro ou promoção permanente.

A visualViewport continua tendo um único proprietário. Sua rolagem atualiza a posição dos portais sem recapturar o campo focado; gesto de rolagem cancela as correções pendentes do teclado. A evidência atual e seus limites ficam em `mobileRevision` de `visual-system-validation.json`.


## Véu tensionado e custo de presença — NEX-028

A nova rodada aprofunda a identidade aprovada sem mudar paleta, símbolos, fontes ou a exceção do Dashboard. O tecido ganha relevo por faixas de luz e sombra, cruzamentos e desaparecimento nas extremidades; os filamentos finos convivem com dobras largas. O fundo deixa de depender do deslocamento permanente de gradientes. Cards recebem luz de contato no topo/lateral e sombra interna, enquanto o conteúdo continua num plano estável e legível. Cabeçalhos conservam a mesma anatomia e a cor de cada seção.

A presença vem de composição e resposta local: luz acompanha a atenção no desktop, foco mantém o contorno e toque mantém os alvos. Loops decorativos contínuos do shell, fios e cabeçalho são retirados dos escritores históricos; carregamento e feedback funcional preservam seus próprios estados. O vetor de fundo usa menos caminhos e não acrescenta filtros de distorção, canvas, dependências ou imagens grandes. A barra compacta da Ficha separa ações primárias de presença/estado; o salvamento conserva rótulo legível.

A evidência pertence a `craftRevision` de visual-system-validation.json. A contagem de animações e caminhos é evidência de trabalho retirado, sem transformar em alegação de FPS, INP ou ganho percentual em celulares físicos.


## Fólios de consulta e luz exclusiva — NEX-029

O acervo ganha um ritmo mais compacto: menos altura vazia, largura mínima menor, lombada com ponto de costura e identificação discreta dos fios da própria conta. Nome e ocupação conservam leitura integral; nenhuma miniatura, truncamento ou recorte substitui informação. A busca, filtros e ordenação continuam locais sobre os registros autorizados. No celular, os registros dividem metadados e ação; duas colunas surgem apenas quando a largura permite.

A barra lateral é um plano opaco de tinta, com luz de contato e gradiente estático; o vidro permanece nos instrumentos flutuantes. Em ponteiro grosso, a moldura móvel usa blur menor. Preferências de transparência e contraste conservam precedência. A reflexão de um controle deixa de medir e atualizar seus painéis ancestrais: somente a superfície material mais próxima responde ao evento. Conteúdo comum continua iluminando seu card.

O workflow Visual review compara o acervo com a base da PR e verifica a implementação em quatro larguras, incluindo foco, portais, navegação e movimento reduzido. Medidas de altura, colunas e leituras de geometria são evidência de composição e trabalho retirado; não são FPS, INP ou autonomia em dispositivo físico. Procedência e estado ficam em visual-system-validation.json.


## Relevo óptico e Mesa circular — NEX-030

Pedido de Tadeu: refinar botões/menus e a profundidade de cards/caixas sem exagero, preservando o material aprovado dos botões; restaurar os menus circulares flutuantes da Mesa. Os cards ganham uma aresta luminosa interna e sombra de contato em camadas; o texto, os campos e os alvos permanecem imóveis. O antigo pressionamento do card inteiro deixa os materiais explícitos. Menus ancorados abrem a partir do gatilho com dobradiça óptica de 1,5 grau e resolvem em 210 ms; saída em 140 ms. Movimento reduzido dispensa a animação.

O menu da entidade conserva seis ações orbitais e o núcleo de fechamento/memória/modelo. Rótulos não giram; os alvos têm pelo menos 44 px. A moldura circular se resolve por escala curta e opacidade, sem overshoot. O portal vai ao body para que coordenadas de viewport não dependam de contenção/transformação da rota. A geometria pertence ao radial, que acompanha câmera, scroll e resize por eventos; o bridge final deixa de reescrevê-la. O modo limpo e utilidades concorrentes conservam seus limites explícitos.

Provas e limites ficam em materialMotionRevision de visual-system-validation.json. Fixtures interceptam dados: não certificam permissões ou dispositivos reais.


## Mesa como espaço de composição — NEX-031

Direção: o tabuleiro é a superfície de trabalho; identidade, sessão e ferramentas tornam-se instrumentos compactos. PageHeader conserva a anatomia e a tipografia aprovadas numa faixa operacional (DEC-019). A barra de visão fica fora do canvas, com placa de seleção 2D/3D, enquadramentos, giro, encaixe, histórico e abertura do editor; a telemetria inferior deixa de duplicar câmera e zoom. O editor começa recolhido no desktop e vira diálogo no compacto. Sincronização e ferramentas extensas são disclosures, não blocos permanentes antes do mapa. Tela inteira mantém o mesmo DOM e leva os portais para a árvore visível do navegador.

Referências oficiais consultadas em 21/10/2026:
- [Owlbear: imagens](https://docs.owlbear.rodeo/docs/images/), [cenas](https://docs.owlbear.rodeo/docs/scenes/) e [assets](https://docs.owlbear.rodeo/docs/managing-assets/): seleção contextual, tipos de peça, encaixe e separação entre biblioteca e cena. Adaptado em comandos próximos ao mapa e biblioteca com autoria visual reutilizável.
- [Foundry: tiles](https://foundryvtt.com/article/tiles/): propriedades precisas, elevação e edição de múltiplas peças. Adaptado no painel de composição e nos lotes de histórico.
- [TaleSpire: Slab Browser](https://talespire.com/using-the-slab-browser): busca e inserção de conjuntos pré-montados. A adaptação do Tadeon usa formações e repetição do conjunto selecionado; não importa o catálogo externo.

Formações conservam tipos, dimensões e propriedades; mantêm o conjunto dentro da cena ou recusam uma configuração sem espaço. Repetição oferece passo horizontal/vertical, giro e elevação por cópia, com um desfazer para o lote. Modelos têm escala, giro, altura da base e velocidade de animação no editor. A biblioteca preserva autoria 3D e cor, sem copiar propriedade de conta, vínculos privados ou notas arbitrárias. Nenhum asset GLB é exibido por img. O enquadramento usa o envelope conservador da normalização do modelo e sua elevação, com margem proporcional no celular, para evitar focar apenas a base e cortar o topo.

Modelos estáticos e pausados desenham sob demanda. Só modelos com animação carregada mantêm o ciclo; aba oculta suspende o trabalho. O perfil econômico preserva a camada 3D e reduz efeitos, resolução e orçamento de animação (20 FPS; equilibrado 30; alto/cinemático 60). Pausar, retomar ou mudar a velocidade preserva a fase do clipe. Medições e limites ficam em spatialWorkbenchRevision de visual-system-validation.json.

Na seleção única do mestre, a roda é a ação rápida canônica; barras duplicadas deixam de encobrir a peça. A seleção coletiva conserva o trilho e os jogadores mantêm seus instrumentos. Ficha, arquivo, camadas e demais propriedades continuam no inspetor e nos comandos existentes.


## Acabamento dos instrumentos da Mesa — NEX-032

A câmera, o enquadramento/grade e o histórico/editor formam grupos visuais estáveis. O celular recompõe esses grupos segundo a largura útil, mantendo alvos de 44 px. A ação de giro conserva o lugar em planta e fica desabilitada. O menu de enquadramentos usa o Select do sistema, com foco e portal herdados inclusive em tela inteira.

As formações e a repetição abrem por altura, com fechamento correspondente e seta decorativa isolada; movimento reduzido mostra o destino imediatamente. Keyframes do material deixam de compartilhar nomes com popups legados. A sessão ao vivo mantém sua montagem anterior. As abas do editor recebem o plano contínuo de SelectionPlate, sem preenchimentos individuais concorrentes.

A profundidade dos painéis vem de luz de contato no topo/lateral e sombra de assentamento, sem inclinar textos ou animar superfícies paradas. Botões, rodas, paleta e fontes aprovadas conservam seus proprietários. Evidência em tabletop-finishing-validation.json; a fila continua somente em project-continuity.json.

## Fluidez dos menus compartilhados — NEX-033

Pop-ups ancorados conservam a dobradiça óptica e a abertura de 210 ms, com saída de 140 ms. O movimento pertence a route-popup-frame.css; regras legadas de entrada/saída e cascata de itens excluem superfícies com proprietário explícito. Os itens ficam disponíveis sem esperar revelações individuais. Fundos de Dialog, AlertDialog e Sheet usam uma presença curta por opacidade, sem animar filtro de tela inteira. O fechamento do menu ancorado desativa sua captura de ponteiro. Movimento reduzido alcança o destino diretamente, inclusive no fundo. Botões, materiais e rodas circulares conservam sua direção aprovada.

A ampliação de toque de checkbox, radio e switch permanece presa ao próprio controle por posicionamento relativo. Sem essa contenção, o pseudo-elemento absoluto tomava a moldura do diálogo como referência e interceptava cliques de campos e seletores vizinhos no celular.

O estado aberto dos primitivos e a presença usam a mesma autoridade React em popup-presence.tsx. Com movimento reduzido, fechar ou mudar a preferência durante a saída remove o portal fechado sem aguardar eventos de animação; isso libera foco e scroll lock mesmo quando o navegador cancela a saída. forceMount explícito é preservado. Aberturas reduzidas continuam sem animação; display: none é o fallback CSS da saída. O contrato inclui a roda do Mais e o drawer móvel e não usa timer global, observer ou remoção imperativa de nós.

## NEX-034 — Fólio móvel e instrumentos adaptáveis

DEC-020 substitui a fixação do cabeçalho grande da Ficha: sua identidade acompanha a rolagem em todas as larguras. Abertura compacta pertence a `page-hero-parity.css`; `sheet-premium.css` mantém somente a extensão de posição. `useSheetChrome` continua medindo o shell para os destinos do índice, sem reservar altura de uma barra que já rolou.

Os títulos e o recolhimento têm uma linha própria; ações dispõem de uma linha flexível e só ficam ao lado do título quando a largura real do cartão comporta a composição. Isso impede que orçamento, tensão ou ações de inventário comprimam os títulos ou se sobreponham. Vínculos usam fólios próprios, texto multilinha e estado explícito; relação/estado compartilham a linha quando o painel comporta. Atributos usam a sexta célula para o orçamento restante, com radar menor e números estáveis. Equilíbrio agrupa estado, benefício e penalidade em leituras rotuladas, e ambos os instrumentos têm entrada direta e controle de faixa com área de toque preservada.

História tem uma abertura mais breve e campos de escrita com corpo de 16px. Maestria conserva seu modelo de progressão e controles existentes. Biblioteca e fichas offline escolhem colunas pela largura disponível; utilidades reduzem o preenchimento móvel dos painéis. Nenhuma grade estreita deve ganhar colunas à custa de cortar texto ou reduzir os alvos. As rodas da Mesa e do Mais, cálculos e persistência são preservados.

## NEX-035 — Radar como instrumento local

O radar de Atributos usa SVG declarativo com cinco divisões de escala, eixos e valores identificados. Cormorant mantém as siglas; Alegreya apresenta números e amplitude. As cores violeta da Ficha e laranja da Forma de Poder são preservadas. Não há percurso ou animação ambiente: os valores respondem à edição e o cartão conserva seu proprietário de tamanho/material.

A escala começa em 0–5 e se amplia para incluir valores excepcionais, sem recortar a área. Título/descrição acessíveis expõem os valores reais; referências são únicas por instância. O gráfico não observa o tamanho do contêiner nem instala um subsistema de layout de gráficos. Dados derivam somente do objeto de atributos existente, sem persistência ou regra paralela. A comparação de bytes e nós não certifica FPS, INP ou hardware físico.

## NEX-036 — Identidade e instrumentos como registros de leitura

Identidade separa a fundação da personagem de dois registros independentes: convicções/pergunta e vínculos. A dobra narrativa não esconde relações no celular; cada coleção conserva seu controle explícito. Nome, ocupação, origem, marca e núcleo narrativo podem crescer com o texto. Vínculos têm rótulos persistentes, estado escrito e uma costura de cor discreta; nomes/relações longos preservam a largura do fólio. A largura de cada vínculo determina a disposição de relação e estado, inclusive em coleções com vários cartões.

Equilíbrio apresenta estado e valor antes do ajuste, com extremos identificados e indicador contido na faixa. A tensão tem um registro próprio com sua consequência existente; benefícios/penalidades permanecem próximos. Exposição mostra percentual e bases do patamar já calculadas pela rota. Os cartões respeitam a altura do conteúdo, sem esticar instrumentos curtos para preencher a coluna vizinha. A composição conserva botões, fontes, paleta, rodas e autosave, sem nova camada de efeitos.

## NEX-037 — Radar legível e eixo de Equilíbrio

Pedido de Tadeu em 25/10/2026: ampliar o gráfico de Atributos e tornar Equilíbrio coerente com seu conceito. O radar passa a ocupar a largura útil, com proporção quadrada e limite de 26rem, sem a antiga altura de 12rem ou uma coluna lateral estreita. O raio da malha aumenta de 78 para 90 unidades; letras e números crescem com o instrumento. Ficha e Forma de Poder compartilham a geometria, preservando suas cores e escala real.

Equilíbrio é uma posição entre Medo e Conhecimento; zero é Inteireza. A régua graduada distingue faixa comum e extremos, com ponteiro local e leitura de estado. Não usa um preenchimento de recurso nem trata o centro como vida/saúde. A tensão possui marcas nos dois sentidos e mostra sua direção; ao atingir ±4, o callback existente desloca a posição e zera o acúmulo. Benefícios e penalidades vêm da mesma tabela; em zero, as duas frases existentes compõem o efeito de Inteireza, sem chamar a descrição narrativa de penalidade.

A composição permanece estática em repouso, com rótulos e campos acessíveis, alvos de 44px e cores acompanhadas de texto. Dados excepcionais continuam visíveis mesmo quando estão fora da faixa editável da conta; a faixa secundária fica bloqueada nesse caso, sem dar permissão adicional.


## NEX-038 — Densidade e gramática de registros

O [dossiê fornecido por Tadeu](VEU_E_TRAMA.md) aprofunda Véu & Trama como direção sistêmica. Fólios, instrumentos, placas, janelas e pranchas variam conforme a tarefa; não exigem formatos arbitrários nem uma reforma universal de cards. A referência orienta a evolução das áreas existentes, confrontada com seu estado real e com a fila canônica. Preservar símbolos, trio tipográfico, radar ampliado, eixo bipolar, rodas, cabeçalho compacto da Ficha e abertura única do Dashboard.

Nesta rodada, Atributos forma uma faixa de controles e radar em cartões largos; Pontos Vitais distribui quatro recursos sobre uma proteção contínua. No celular, os recursos precedem os atributos e os controles mantêm 44px. O radar conserva raio, viewBox e limite de 26rem. Equilíbrio e Exposição compartilham largura e alinhamento de moldura no desktop aberto; recolher uma seção devolve altura intrínseca. Evitar tanto alturas fixas quanto esticar campos para preencher a caixa vizinha.

Exposição ganha escala de contato de 0 a 100, marcações a cada cinco e indicação do valor real. Patamar, orçamento, limite, PM e recursos de base vêm da rota; não há uma segunda regra de progressão. Os efeitos de Equilíbrio e a tensão mantêm seu modelo. Condições/perícias preservam estados explícitos; História usa fólios de escrita com linhas internas alinhadas e Maestria mantém sua árvore, com rótulos legíveis.

Offline distingue detalhes disponíveis e resumo, em um fólio com recursos num registro único; n/d significa não armazenado, sem fabricar zero. O diretório de Usuários reúne linhas contínuas e deixa acesso/administração em uma trilha própria, com confirmações existentes. Backup separa criação, histórico e importação por composição. Não movimentar a linha de uma pessoa ao operar o seletor de papel. Atributos data-state e aria-live não definem uma família tipográfica: PT Mono fica somente nos metadados explícitos, sem contaminar todo o conteúdo de uma aba por herança.
