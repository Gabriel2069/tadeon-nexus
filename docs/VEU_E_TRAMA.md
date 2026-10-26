# TADEON NEXUS
## Dossiê Mestre de Refinamento Visual e Sistêmico

**Direção:** Véu & Trama — Refinamento Sistêmico  
**Natureza:** Auditoria, direção de arte, UI/UX, motion design e engenharia visual  
**Destinatário:** Work responsável pelo desenvolvimento do Tadeon Nexus  
**Repositório:** `Gabriel2069/tadeon-nexus`  
**Referência:** Estado documentado em 25 de outubro de 2026  
**Escopo:** Sistema inteiro, incluindo todas as rotas, telas, componentes, interações e estados.

---

# I. VISÃO EXECUTIVA

## 1. Propósito da evolução

O Tadeon Nexus deve evoluir de um aplicativo com identidade visual elaborada para um **ambiente digital autoral cuja aparência, organização e comportamento nascem de uma mesma linguagem**.

Não basta que cada tela seja bonita. Todas devem demonstrar:

- Continuidade visual entre funções.
- Identidade própria em cada ambiente.
- Organização espacial inteligente.
- Densidade adequada à informação.
- Materiais convincentes e hierarquizados.
- Elementos gráficos exclusivos.
- Controles precisos e expressivos.
- Movimento contextual e fluido.
- Comportamento responsivo realmente adaptativo.
- Desempenho e acessibilidade compatíveis com uma aplicação profissional.

O produto precisa comunicar uma dualidade fundamental:

**A atmosfera de um arquivo mitológico vivo e a precisão de um sistema digital contemporâneo.**

A primeira oferece identidade, estranheza e profundidade; a segunda oferece agilidade, clareza e confiabilidade.

Uma não deve prejudicar a outra.

## 2. Diagnóstico de partida

A revisão documental e de código identificou uma base visual consolidada e oportunidades importantes de aprimoramento.

### Pontos já consolidados

- Identidade Véu & Trama.
- Fundo escuro e leitura em marfim.
- Tipografia editorial e fontes de interface humanistas.
- Símbolos autorais por seção.
- Materiais inspirados em vidro, tinta e tecido.
- Cabeçalhos de anatomia compartilhada.
- Dashboard com abertura artística própria.
- Ficha estruturada como dossiê.
- Radar vetorial de Atributos ampliado.
- Equilíbrio como eixo Medo–Inteireza–Conhecimento.
- Navegação móvel com roda Mais.
- Placa contínua de seleção.
- Mesa com menus circulares e ferramentas espaciais.
- Grafo, árvore e leitura documental no Nexus.
- Sistemas de motion e responsividade em evolução.

Essas decisões são referências aprovadas, não recursos a reconstruir indiscriminadamente.

### Oportunidades prioritárias

1. Refinar a composição geral e reduzir a dependência de cartões convencionais.
2. Aprimorar layouts conforme a função real de cada área.
3. Criar uma gramática visual mais rica para formatos e componentes.
4. Aprofundar a singularidade de ícones, botões, divisórias, controles e superfícies.
5. Aprimorar a coerência física dos materiais.
6. Integrar melhor hover, seleção, pressão, expansão, abertura e fechamento.
7. Melhorar a sensação de continuidade entre páginas e estados.
8. Diferenciar consulta, edição e operação.
9. Consolidar a arquitetura de estilos existente.
10. Verificar resultados visuais e fluidez em contextos reais.

### Limite do diagnóstico

Os registros do projeto documentam numerosas correções e validações recentes. Uma melhoria antiga não deverá ser tratada como defeito atual sem nova verificação.

Antes de implementar, confrontar este dossiê com o estado mais recente de `main`, as decisões vigentes e as capturas reais da aplicação.

---

# II. DIREÇÃO DE ARTE — VÉU & TRAMA

## 3. Identidade fundamental

O Tadeon não deve imitar um painel corporativo escuro com ornamentos medievais aplicados por cima.

Sua identidade deve surgir de princípios presentes em Tessitura do Vazio:

**Fios, tensões, enlaces, malhas, dobras, continuidades, registros, vestígios e relações.**

Esses conceitos orientam metáforas gráficas e espaciais sem criar novas regras ou acontecimentos canônicos.

### Tradução para a interface

| Conceito | Expressão visual |
|---|---|
| Fio | Linha de conexão, trajetória, continuidade |
| Trama | Estrutura de organização, padrões e superfícies |
| Sutura | Encontro ou união entre planos visuais |
| Dobra | Expansão, revelação e transição de painéis |
| Malha | Relações, redes, grafos e estruturas interligadas |
| Tensão | Resposta localizada, direção e mudança de estado |
| Registro | Fólio, placa, inscrição e documento |
| Véu | Profundidade, camadas, ocultamento e revelação |

Essas associações são diretrizes de design, não equivalências obrigatórias de significado.

A aplicação deverá utilizar esses elementos com discrição e intencionalidade.

## 4. Personalidade estética

O conjunto deve equilibrar cinco qualidades.

**Mitológico:** misterioso, significativo, quase ritualístico.

**Editorial:** elegante, articulado e marcado pela composição tipográfica.

**Tátil:** superfícies com espessura, textura, luz e profundidade.

**Tecnológico:** interfaces ágeis, precisas, responsivas e funcionais.

**Autoral:** impossível de confundir facilmente com um tema genérico de dashboard.

Evitar o medievalismo caricatural, com excesso de runas, arabescos, pergaminhos amarelados ou elementos ornamentais sem função.

A expressão deve ser medieval-futurista em sentido material e conceitual, não fantasiosa em todos os detalhes.

---

# III. GRAMÁTICA DE FORMATOS E GEOMETRIAS

## 5. Romper com a monotonia dos retângulos

Uma das mudanças mais importantes é ampliar os formatos visuais disponíveis.

Atualmente, como em muitos sistemas React, diversos conteúdos são naturalmente organizados em cards, listas, painéis e grids.

Essas estruturas são úteis, mas não precisam possuir sempre o mesmo desenho.

Criar uma **gramática formal própria**, com famílias de superfícies coerentes com a função.

## 5.1. Fólios

Destinados a personagens, documentos, registros narrativos e arquivos.

Características possíveis:

- Silhuetas retangulares com assimetrias discretas.
- Cantos com tratamento editorial.
- Uma borda dominante semelhante a uma lombada.
- Índices ou pequenos selos integrados.
- Divisórias delicadas.
- Linhas de costura discretas.
- Tratamento tipográfico mais expressivo.
- Possibilidade de expansão sem romper a leitura.

A assimetria deve decorrer da composição, não de recortes decorativos aleatórios.

Os fólios podem apresentar formatos compactos, regulares e expandidos.

