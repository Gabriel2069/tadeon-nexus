# Mesa: mapa de controles e estados — NEX-007 / NEX-021

Base inspecionada: main `66acb8e`, sem PR aberta. Este mapa registra limites e decisões do lote; a fila continua em `project-continuity.json`.

A cena é protagonista. O vidro fica no chrome; o tecido permanece na identidade e nas bordas. Grupos nomeados substituem a faixa de ações sem legenda. O editor fica lateral a partir de 1200px e abre como diálogo abaixo disso. Biblioteca criativa começa fechada. Não há textura animada sobre peças, leitura ou coordenadas.

| Estado | Proprietário | Limite |
| --- | --- | --- |
| Cena, entidades, camadas e andares | TabletopEngine + persistence-service | Coordenadas de mundo, histórico e versão esperada; UI não cria outra cópia persistente |
| Arquitetura, luz e névoa | visibility-service; preview no workspace | Alterações pendentes contam no salvar e na saída; resposta não reconhece preview mais novo |
| Câmera e projeção | Motor e view-preference-service | Mundo/tela passam pelo runtime; controles apenas chamam o motor |
| Sala, presença e movimento remoto | LiveSession + use-tabletop-realtime | Protocolo existente, reconexão explícita; fixture não certifica RLS/rede real |
| Ferramenta e seleção | Motor; callbacks de ferramenta/seleção | Indicadores e comandos refletem a seleção; ação indisponível fica desabilitada |
| Modos e composição | Workspace; EditorPanel | Workspace é dono do modo; ProgressiveInterface recebe valor/callback. Preferência por usuário/cargo; storage opcional; painel compacto tem foco contido |
| Vínculo Nexus → Mesa | Página selecionada no NexusWorkspace | Disponível ao mestre, pois o modo jogador segue a sessão compartilhada e não consome deep links de edição. Todos os destinos retornados são selecionáveis; consulta limitada a 8 resultados recentes |

## Bridges: função, montagem e destino

Inventário lido antes da transferência. Conservar significa manter o proprietário atual, sem consolidar recursos sem equivalência demonstrada. A tabela não certifica o backend de cada ferramenta. A alteração de montagem deste lote é a interface progressiva do mestre; a única retirada funcionalmente vazia é o launcher sem implementação.

