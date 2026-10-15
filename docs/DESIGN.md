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