## 5.2. Instrumentos

Destinados a atributos, recursos, medidores e estados.

Características:

- Geometria derivada da função.
- Arcos, escalas, eixos e marcadores.
- Valores com hierarquia clara.
- Controles integrados ao instrumento.
- Indicadores posicionados de maneira inteligível.
- Feedback localizado.
- Menor dependência de caixas externas.

Um recurso pode assumir a forma de um arco funcional; Equilíbrio, a de uma régua bipolar; Atributos, a de um gráfico vetorial.

A ornamentação deve melhorar a compreensão da mecânica.

## 5.3. Placas

Destinadas a seleção, comandos e operações.

Características:

- Geometria compacta.
- Profundidade discreta.
- Bordas definidas.
- Continuidade entre opções.
- Indicadores deslizantes.
- Estados táteis bem diferenciados.

A placa de seleção já aprovada deve orientar o comportamento.

## 5.4. Janelas e painéis flutuantes

Destinados a ferramentas contextuais e edição.

Características:

- Superfícies com sensação de espessura.
- Reflexos localizados.
- Borda de luz fina.
- Sombra de contato controlada.
- Cabeçalho reconhecível.
- Fechamento e expansão coerentes.
- Origem espacial identificável.

Uma janela não deve parecer apenas um card maior.

## 5.5. Pranchas

Destinadas a mapas, grafos, árvores e documentos de visualização.

Características:

- Superfície central dominante.
- Instrumentos distribuídos ao redor.
- Controles sobrepostos apenas quando necessários.
- Ajustes de enquadramento.
- Painéis contextuais retráteis.
- Espaço preservado para o conteúdo.

## 5.6. Registros contínuos

Destinados a métricas e informações relacionadas.

Em vez de criar várias caixas, agrupar os dados em uma única superfície com divisórias internas.

Aplicações:

- Indicadores do Dashboard.
- Recursos da Ficha.
- Resumos de campanha.
- Conjuntos de condições.
- Informações rápidas de personagens.

## 5.7. Regras para formatos exclusivos

A identidade não deve depender de recortar todos os cartões em hexágonos, octógonos ou polígonos.

Criar variações a partir de:

- Recorte sutil de um canto.
- Aresta em desnível.
- Lombada lateral.
- Arco complementar.
- Selo parcialmente integrado.
- Linha interrompida por símbolo.
- Superfícies encaixadas por uma costura.
- Ornamentação assimétrica localizada.

A forma externa continua subordinada ao espaço útil, à legibilidade, à responsividade e à facilidade de interação.

---

# IV. SISTEMA DE MATERIAIS E PROFUNDIDADE

## 6. Materiais como linguagem funcional

Organizar a aparência a partir de quatro materiais principais.

### 6.1. Vazio

Fundo fundamental da aplicação.

Referência: `#080A0E`, preservando os tokens existentes.

Deve oferecer profundidade sem disputar atenção.

Diretrizes:

- Gradientes extremamente controlados.
- Diferenças discretas de luminância.
- Filamentos em regiões específicas.
- Luz localizada.
- Ausência de padrões repetitivos muito visíveis.
- Nenhum campo de estrelas importado da identidade do NexOS.
- Evitar animação permanente do fundo.

### 6.2. Tinta

Material principal de leitura.

Aplicações:

- Textos.
- Fichas.
- Documentos.
- Tabelas.
- Formulários.
- Registros extensos.

Priorizar estabilidade, nitidez e contraste.

Referências de superfície do sistema existente incluem `#12151A` e `#22262D`.

Não aplicar transparências fortes a campos com textos longos.

### 6.3. Véu

Material atmosférico.

Aplicações:

- Fundo de cabeçalhos.
- Passagens entre superfícies.
- Filamentos decorativos.
- Regiões de descoberta.
- Elementos gráficos de transição.

O Véu pode sugerir sobreposição e profundidade, mas nunca dificultar a leitura.

### 6.4. Vidro / Liquid Fabric

Material destinado principalmente às interfaces transitórias.

Aplicações:

- Menus.
- Barras flutuantes.
- Popovers.
- Seletores.
- Painéis contextuais.
- Dock e controles de navegação.

Construir a aparência com:

- Transparência moderada.
- Bordas iluminadas.
- Reflexo interno.
- Sombra de assentamento.
- Camadas de luminosidade.
- Diferença entre face e arestas.
- Resposta localizada ao foco ou ponteiro.

Não simular refração real por meio de efeitos excessivamente caros.

O produto pode possuir uma linguagem inspirada em Liquid Glass sem alegar reproduzir seu sistema nativo de renderização.

## 7. Quinta assinatura: metal e costura

Tratar elementos metálicos como detalhes estruturais, não como material predominante.

Aplicações:

- Arestas.
- Conectores.
- Marcadores.
- Índices.
- Componentes de instrumentos.
- Sinais de seleção.
- Extremidades de linhas.

A costura pode aparecer como uma união discreta entre painéis, conectando superfícies que compartilham informação.

## 8. Três níveis de profundidade

Definir uma hierarquia material constante:

**Plano 0 — Fundo:** Vazio, textura e atmosfera.

**Plano 1 — Conteúdo:** Tinta, documentos, cards e registros.

**Plano 2 — Instrumentos:** controles elevados, menus, painéis e superfícies transitórias.

Overlays e dialogs poderão ocupar uma camada modal específica.

Evitar o efeito de colocar vidro sobre vidro ou criar três molduras ao redor de uma mesma informação.

## 9. Iluminação

A luz deve explicar relações de profundidade.

Padrões desejáveis:

- Luz superior em superfícies elevadas.
- Reflexo lateral discreto em vidro.
- Sombra interna em painéis encaixados.
- Sombra de contato em ferramentas flutuantes.
- Halo localizado no símbolo ativo.
- Intensificação cromática durante a interação.

Evitar halos intensos em todos os elementos.

**A sofisticação deve estar nas diferenças delicadas de luz e material.**

---

# V. TIPOGRAFIA E COMPOSIÇÃO EDITORIAL

## 10. Preservação das famílias aprovadas

O sistema atual adota:

- **Cormorant Garamond:** linguagem editorial.
- **Alegreya Sans:** interface humanista.
- **PT Mono:** índices, identificadores e metadados técnicos.

Não reintroduzir Inter como nova direção tipográfica nem substituir fontes aprovadas por alternativas genéricas.

## 11. Hierarquia

A composição deve diferenciar:

**Título editorial:** identificação de capítulos, seções e momentos de maior relevância.

**Título funcional:** ferramentas, painéis e operações.

**Corpo:** descrições, regras, dados narrativos e conteúdos.

**Metadados:** códigos, datas, estados e informações auxiliares.