| Bridge | Montagem encontrada | Função e destino neste lote |
| --- | --- | --- |
| [adaptive-performance](../src/components/tabletop/tabletop-adaptive-performance-bridge.tsx) | tabletop-director-entry.tsx, tabletop-deferred-enhancements.tsx | Qualidade e orçamento de render local; conservar o módulo e o sinal de qualidade. |
| [atmosphere](../src/components/tabletop/tabletop-atmosphere-bridge.tsx) | tabletop-deferred-enhancements.tsx | Atmosfera derivada do runtime; conservar sem criar outra câmera. |
| [creative-dock](../src/components/tabletop/tabletop-creative-dock-bridge.tsx) | tabletop-deferred-enhancements.tsx | Catálogo de modelos e regiões; inicia fechado; inserção continua no motor. |
| [cross-surface](../src/components/tabletop/tabletop-cross-surface-bridge.tsx) | components/protected-shell.tsx | Drop entre ficha, Nexus e Mesa; conservar os contratos de origem e destino. |
| [deep-link-locator](../src/components/tabletop/tabletop-deep-link-locator-bridge.tsx) | tabletop-master-entry.tsx | Localização inicial por entidade; conservar coordenadas do motor. |
| [director-enhancement](../src/components/tabletop/tabletop-director-enhancement-bridge.tsx) | Sem importador encontrado | Controles complementares da direção; conservar no fluxo do diretor. |
| [director-timeline](../src/components/tabletop/tabletop-director-timeline-bridge.tsx) | tabletop-deferred-enhancements.tsx | Cues e linha do tempo; conservar o estado persistente do diretor. |
| [final-interaction](../src/components/tabletop/tabletop-final-interaction-bridge.tsx) | routes/__root.tsx | Rename e ações finais no root; conservar RPCs e versões. |
| [floating-layout](../src/components/tabletop/tabletop-floating-layout-bridge.tsx) | tabletop-route-experience.tsx | Medições e limites do chrome; não escreve coordenadas de entidades. |
| [fog-geometry](../src/components/tabletop/tabletop-fog-geometry-bridge.tsx) | tabletop-deferred-enhancements.tsx | Edição espacial de névoa; conservar geometria e audiência. |
| [integration-tools](../src/components/tabletop/tabletop-integration-tools-bridge.tsx) | tabletop-deferred-enhancements.tsx | Painel Agora e vínculos; conservar leituras e ações explícitas. |
| [locate](../src/components/tabletop/tabletop-locate-bridge.tsx) | tabletop-deferred-enhancements.tsx | Enquadramento por eventos; motor continua dono da câmera. |
| [native-model](../src/components/tabletop/tabletop-native-model-bridge.tsx) | tabletop-director-entry.tsx, tabletop-deferred-enhancements.tsx | Render de modelos 3D; conservar descarte e visibilidade segura. |
| [nexus-capture](../src/components/tabletop/tabletop-nexus-capture-bridge.tsx) | tabletop-deferred-enhancements.tsx | Captura da cena para o Nexus; conservar autoria e acesso. |
| [placeables-inspector](../src/components/tabletop/tabletop-placeables-inspector-bridge.tsx) | tabletop-deferred-enhancements.tsx | Lista de itens e estruturas da cena; nomes em português; conservar seleção do motor. |
| [player-interaction](../src/components/tabletop/tabletop-player-interaction-bridge.tsx) | tabletop-deferred-enhancements.tsx | Movimento tático do jogador; conservar autorização e protocolo. |
| [preflight](../src/components/tabletop/tabletop-preflight-bridge.tsx) | tabletop-deferred-enhancements.tsx | Verificação antes de jogar; conservar diagnóstico sem escrita automática. |
| [progressive-interface](../src/components/tabletop/tabletop-progressive-interface-bridge.tsx) | tabletop-workspace.tsx, tabletop-participant-workspace.tsx | Montagem mestre transferida da entrada para o workspace; recebe disponibilidade e abertura do painel por callback. Jogador também monta a interface no workspace após a inicialização do motor. Modo controlado pelo workspace, por usuário/cargo; comandos Radix/cmdk. |
| [radial-actions](../src/components/tabletop/tabletop-radial-actions-bridge.tsx) | tabletop-deferred-enhancements.tsx | Ações contextuais; conservar delegação ao motor e ao Nexus. |
| [region-automation](../src/components/tabletop/tabletop-region-automation-bridge.tsx) | tabletop-deferred-enhancements.tsx | Automações espaciais; conservar eventos, condições e audiência. |
| [reliability-editor](../src/components/tabletop/tabletop-reliability-editor-bridge.tsx) | tabletop-deferred-enhancements.tsx | Status de gravação, áudio e precisão; conservar leitura do estado emitido pelo workspace. |
| [roof-foreground](../src/components/tabletop/tabletop-roof-foreground-bridge.tsx) | tabletop-deferred-enhancements.tsx | Coberturas e primeiro plano; conservar render derivado. |
| [semantic-transform](../src/components/tabletop/tabletop-semantic-transform-bridge.tsx) | tabletop-deferred-enhancements.tsx | Transformações da seleção; conservar comandos do motor. |
| [smart-setup](../src/components/tabletop/tabletop-smart-setup-bridge.tsx) | tabletop-deferred-enhancements.tsx | Preparação guiada; conservar presets explícitos e aplicação ao motor. |
| [smart-setup-launcher-dock](https://github.com/Gabriel2069/tadeon-nexus/blob/66acb8efc0cbf3d5d68b98a7984b0c04d4ff60b2/src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx) | tabletop-deferred-enhancements.tsx | Exportação sem implementação, retorna null; sem estado/listener/portal. Aposentada neste lote; launcher real continua em smart-setup. |
| [spatial-audio](../src/components/tabletop/tabletop-spatial-audio-bridge.tsx) | tabletop-deferred-enhancements.tsx | Áudio espacial e gesto de ativação; conservar descarte. |
| [spatial-streaming](../src/components/tabletop/tabletop-spatial-streaming-bridge.tsx) | tabletop-deferred-enhancements.tsx | Plano de streaming derivado da câmera; conservar orçamento local. |
| [unified-drop](../src/components/tabletop/tabletop-unified-drop-bridge.tsx) | tabletop-deferred-enhancements.tsx | Normalização de drop; conservar coordenadas e formato de payload. |
| [urgent-reconciliation](../src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx) | tabletop-master-entry.tsx | Arraste do catálogo e recolhimento do status; conservar limites atuais; não absorve o editor principal. |
| [workspace-popout](../src/components/tabletop/tabletop-workspace-popout-bridge.tsx) | components/protected-shell.tsx | Janela auxiliar do workspace; conservar destino e montagem do shell. |

## Fluxos que precisam de prova

Navegação sem perder mapa/ambiente; salvar snapshot com edição posterior ainda pendente; reload com confirmação; busca de comandos, estados indisponíveis, Escape e retorno de foco; seleção/inspeção; 2D/3D, zoom e conversão mundo/tela; abrir/fechar painéis; mudança de viewport; jogador e reconexão simulada. Evidências executadas ficam em `tabletop-workspace-validation.json`, com limites separados de produção.

A comparação de conteúdo agora é uma função pura. A implementação anterior anexava `toJSON` à cena e seus clones preservavam a referência à cena antiga; edições podiam continuar marcadas como salvas. O workspace compara o conteúdo atual, excluindo versões, autoria e URLs temporárias, sem substituir métodos do serviço.

TabletopStagePortal acompanha a montagem do runtime por eventos explícitos e não cria um MutationObserver de todo o body para cada ferramenta. A visão do jogador ganhou seu próprio host de controles; o estado da cena só é aplicado depois da inicialização do renderer. Leituras de sala/cena do jogador invalidam resposta, erro e loading antigos.

Gravações do workspace carregam a identidade que iniciou mapa, ambiente e preferência de câmera. O cliente recusa a troca de identidade antes de enviar; o backend mantém autorização/RLS e concorrência como autoridades. Esta proteção de cliente não certifica permissões reais.

A origem da grade passa diretamente pelo payload canônico de persistência. A ponte de origem mantém somente a aplicação explícita do ajuste ao motor; foi retirado o wrapper global do protótipo que interceptava saves e descartava argumentos adicionais. O teste do payload cobre deslocamentos positivos/negativos e a guarda de identidade carrega o módulo de origem.

O renderer usa pixels lógicos (`app.screen`) para câmera e enquadramento, inclusive em densidade 2×; o buffer físico não define coordenadas. O canvas respeita a largura real do host, sem mínimo de 320px. A ferramenta ativa chega à interface por callback do motor, sem depender de um evento de renderização.