**Métricas:** valores, recursos, progressão e outras informações quantitativas.

A escolha da família, escala, peso e espaçamento deve refletir a função.

## 12. Tratamentos tipográficos

Aprofundar:

- Contraste de tamanhos.
- Ritmo de margens.
- Espaçamento de letras.
- Alinhamentos ópticos.
- Tratamento de numerais.
- Equilíbrio entre títulos e descrições.
- Separação de labels e valores.
- Quebra de linhas.
- Largura confortável para leitura.
- Aplicação cuidadosa de versaletes e caixa alta.

Evitar usar texto excessivamente pequeno para compensar falta de espaço.

Nenhum título deve perder caracteres importantes por truncamento desnecessário.

## 13. Personalidade por função

O Dashboard admite títulos mais expressivos.

A Ficha pode explorar a composição de um dossiê.

O Nexus deve privilegiar a leitura de documentos.

A Mesa precisa de labels compactos, estáveis e rapidamente identificáveis.

O Painel do Mestre exige clareza operacional.

A mesma família tipográfica não precisa assumir a mesma escala em todos os ambientes.

---

# VI. ICONOGRAFIA E SIMBOLOGIA

## 14. Sistema de ícones autorais

Uma melhoria indispensável é revisar a qualidade visual e a coerência de todos os ícones.

O Tadeon não deve depender exclusivamente da aparência genérica de uma biblioteca de pictogramas.

Entretanto, também não é necessário redesenhar símbolos funcionais cujo significado já está claro.

## 14.1. Três categorias

**Símbolos de seção:** identidade autoral das grandes áreas. Preservar os símbolos oficiais.

**Ícones funcionais:** ações como salvar, editar, duplicar, filtrar, mover e excluir. Manter reconhecimento imediato.

**Símbolos de instrumento:** elementos característicos de mecânicas, estados, recursos e sistemas próprios do TdV.

Cada categoria deverá compartilhar critérios geométricos sem perder suas diferenças de função.

## 14.2. Revisão geométrica

Conferir:

- Espessura dos traços.
- Proporções.
- Escala óptica.
- Centralização.
- Curvas e extremidades.
- Simetria quando aplicável.
- Densidade de detalhes.
- Leitura em tamanhos reduzidos.
- Consistência entre estados.
- Correspondência entre ícone e função.

Ícones visualmente muito finos podem desaparecer sobre materiais escuros.

Ícones excessivamente detalhados não devem ser utilizados em controles minúsculos.

## 14.3. Tratamento cromático

O ícone de uma seção poderá receber seu tom local em hover, foco e seleção.

O fundo do botão não precisa mudar inteiramente de cor.

Preferir intensificação localizada do símbolo, acompanhada de contorno ou luz discreta.

## 14.4. Estados animados

Desenvolver animações semânticas e breves.

Exemplos:

- Expandir: seta acompanha a abertura do painel.
- Salvar: ícone representa processamento e conclusão.
- Vincular: linha curta conecta dois pontos.
- Filtrar: ajuste discreto do estado do controle.
- Alternar visualização: indicação de continuidade entre modos.
- Reenquadrar: movimento reduzido de orientação, sem girar toda a interface.
- Abrir roda: distribuição orbital dos instrumentos, com etiquetas estáveis.

Não animar ícones continuamente sem necessidade.

## 14.5. Favicon e marcas

Preservar os símbolos oficiais do projeto.

Os favicons específicos das áreas devem manter coerência geométrica e leitura em resoluções pequenas.

Não criar novas interpretações da identidade do Tadeon sem aprovação explícita.

---

# VII. BOTÕES E CONTROLES — SISTEMA DE INTERAÇÃO

## 15. Botões com personalidade e hierarquia

O padrão de botões já aprovado deve ser preservado e aprofundado, não substituído indiscriminadamente.

Organizar os tratamentos em famílias.

### Botão primário

Uma ação dominante em determinada região.

Características:

- Material bem definido.
- Contraste elevado.
- Borda ou detalhe autoral.
- Resposta tátil curta.
- Foco visível.
- Loading e sucesso sem alterar a geometria.

### Botão secundário

Ações complementares.

Características:

- Aparência menos intensa.
- Superfície discreta.
- Contorno funcional.
- Hover localizado.
- Pressão coerente com o primário.

### Botão instrumental

Controles compactos de operações.

Exemplos: incrementar, diminuir, mudar câmera, ativar grade e ajustar propriedades.

Características:

- Alvos confortáveis.
- Geometria estável.
- Ícone centralizado.
- Estado ativo inequívoco.
- Não deslocar controles vizinhos.

### Botão editorial

Ações de navegação em documentos, personagens ou registros.

Pode apresentar linha, símbolo e texto em uma composição mais expressiva.

### Botão orbital

Ações de menus circulares.

Manter a roda aprovada com ícones próprios, etiquetas legíveis e geometria funcional.

## 16. Anatomia recomendada

A construção deve considerar:

1. Superfície de base.
2. Aresta ou contorno.
3. Conteúdo.
4. Estado de interação.
5. Indicador de seleção, quando aplicável.
6. Feedback funcional.

Essas partes não exigem seis elementos DOM. Devem ser implementadas com a estrutura mínima necessária.

## 17. Hover

O hover precisa oferecer uma resposta visual sofisticada e claramente relacionada à ação.

### Navegação

- Intensificar o símbolo da seção.
- Revelar um halo curto e localizado.
- Aumentar discretamente a definição do contorno.
- Preservar o texto e a posição do item.
- Evitar deslocamentos grandes.

### Cards

- Intensificar a aresta mais próxima.
- Realçar um filamento ou detalhe do material.
- Revelar ações secundárias quando apropriado.
- Nunca movimentar texto ou causar mudança de layout.
- Não aplicar transformações que prejudiquem a leitura.

### Fólios

- Intensificar a lombada ou marcador editorial.
- Dar maior definição ao título e ao ponto de entrada.
- Evitar inclinação tridimensional de documentos extensos.

### Instrumentos

- Destacar apenas a parte interativa.
- Exibir ajuda ou leitura complementar quando necessária.
- Não modificar o valor antes da ação efetiva.

### Grafos

- Evidenciar nós e vínculos relacionados.
- Reduzir moderadamente a ênfase das relações externas.
- Não executar redistribuição do grafo apenas por hover.

### Mesa

- Destacar a peça ou objeto sob o cursor.
- Mostrar informações contextuais breves.
- Não alterar a posição visual real do objeto sem uma ação de edição.

## 18. Pressão

O clique deve possuir sensação tátil sem parecer um efeito de brinquedo.

Preferir:

- Compressão óptica mínima.
- Alteração rápida da iluminação.
- Pequeno deslocamento da camada decorativa.
- Retorno controlado ao estado anterior.

Manter texto, ícones e coordenadas estáveis quando a interação depender de precisão.

## 19. Seleção

A seleção não deve ser confundida com hover.

Usar:

- Placa contínua aprovada.
- Cor ou contorno de seção.
- Estado textual quando necessário.
- Posição claramente determinada.

A placa deve viajar até a nova opção de maneira fluida, sem deslocar os controles.

Não reintroduzir fundos individuais concorrentes.

## 20. Estados obrigatórios

Cada componente relevante deverá definir:

- Padrão.
- Hover.
- Focus-visible.
- Pressionado.
- Selecionado.
- Desabilitado.
- Carregando.
- Sucesso.
- Erro.

Nem todos os componentes precisam demonstrar os nove estados visualmente, mas os estados aplicáveis devem ser previstos e testados.

---

# VIII. ANIMAÇÕES, MOTION E TRANSIÇÕES

## 21. Princípio de movimento

A interface deve parecer fisicamente coerente.

Os movimentos precisam preservar a sensação de que ferramentas, painéis e conteúdos ocupam um espaço contínuo.

O objetivo não é multiplicar animações.

É fazer com que as interações possuam:

- Origem reconhecível.
- Percurso consistente.
- Duração proporcional.
- Direção compreensível.
- Finalização precisa.
- Resposta imediata ao usuário.

## 22. Gramática temporal

Utilizar os intervalos documentados como ponto de partida, ajustando por contexto.

| Movimento | Intervalo orientativo |
|---|---|
| Hover e pressão | 120–180 ms |
| Expansão de controle | 180–280 ms |
| Continuidade entre contextos | 220–320 ms |
| Abertura de popup ancorado existente | Aproximadamente 210 ms |
| Saída de popup ancorado existente | Aproximadamente 140 ms |

Não transformar esses números em durações obrigatórias para todos os casos.

Operações frequentes devem responder rapidamente.

## 23. Tipos de movimento

### 23.1. Desdobramento

Aplicado a seções expansíveis, editores e painéis.

A superfície deve revelar conteúdo de forma contínua.

Evitar que a caixa simplesmente apareça com sua altura final e desloque abruptamente tudo ao redor.

A seta ou indicador de expansão terá animação própria.

### 23.2. Sutura

Uma transição curta na qual dois estados parecem conectar-se.

Aplicações possíveis:

- Troca de aba.
- Navegação entre contextos relacionados.
- Seleção de elementos.
- Transferência visual entre documento e grafo.

Não utilizar linhas animadas como ornamento em toda transição.

### 23.3. Deslizamento

A placa de seleção, indicadores e pequenos painéis poderão percorrer trajetórias curtas.

Evitar efeitos elásticos excessivos.

### 23.4. Revelação

Elementos secundários surgem com opacidade e pequeno deslocamento.

O conteúdo principal não deve permanecer aguardando cascatas decorativas.

### 23.5. Movimento orbital

Reservado aos controles circulares e a instrumentos cuja geometria justifique distribuição radial.

Etiquetas devem permanecer estáveis.

Não girar textos ou alvos.

### 23.6. Continuidade espacial

Quando um objeto abre um editor ou inspetor, o usuário deve perceber a relação entre origem e destino.

Essa continuidade pode ser expressa por posição, escala discreta, iluminação ou persistência de um elemento visual.

Não exige necessariamente uma animação complexa de transformação de todo o componente.

## 24. Menus e popups

Aprimorar:

- Origem ancorada ao gatilho.
- Entrada e saída coerentes.
- Colisão com bordas da viewport.
- Adaptação ao teclado virtual.
- Ausência de saltos na mudança de tamanho.
- Retorno de foco.
- Continuidade quando reabertos rapidamente.
- Ausência de captura de clique após fechamento.

Preservar Radix e os proprietários de geometria existentes.

## 25. Transições entre páginas

Investigar como preservar a continuidade do shell.

A navegação geral deve manter posição e estabilidade; a área de conteúdo realiza a transição necessária.

Não animar toda a sidebar a cada troca de rota.

O usuário precisa reconhecer imediatamente:

- De onde saiu.
- Para onde foi.
- Qual área está ativa.
- Qual contexto foi preservado.

## 26. Animação da interface de jogo

Durante sessões:

- Atualizações de valores precisam ser imediatas.
- Instrumentos refletem mudanças sem atrasar o usuário.
- Condições podem receber sinalização curta.
- Mudanças importantes podem possuir uma manifestação visual breve.
- A interface deve permanecer operacional enquanto o feedback ocorre.

Nunca atrasar uma ação mecânica para executar uma animação.

## 27. Motion reduzido

Respeitar `prefers-reduced-motion`.

Ao desativar movimento:

- A posição final deve aparecer imediatamente.
- Os estados continuam distinguíveis.
- Nenhuma informação desaparece.
- Foco e interação permanecem funcionais.
- Fechamentos não deixam overlays invisíveis bloqueando a aplicação.

---

# IX. SISTEMA DE ELEMENTOS GRÁFICOS

## 28. Desenvolver uma biblioteca ornamental autoral

Criar um conjunto controlado de elementos reutilizáveis.

### Filamentos

Linhas finas inspiradas em fios tensionados.

Usos:

- Conexões.
- Bordas.
- Acompanhamento de divisórias.
- Relações entre registros.

### Cruzamentos

Pequenos pontos de encontro entre linhas.

Usos:

- Interseção de seções.
- Marcadores.
- Nós conceituais.
- Separadores.

### Selos

Elementos gráficos de maior relevância.

Usos:

- Identificação de capítulos.
- Registros oficiais.
- Documentos especiais.
- Estados ou categorias apropriadas.

Preservar os símbolos oficiais.

### Arcos

Geometrias parciais utilizadas em instrumentos, marcadores e composições.

### Lombadas

Tratamentos laterais próprios de arquivos e fólios.

### Suturas

Conexões visuais curtas entre materiais ou regiões relacionadas.

### Tramas

Padrões vetoriais discretos de fundo ou superfície.

### Divisórias editoriais

Linhas e composições que separam informações sem criar novos cartões.

## 29. Regras de ornamentação

Definir três intensidades.

**Baixa:** controles frequentes, campos, listas e ferramentas operacionais.

**Média:** cards, painéis, registros e seções comuns.

**Alta:** aberturas, grandes composições, documentos especiais e momentos de descoberta.

A intensidade não deve aumentar apenas porque há mais espaço disponível.

A ornamentação precisa possuir função compositiva.

## 30. Fundos

Revisar os fundos para que cada seção tenha uma atmosfera própria.

Manter o mesmo material de base, mas variar:

- Distribuição de luz.
- Direção de linhas.
- Presença dos símbolos.
- Profundidade dos elementos.
- Tom cromático.
- Densidade de trama.

Nunca utilizar padrões que causem problemas de leitura.

Evitar fundos animados permanentemente ou efeitos de parallax que disputem recursos com a Mesa.

---

# X. COMPOSIÇÃO, LAYOUT E RESPONSIVIDADE

## 31. Abandonar o modelo universal de cartões empilhados

A responsividade não deve consistir em transformar uma interface de três colunas em uma lista de grandes cartões verticais.

Cada página precisa reorganizar seus elementos conforme a função.

Exemplos:

- Dados curtos podem compartilhar linhas.
- Métricas podem ser dispostas em pares ou trios.
- Controles pequenos podem formar grupos horizontais.
- Textos longos precisam de largura adequada.
- Instrumentos visuais precisam preservar proporções.
- Mapas e grafos devem receber prioridade espacial.

## 32. Sistema de densidade

Definir três comportamentos contextuais.

### Consulta

Priorizar leitura, estabilidade e clareza.

### Edição

Priorizar campos, propriedades e relações entre entradas.

### Operação

Priorizar valores, controles e informações imediatas.

Não criar obrigatoriamente um seletor de modo em todas as páginas. A densidade pode responder ao contexto já existente.

## 33. Layouts por largura útil

### Celular compacto

Referências de validação: 320 e 390 px.

- Evitar elementos permanentemente grandes.
- Reduzir ornamentos de baixa utilidade.
- Distribuir métricas em pequenos conjuntos.
- Preservar alvos de toque.
- Usar painéis contextuais recolhíveis.
- Evitar múltiplas barras empilhadas.
- Manter a navegação acessível.
- Evitar rolagem horizontal da página.

### Tablet

Referência de validação: aproximadamente 820 px.

Não tratar tablet como desktop comprimido ou celular ampliado.

Aproveitar:

- Pares de painéis.
- Inspetores laterais.
- Distribuições híbridas.
- Áreas de leitura maiores.
- Instrumentos contextuais.

### Desktop

Referência de validação: 1440 px.

- Explorar assimetria editorial.
- Usar regiões de diferentes proporções.
- Preservar espaço livre intencional.
- Diferenciar conteúdo primário e secundário.
- Evitar cards excessivamente largos.

### Monitores amplos

Conferir também larguras maiores.

Não esticar textos ou controles indiscriminadamente.

A largura adicional deve servir para:

- Melhor organização.
- Prévia simultânea.
- Painéis auxiliares.
- Leitura comparativa.
- Ampliação real de mapas e grafos.

## 34. Regras técnicas

Usar decisões baseadas na largura real dos componentes, não apenas na viewport.

Priorizar container queries quando adequadas.

Testar:

- Textos longos.
- Traduções ou rótulos extensos.
- Zoom.
- Teclado virtual.
- Orientação horizontal.
- Safe areas.
- Conteúdo dinâmico.
- Painéis abertos simultaneamente.

A página deve adaptar a composição sem perder sua identidade.

---

# XI. AUDITORIA E EVOLUÇÃO POR ÁREA

## 35. Dashboard — Arquivo de continuidade

### Direção

Um arquivo vivo de personagens, não uma página convencional de métricas.

### Melhorias

**Abertura:** refinar relações entre arte, símbolo, título, descrição e ação. Preservar a exceção de não possuir segundo hero.

**Métricas:** manter um registro único, com três valores relacionados e divisórias integradas.

**Arquivo:** explorar composições editoriais mais sofisticadas para os fólios.

**Personagens:** ampliar o contraste entre nome, ocupação, proprietário e demais metadados.

**Ações:** posicionar ações conforme a relação com cada registro, reduzindo botões desnecessariamente dominantes.

**Hover:** utilizar iluminação da lombada, realce do título e resposta localizada.

**Responsividade:** manter densidade e aproveitamento horizontal em dispositivos pequenos.

**Atmosfera:** reforçar a ideia de arquivo, inscrição e continuidade, sem inventar dados ou personagens.

### Resultado desejado

Uma tela imediatamente reconhecível, na qual os personagens pareçam registros pertencentes ao universo do Tadeon.

---

## 36. Ficha — Dossiê de personagem

### Direção

Um documento vivo, com leitura editorial e instrumentos mecânicos precisos.

### Melhorias gerais

- Refinar a distribuição dos blocos.
- Diferenciar leitura narrativa de manipulação mecânica.
- Reduzir molduras redundantes.
- Dar hierarquia às informações principais.
- Adaptar melhor os conteúdos extensos.
- Preservar o cabeçalho compacto e não fixar uma abertura exagerada.
- Aprimorar transições entre as abas.
- Integrar melhor estados de salvamento.

### Identidade

Criar uma composição clara entre:

- Nome.
- Origem.
- Ofício ou ocupação.
- Marca.
- Convicções.
- Limites e núcleo narrativo.
- Vínculos.

A hierarquia deverá respeitar os campos e conceitos efetivamente existentes.

A apresentação não deve transformar todos os elementos em campos visualmente equivalentes.

**Vínculos:** tratar como registros próprios, com divisórias, rótulos persistentes e organização relacional.

Permitir descrições extensas e múltiplos registros.

### Atributos

Preservar o radar SVG ampliado.

Refinar a relação visual entre:

- Radar.
- Valores.
- Distribuição.
- Orçamento.
- Controles.

A ampliação do radar não pode causar compressão indevida dos demais instrumentos.

Evitar diminuir o gráfico para preencher uma coluna estreita.

### Recursos

Aprofundar a estética dos arcos e controles.

O valor atual deve dominar a leitura; modificadores e máximos precisam continuar acessíveis.

O material gráfico nunca pode comunicar um número diferente do dado real.

### Equilíbrio

Preservar o eixo:

**Medo ← Inteireza → Conhecimento**

O zero representa Inteireza.

A Tensão deve manter sua leitura direcional.

Refinar visualmente os extremos, centro, marcações, benefícios e penalidades, sem retornar ao modelo de barra de recurso.

### Exposição

Tornar mais evidente a relação entre:

- Valor.
- Patamar.
- Progressão.
- Consequências existentes.

Separar apresentação mecânica de descrição narrativa.

### Condições

Criar leitura mais clara de condições ativas, duração ou estado quando esses dados existirem.

A aparência deve demonstrar relevância sem transformar todas as condições em alertas intensos.

### Progressão

Explorar visualização espacial dos caminhos e suas conexões.

Refinar estados disponíveis, adquiridos, bloqueados e selecionados.

### Inventário

Melhorar a organização por categorias e relações entre elementos.

Evitar cartões grandes para itens simples.

### História e descrição

Priorizar tipografia, largura de leitura e ritmo editorial.

Evitar adornos que prejudiquem a escrita contínua.

---

## 37. Mesa Nexus — Ambiente espacial

### Direção

O tabuleiro é a superfície dominante. Ferramentas existem para operar sobre ele.

### Melhorias

**Área útil:** ampliar a predominância visual do mapa sempre que possível.

**Instrumentos:** consolidar controles de câmera, edição e seleção em grupos coerentes.

**Menus circulares:** preservar a geometria orbital aprovada, refinando iluminação, transições e colisões.

**Painéis:** tornar o inspetor contextual mais adaptável.

**Ferramentas de desenho:** mostrar controles conforme a ferramenta ativa.

**Camadas:** melhorar hierarquia visual de elementos da cena.

**Modelos e formações:** priorizar prévias, enquadramento e clareza de manipulação.

**Seleção coletiva:** diferenciar visualmente operações aplicáveis a múltiplos objetos.

**Modo de jogo:** reduzir elementos de edição que não precisam estar permanentemente visíveis.

**Câmera:** preservar orientação e continuidade ao abrir painéis ou alterar projeção.

**Celular:** permitir composição operacional eficiente sem ocultar excessivamente o tabuleiro.

### Motion

Movimentos da interface não podem alterar o estado do mapa.

Feedback visual deve ser separado da geometria real dos objetos.

Preservar perfis de desempenho e renderização sob demanda.

---

## 38. Nexus — Conhecimento conectado

### Direção

O Nexus deve ser a expressão visual mais clara da ideia de fios e relações.

### Grafo

- Refinar distinção entre nós.
- Melhorar contraste entre relações.
- Aplicar realce contextual à seleção.
- Reduzir ruído em redes densas.
- Aprimorar agrupamento e distribuição.
- Melhorar comportamento de zoom e enquadramento.
- Preservar o posicionamento do usuário.
- Evitar animações ambientais pesadas.

### Árvore

- Melhorar hierarquia.
- Tornar relações de parentesco e organização mais claras.
- Refinar expansão e recolhimento.
- Preservar legibilidade em estruturas profundas.

### Documentos

- Refinar a composição editorial.
- Melhorar navegação entre páginas.
- Aperfeiçoar abas de leitura.
- Preservar largura confortável.
- Integrar referências e relações sem fragmentar excessivamente o conteúdo.

### Inspetor

Exibir informações de nós, vínculos e propriedades em uma área contextual bem organizada.

Não reduzir desnecessariamente a superfície do grafo.

### Integração

A transição entre grafo, árvore, lista e documento deve preservar o contexto sempre que tecnicamente possível.

---

## 39. Biblioteca — Acervo editorial

### Direção

Um acervo documental que combina organização profissional e atmosfera mitológica.

### Melhorias

- Refinar cartões como fólios e volumes.
- Diferenciar títulos, categorias e metadados.
- Melhorar miniaturas e prévias.
- Criar hierarquia mais clara dos filtros.
- Preservar modos de cartões, tabela e visualização compacta.
- Aprimorar ações em lote.
- Desenvolver estados de seleção mais elegantes.
- Revisar densidade em larguras intermediárias.
- Melhorar a navegação entre coleções e documentos.

O conceito de lombadas e volumes pode ser aplicado em contextos editoriais sem comprometer a eficiência da visualização compacta.

---

## 40. Painel do Mestre — Central de condução

### Direção

Uma central de direção narrativa e operacional.

Diferenciar três contextos:

**Preparação:** criação e planejamento.

**Condução:** informações e ações durante sessões.

**Consulta:** referências, anotações e instrumentos auxiliares.

Esses contextos podem utilizar os mecanismos de navegação já existentes.

### Melhorias

- Refinar o resumo da campanha.
- Melhorar a hierarquia dos instrumentos.
- Criar diferenciação visual entre NPCs, ameaças e pistas.
- Reduzir repetição de formulários.
- Melhorar agrupamento de cálculos e referências.
- Tornar o Caderno mais confortável.
- Otimizar a alternância entre ferramentas.
- Revisar proporção entre painéis e conteúdo.
- Ampliar a clareza de seleção e edição.

O Painel do Mestre deve equilibrar densidade elevada e rápida localização de informações.

---

## 41. Usuários, Backup e Offline

### Usuários

Priorizar confiança, clareza e identificação dos cargos.

- Revisar linhas de usuário.
- Diferenciar privilégios e estados.
- Melhorar menus administrativos.
- Refinar ações críticas.
- Reduzir ruído de controles repetidos.

### Backup

Organizar visualmente:

- Criação de cópia.
- Histórico.
- Diagnóstico.
- Importação.
- Restauração.
- Erros e avisos.

A consequência de cada ação deve ser evidente.

Não utilizar animações que dissimulem processamento ou resultados reais.

### Offline

Aprimorar a distinção entre:

- Conteúdo disponível.
- Conteúdo não armazenado.
- Limitações funcionais.
- Estado de atualização.
- Ações de recuperação.

Preservar a proteção dos dados por conta e cargo.

---

## 42. Login e entrada

A tela de autenticação deve oferecer a primeira manifestação visual da identidade do Tadeon.

### Melhorias

- Refinar o equilíbrio entre manifesto visual e formulário.
- Dar mais personalidade às superfícies.
- Melhorar luz e profundidade.
- Ajustar escalas tipográficas.
- Refinar estados de foco, erro e carregamento.
- Aprimorar o layout compacto.
- Preservar acessibilidade e segurança.

O login não deve sacrificar clareza em nome de uma composição artística.

---

# XII. REFERÊNCIAS DE DESIGN E TRANSFERÊNCIA

## 43. Sistemas a estudar

As referências devem orientar decisões e não fornecer uma identidade para copiar.

| Referência | Princípio a aproveitar |
|---|---|
| Linear | Clareza, densidade e hierarquia operacional |
| Apple Human Interface Guidelines | Materiais, profundidade, movimento e continuidade |
| Raycast | Agilidade, comandos e navegação |
| Obsidian | Grafos, relações e documentos conectados |
| Figma | Canvas central e inspetores contextuais |
| Framer | Motion contextual e edição visual |
| Craft | Documentos e composição editorial |
| Owlbear Rodeo | Ferramentas próximas ao mapa |
| Foundry VTT | Organização de propriedades e ferramentas de cena |
| TaleSpire | Espacialidade e composição tridimensional |
| Stripe Press | Refinamento editorial e apresentação de acervos |

Também estudar grandes experiências editoriais, interfaces de portfólios e projetos reconhecidos pela qualidade de interação.

Em cada referência, investigar:

1. Qual problema visual ou funcional foi resolvido?
2. Que princípio pode ser transferido?
3. Como esse princípio se adapta ao Tadeon?
4. Como evitar imitação estética?
5. Como implementar sem elevar excessivamente o custo de renderização?

A identidade final deve permanecer autoral.

---

# XIII. ARQUITETURA DE FRONTEND E ENGENHARIA VISUAL

## 44. Preservar o sistema existente

Antes da implementação, consultar obrigatoriamente:

- `AGENTS.md`
- `docs/DESIGN.md`
- `docs/FOUNDATION.md`
- `docs/PROJECT_MAP.md`
- `docs/WORKPLAN.md`
- `docs/ai/00_ESTADO_ATUAL.md`
- `docs/project-continuity.json`
- `docs/style-architecture.json`

A fila de desenvolvimento deve continuar exclusivamente no registro canônico do projeto.

Não criar uma segunda fila independente.

## 45. Eliminar conflitos históricos

A arquitetura já foi consolidada, mas a documentação reconhece declarações CSS concorrentes remanescentes.

Cada alteração deve:

1. Identificar o componente responsável.
2. Localizar todas as regras que influenciam suas propriedades.
3. Determinar a autoridade correta.
4. Aplicar a melhoria no módulo responsável.
5. Remover concorrências obsoletas com validação.
6. Confirmar estados e breakpoints.
7. Evitar novas sobreposições.

Não adicionar uma camada de CSS com nomes como `final`, `repair` ou `polish` para dominar as anteriores.

Não introduzir novos `!important` como solução normal.

## 46. Organização de componentes

Separar responsabilidades quando isso trouxer benefício concreto.

Distinguir:

- Estrutura.
- Geometria.
- Aparência material.
- Estado.
- Interação.
- Movimento.
- Persistência.
- Acessibilidade.

Não reescrever componentes grandes apenas por sua quantidade de linhas.

Priorizar extrações que reduzam acoplamento e facilitem testes.

## 47. Performance

Investigar particularmente:

- Trabalho de layout.
- Renderizações React desnecessárias.
- Animações concorrentes.
- Observadores redundantes.
- Operações excessivas por ponteiro ou scroll.
- Blur e filtros em superfícies extensas.
- Atualizações do grafo.
- Renderização Pixi.
- Consumo de memória na Mesa.
- Componentes ocultos que continuam executando trabalho.

Priorizar movimento em propriedades adequadas, como `transform` e `opacity`, quando não comprometer a geometria funcional.

Evitar filtros caros sobre telas inteiras.

Não afirmar ganhos de desempenho sem medições comparáveis.

## 48. Acessibilidade

Preservar:

- Navegação por teclado.
- Foco visível.
- Retorno de foco.
- Estados sem dependência exclusiva de cor.
- Leitura por tecnologias assistivas.
- Redução de movimento.
- Redução de transparência quando apropriado.
- Contraste adequado.
- Alvos de toque confortáveis.
- Operações alternativas ao arrastar quando necessárias.
- Comportamento previsível de dialogs.

A aparência sofisticada deve coexistir com acessibilidade técnica.

---

# XIV. PROCESSO DE REFINAMENTO VISUAL

## 49. Etapa 1 — Auditoria visual atualizada

Capturar e revisar todas as rotas.

Abranger:

- Desktop.
- Tablet.
- Celular.
- Conteúdo vazio.
- Conteúdo completo.
- Dados extensos.
- Edição.
- Seleção.
- Popups.
- Erros.
- Loading.
- Movimento reduzido.

Registrar problemas observáveis, não apenas impressões subjetivas.

Classificar cada achado por:

**Impacto visual, impacto funcional, frequência, custo e risco.**

## 50. Etapa 2 — Sistema de materiais e componentes

Refinar:

- Tokens.
- Tipografia.
- Superfícies.
- Fólios.
- Painéis.
- Botões.
- Seletores.
- Ícones.
- Divisórias.
- Campos.
- Ferramentas.
- Estados.
- Motion.

Criar uma matriz de consistência compartilhada.

O objetivo é aprimorar o sistema sem eliminar as diferenças entre áreas.

## 51. Etapa 3 — Composição especializada

Revisar as páginas por contexto.

Priorizar:

1. Ficha.
2. Mesa.
3. Nexus.
4. Painel do Mestre.
5. Dashboard.
6. Biblioteca.
7. Utilidades e Login.

Essa ordem é uma proposta de impacto, sujeita à auditoria real.

## 52. Etapa 4 — Singularidade visual

Aplicar progressivamente:

- Ornamentação autoral.
- Geometrias exclusivas.
- Acabamento de materiais.
- Selos.
- Filamentos.
- Arcos.
- Suturas.
- Lombadas.
- Divisórias.
- Elementos gráficos funcionais.

Não inserir todos os elementos em todas as páginas.

## 53. Etapa 5 — Motion e fluidez

Revisar todos os estados interativos.

Testar:

- Hover.
- Pressão.
- Foco.
- Seleção.
- Abertura.
- Fechamento.
- Expansão.
- Recolhimento.
- Navegação.
- Salvamento.
- Erros.
- Troca de modo.
- Interações rápidas repetidas.

## 54. Etapa 6 — Validação final

Executar verificações automatizadas e revisão visual.

Utilizar o laboratório de auditoria responsiva já existente quando aplicável.

Testar larguras de referência como:

- 320 px.
- 390 px.
- 820 px.
- 1440 px.
- Monitores amplos.

Também verificar texto ampliado, teclado virtual, gestos, zoom, orientação, contraste e movimento reduzido.

Medir desempenho em dispositivos reais antes de declarar a fluidez final validada.

---

# XV. CRITÉRIOS DE QUALIDADE E ACEITAÇÃO

## 55. Qualidade visual

Uma tela deve ser considerada concluída somente quando:

- A composição possui hierarquia evidente.
- Nenhum elemento parece arbitrariamente posicionado.
- O conteúdo utiliza adequadamente o espaço.
- A tipografia é legível e expressiva.
- Os materiais estão coerentes.
- As cores possuem propósito.
- Ícones e símbolos possuem qualidade óptica.
- A ornamentação não prejudica o uso.
- O acabamento é consistente.
- A interface mantém personalidade própria.

## 56. Qualidade interativa

Todo componente relevante deve demonstrar:

- Estado claro.
- Resposta imediata.
- Movimento coerente.
- Ausência de saltos inesperados.
- Controles estáveis.
- Foco acessível.
- Feedback funcional verdadeiro.
- Comportamento previsível em interações repetidas.

## 57. Qualidade responsiva

A interface precisa:

- Reorganizar, não apenas empilhar.
- Preservar legibilidade.
- Utilizar colunas quando apropriado.
- Evitar cartões gigantes desnecessários.
- Preservar espaço para mapas e grafos.
- Manter ferramentas acessíveis.
- Adaptar componentes à largura real.
- Evitar sobreposições.
- Respeitar safe areas.

## 58. Qualidade técnica

Exigir:

- Ausência de regressões funcionais.
- Persistência preservada.
- Contratos existentes respeitados.
- Arquitetura de estilos coerente.
- Testes automatizados atualizados.
- Build aprovado.
- Nenhuma dependência paga introduzida.
- Nenhuma alteração indevida no cânone ou nas mecânicas.
- Publicação apenas conforme o processo do projeto.

## 59. Evidências de entrega

Para cada intervenção significativa, registrar:

- Estado anterior.
- Problema identificado.
- Decisão adotada.
- Componentes afetados.
- Capturas antes/depois.
- Versões desktop, tablet e celular.
- Estados de hover, foco e seleção.
- Comportamento de abertura e fechamento.
- Resultado dos testes.
- Limitações de validação.
- Confirmação de integração.

Uma captura estática não comprova a qualidade de uma animação.

Testes geométricos não comprovam a fluidez percebida em um aparelho físico.

Fixtures não comprovam permissões e comportamento com contas reais.

---

# XVI. PRIORIDADES MESTRAS

## 60. Intervenções de maior impacto

| Nível | Frente | Resultado esperado |
|---|---|---|
| P1 | Composição e formatos | Páginas mais singulares e eficientes |
| P1 | Responsividade | Layouts realmente adaptados |
| P1 | Ficha | Dossiê legível e operacional |
| P1 | Mesa | Tabuleiro dominante |
| P1 | Nexus | Exploração espacial do conhecimento |
| P1 | Arquitetura visual | Menos conflitos e maior consistência |
| P2 | Materiais | Profundidade convincente |
| P2 | Botões e controles | Resposta tátil e identidade |
| P2 | Iconografia | Coerência geométrica e autoral |
| P2 | Motion | Continuidade e previsibilidade |
| P2 | Painel do Mestre | Melhor organização operacional |
| P2 | Dashboard e Biblioteca | Apresentação editorial refinada |
| P3 | Ornamentação avançada | Maior singularidade visual |
| P3 | Detalhes atmosféricos | Acabamento e refinamento |

P1, P2 e P3 não constituem uma nova fila paralela. Representam a classificação proposta para posterior incorporação ao registro canônico.

---

# XVII. RESTRIÇÕES INEGOCIÁVEIS

1. Não substituir a identidade Véu & Trama.
2. Não redesenhar símbolos oficiais sem autorização.
3. Não importar a identidade cósmica do NexOS.
4. Não reintroduzir o hero extra do Dashboard.
5. Não restaurar o cabeçalho exagerado e fixo da Ficha.
6. Não desfazer a ampliação do radar de Atributos.
7. Não substituir o Equilíbrio bipolar por uma barra convencional.
8. Não eliminar os menus circulares aprovados.
9. Não voltar a empilhar cartões indiscriminadamente no celular.
10. Não introduzir animações ambientais caras sem necessidade.
11. Não modificar regras, valores ou cálculos do TdV apenas para atender ao visual.
12. Não sacrificar leitura, foco ou contraste.
13. Não substituir a arquitetura atual sem justificativa.
14. Não acrescentar correções CSS concorrentes.
15. Não tratar aprovação de testes automatizados como prova de excelência visual.
16. Não substituir recursos funcionais por ilustrações ou simulações.
17. Não publicar alterações sem validação adequada.
18. Não confundir telas bonitas com interfaces eficientes.

---

# XVIII. INSTRUÇÃO OPERACIONAL PARA O WORK

Você está encarregado de elevar a qualidade visual e interativa do Tadeon Nexus, preservando a identidade e as funcionalidades já estabelecidas.

Este dossiê deverá orientar uma revisão sistêmica.

**Não execute uma reforma superficial de cores, bordas e sombras.**

Aprofunde a linguagem visual dos componentes e revise como as informações são organizadas, como os painéis ocupam o espaço, como as ferramentas respondem à interação e como cada página expressa sua função.

Ao trabalhar:

- Inspecione os componentes atuais.
- Identifique oportunidades reais.
- Compare alternativas quando houver decisões de direção artística relevantes.
- Priorize composição e ergonomia antes de ornamentação.
- Preserve decisões já aprovadas.
- Trabalhe no proprietário correto de cada regra.
- Elimine conflitos e redundâncias.
- Teste visualmente o resultado.
- Valide os diferentes dispositivos.
- Mantenha a aplicação rápida e previsível.

Dê atenção especial à singularidade dos detalhes:

**Botões, hovers, ícones, seletores, cartões, fólios, painéis, molduras, janelas, divisórias, fundos, sombras, relevos, filamentos, arcos, controles, animações e transições.**

Nenhum desses elementos deve parecer esquecido ou adotado diretamente de uma biblioteca genérica sem adaptação quando houver oportunidade concreta de melhoria.

Ao mesmo tempo, não transforme todos os componentes em peças decorativas elaboradas. A riqueza estética depende também de contraste, simplicidade seletiva e hierarquia.

A marca precisa continuar reconhecível em cada elemento, sem deixar que a ornamentação comprometa o uso.

## Resultado final esperado

Um sistema com a elegância estrutural de produtos digitais profissionais, a precisão de um ambiente de criação contemporâneo e a atmosfera de uma obra pertencente ao universo de Tessitura do Vazio.

A evolução deverá ser perceptível tanto na visão geral quanto nos detalhes.

Ao abrir o Dashboard, o usuário deverá reconhecer um arquivo mitológico vivo.

Ao utilizar a Ficha, deverá sentir a clareza de um dossiê e a precisão de um conjunto de instrumentos.

Ao explorar o Nexus, deverá perceber relações e continuidades entre conhecimentos.

Ao trabalhar na Mesa, deverá encontrar um espaço de criação e condução livre de interferências desnecessárias.

Ao acessar o Painel do Mestre, deverá sentir controle sobre a campanha.

E, ao navegar entre tudo isso, deverá perceber que os ambientes pertencem ao mesmo sistema.

**O Tadeon não deve apenas representar a Tessitura do Vazio. Sua interface deve expressar visualmente as ideias de continuidade, relação, tensão e construção que sustentam esse universo.**

Essa é a ambição central do refinamento sistêmico.

---

**Diretriz final:**

*Uma interface não se torna autoral pela quantidade de elementos que exibe, mas pela coerência com que transforma cada elemento em parte de uma linguagem própria.*

**Tadeon Nexus — Véu & Trama.**  
*Uma experiência construída como os próprios fios que pretende preservar.*