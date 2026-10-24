# Mapa do código e das responsabilidades

> Gerado de [project-continuity.json](project-continuity.json). Edite o registro e rode `npm run sync:project`; não mantenha uma cópia manual.

A estrutura existente é a base de trabalho. Não criar `features/` ou `services/` paralelos para reproduzir domínios existentes. O contrato de inventário e ordem CSS continua em [style-architecture.json](style-architecture.json). Arquivos gerados, migrations e serviços externos mantêm suas próprias autoridades.

## Shell, navegação e cabeçalhos

Cabeçalhos renderizam símbolos; geometria de Área em foco pertence a page-hero-parity.css. Gatilho Mais e símbolos pertencem ao render; Radix mantém foco/teclado/colisão, sem captura global. Reflexos pertencem a useMaterialLight e à superfície React; o diretor legado não injeta luz nessas superfícies. Material de navegação pertence a navigation-layout; fundos de trama pertencem a experience-surfaces. Movimento da navegação consolidado em navigation-layout; mobile-more-radial é o proprietário da roda de opções do Mais: três destinos orbitais e fechamento central, sem rotação contínua; Radix mantém foco, colisão e dispensa. DEC-017 substitui a apresentação em lista de NEX-016 por pedido explícito de Tadeu. Card é dono da reflexão local; campos usam um plano rebaixado sem escritores legados. Tokens de relevo/flutuação pertencem a styles.css; AppLayout fornece o tom por contexto React (MaterialToneContext em use-material-light), preservado nos portais. NEX-026: PageHeader é o render único da anatomia de cabeçalhos principais e do acervo. Geometria em page-hero-parity, material em hero-backgrounds; envelope data-page-layout em desktop-shell. A identidade da Ficha rola com o dossiê (DEC-020); posição pertence ao módulo da ficha. WorkspaceActions concentra Nova janela e Salvar sessão, renderizados nos slots das rotas; nenhum portal descobre títulos ou injeta ações nos cabeçalhos.

Código: [src/components/app-layout.tsx](../src/components/app-layout.tsx), [src/components/protected-shell.tsx](../src/components/protected-shell.tsx), [src/components/section-symbols.tsx](../src/components/section-symbols.tsx), [src/components/mobile-more-menu.tsx](../src/components/mobile-more-menu.tsx), [src/components/brand-mark.tsx](../src/components/brand-mark.tsx), [src/components/material-surface.tsx](../src/components/material-surface.tsx), [src/lib/use-material-light.ts](../src/lib/use-material-light.ts), [src/components/ui/button.tsx](../src/components/ui/button.tsx), [src/components/fabric-filaments.tsx](../src/components/fabric-filaments.tsx), [src/components/utility-summary.tsx](../src/components/utility-summary.tsx), [src/lib/utility-areas.ts](../src/lib/utility-areas.ts), [src/components/ui/card.tsx](../src/components/ui/card.tsx), [src/components/ui/input.tsx](../src/components/ui/input.tsx), [src/components/ui/textarea.tsx](../src/components/ui/textarea.tsx), [src/routes/index.tsx](../src/routes/index.tsx), [src/components/continuity-hero.tsx](../src/components/continuity-hero.tsx), [src/components/character-archive.tsx](../src/components/character-archive.tsx), [src/components/page-header.tsx](../src/components/page-header.tsx), [src/components/workspace-actions.tsx](../src/components/workspace-actions.tsx), [src/components/selection-plate.tsx](../src/components/selection-plate.tsx).

Estilos: [src/styles/desktop-shell.css](../src/styles/desktop-shell.css), [src/styles/navigation-layout.css](../src/styles/navigation-layout.css), [src/styles/page-hero-parity.css](../src/styles/page-hero-parity.css), [src/styles/mobile-more-radial.css](../src/styles/mobile-more-radial.css), [src/styles/button.css](../src/styles/button.css), [src/styles/hero-backgrounds.css](../src/styles/hero-backgrounds.css).

## Busca, dialogs e viewport

Medidas do viewport pertencem ao bridge único do root; primitivos mantêm foco e portais. NEX-032: Select usa o elemento fullscreen também como limite de colisão; portal e geometria compartilham a fronteira expandida. NEX-033: createPopupRoot controla abertura e presença dos primitivos; a redução de movimento desmonta portais fechados sem depender de eventos cancelados. useRoutePopupFrame só mede enquanto existe conteúdo real. Select conserva a coleção em fragmento; a presença interna pode remontar para concluir saída reduzida sem apagar o rótulo selecionado.

Código: [src/components/global-search.tsx](../src/components/global-search.tsx), [src/components/visual-viewport-popup-bridge.tsx](../src/components/visual-viewport-popup-bridge.tsx), [src/components/ui/dialog.tsx](../src/components/ui/dialog.tsx), [src/components/ui/route-popup-frame.ts](../src/components/ui/route-popup-frame.ts), [src/components/ui/popup-presence.tsx](../src/components/ui/popup-presence.tsx).

Estilos: [src/styles/global-search.css](../src/styles/global-search.css), [src/styles/visual-viewport-popup.css](../src/styles/visual-viewport-popup.css), [src/styles/route-popup-frame.css](../src/styles/route-popup-frame.css).

## Dashboard

Dados, estados e galeria pertencem à rota; hero decorativo pertence a ContinuityHero. Geometria em page-hero-parity, material em experience-surfaces e movimento CSS finito em motion-composition; não reintroduzir os seletores Dashboard aposentados.

Código: [src/routes/index.tsx](../src/routes/index.tsx), [src/components/continuity-hero.tsx](../src/components/continuity-hero.tsx).

Estilos: [src/styles/page-hero-parity.css](../src/styles/page-hero-parity.css), [src/styles/experience-surfaces.css](../src/styles/experience-surfaces.css), [src/styles/motion-composition.css](../src/styles/motion-composition.css).

## Ficha e progressão

Rota mantém estado, regras derivadas, leitura cancelável e autosave por personagem/usuário/cargo. Seções recebem valores/callbacks; não criam estado persistido paralelo. Sheet UI mantém rótulos, recolhimento e material; sheet-premium é dono do material. Histórico/inventário montados explicitamente na ficha, sem observer de montagem; o arquivo de experiência ainda conserva bridges de outras áreas. NEX-025: vínculos recolhem no componente; títulos recebem foco para revelar seções. Dossiê em sheet-premium, densidade do modo Jogo em sheet-layout; índice sem captura global. useSheetChrome mede somente os dois cabeçalhos conhecidos do shell e a barra local, com observer e listener desmontados; publica offsets apenas no host da ficha. NEX-034/DEC-020: identidade relativa e compacta, títulos/ações com fluxo próprio, instrumentos por largura real do cartão e vínculos multilinha. Nenhuma mudança em regras ou persistência.

Código: [src/routes/sheet.$id.tsx](../src/routes/sheet.$id.tsx), [src/routes/sheet.$id_.power.tsx](../src/routes/sheet.$id_.power.tsx), [src/components/sheet/condition-counter.tsx](../src/components/sheet/condition-counter.tsx), [src/lib/sheet-types.ts](../src/lib/sheet-types.ts), [src/lib/use-serialized-autosave.ts](../src/lib/use-serialized-autosave.ts), [src/components/sheet/sheet-model.ts](../src/components/sheet/sheet-model.ts), [src/components/sheet/sheet-ui.tsx](../src/components/sheet/sheet-ui.tsx), [src/components/sheet/sheet-identity-section.tsx](../src/components/sheet/sheet-identity-section.tsx), [src/components/sheet/sheet-attributes-section.tsx](../src/components/sheet/sheet-attributes-section.tsx), [src/components/sheet/sheet-vitals-section.tsx](../src/components/sheet/sheet-vitals-section.tsx), [src/components/sheet/sheet-conditions-section.tsx](../src/components/sheet/sheet-conditions-section.tsx), [src/components/sheet/sheet-skills-section.tsx](../src/components/sheet/sheet-skills-section.tsx), [src/components/sheet/sheet-experience-bridge.tsx](../src/components/sheet/sheet-experience-bridge.tsx), [src/components/sheet/sheet-inventory-organizer.tsx](../src/components/sheet/sheet-inventory-organizer.tsx), [src/components/sheet/use-sheet-chrome.ts](../src/components/sheet/use-sheet-chrome.ts).

Estilos: [src/styles/sheet-layout.css](../src/styles/sheet-layout.css), [src/styles/sheet-premium.css](../src/styles/sheet-premium.css), [src/styles/sheet-experience.css](../src/styles/sheet-experience.css).

## O Nexus e grafo

Serviços controlam acesso a dados; grafo controla presets e interação em React. Árvore usa parent_node_id; grafo visual não usa distância de relações como parentesco. Leitura combinada e controles preservam estado React e invalidam respostas antigas. NexusWorkspace mantém navegação/editor e respostas assíncronas; KnowledgeReadingPanes dimensiona a composição; rascunhos e preferências locais são separados por identidade e workspace. Não introduzir outro escritor desses estados. NEX-026: categorias derivam de tipos dos resultados carregados em React, com limite explícito. NexusFolderBarBridge, portal, polling e mutação de visibilidade foram retirados; árvore e lista recebem a mesma coleção derivada. KnowledgeSheetLink recebe a página ativa do workspace; o MIME de arrasto é compartilhado com a ficha, sem ler título ou URL do DOM.

Código: [src/routes/nexus.tsx](../src/routes/nexus.tsx), [src/lib/knowledge/knowledge-service.ts](../src/lib/knowledge/knowledge-service.ts), [src/lib/knowledge/knowledge-graph-service.ts](../src/lib/knowledge/knowledge-graph-service.ts), [src/components/knowledge/knowledge-graph-second-brain.tsx](../src/components/knowledge/knowledge-graph-second-brain.tsx), [src/components/knowledge/knowledge-tree.tsx](../src/components/knowledge/knowledge-tree.tsx), [src/lib/knowledge/knowledge-tree.ts](../src/lib/knowledge/knowledge-tree.ts), [src/components/knowledge/nexus-workspace.tsx](../src/components/knowledge/nexus-workspace.tsx), [src/components/knowledge/knowledge-reading-panes.tsx](../src/components/knowledge/knowledge-reading-panes.tsx), [src/lib/knowledge/knowledge-drafts.ts](../src/lib/knowledge/knowledge-drafts.ts), [src/lib/knowledge/use-reading-preferences.ts](../src/lib/knowledge/use-reading-preferences.ts), [src/components/knowledge/nexus-tabletop-locator.tsx](../src/components/knowledge/nexus-tabletop-locator.tsx), [src/components/knowledge/knowledge-collection-filter.tsx](../src/components/knowledge/knowledge-collection-filter.tsx), [src/lib/knowledge/knowledge-collections.ts](../src/lib/knowledge/knowledge-collections.ts), [src/components/knowledge/knowledge-library.tsx](../src/components/knowledge/knowledge-library.tsx), [src/components/knowledge/knowledge-sheet-link.tsx](../src/components/knowledge/knowledge-sheet-link.tsx), [src/lib/knowledge/knowledge-transfer.ts](../src/lib/knowledge/knowledge-transfer.ts), [src/components/knowledge/knowledge-portability-dialog.tsx](../src/components/knowledge/knowledge-portability-dialog.tsx).

Estilos: [src/styles/nexus-material.css](../src/styles/nexus-material.css), [src/styles/knowledge-graph-second-brain.css](../src/styles/knowledge-graph-second-brain.css).

## Mesa Nexus

Motor mantém coordenadas; persistência mantém versões; interfaces não devem criar câmera ou fonte de dados paralela. Editor lateral/compacto pertence a TabletopEditorPanel; ações agrupadas ao workspace; comandos à interface progressiva. Callbacks substituem a busca de botões por texto; mapa dos bridges em tabletop-workspace-map.md. Comparação de cena é pura, sem toJSON capturado ou monkeypatch do serviço. Escritas de mapa, ambiente e câmera recebem a identidade de origem. StagePortal usa eventos de runtime; jogador aplica estado somente após init. Cor-base é um escalar compartilhado entre persistência e projeção protegida; fingerprint normaliza a representação e a ordem jsonb. NEX-030: radial é um portal de viewport com coordenadas próprias; o bridge final não as reescreve. Eventos view-only atualizam o ponto sem publicar snapshot semântico. NEX-031: câmera e formação pertencem ao motor; ViewBar controla o estado do workspace e CompositionPanel usa seus comandos. Renderer informa presença de animação; bridge nativo agenda por demanda e por mudanças de vista. A seleção única do mestre usa a roda; o trilho progressivo conserva ações coletivas e as ações do jogador. O dock legado do workspace não renderiza para uma só peça. NEX-032: grupos de câmera/enquadramento/histórico e material estático do painel pertencem a tabletop-workspace; Select mantém foco/portal e SelectionPlate mantém geometria das abas. Dobras da composição usam Collapsible, sem desmontar a sessão ao vivo.

Código: [src/components/tabletop/tabletop-workspace.tsx](../src/components/tabletop/tabletop-workspace.tsx), [src/lib/tabletop/tabletop-engine.ts](../src/lib/tabletop/tabletop-engine.ts), [src/lib/tabletop/tabletop-persistence-service.ts](../src/lib/tabletop/tabletop-persistence-service.ts), [src/lib/tabletop/tabletop-player-runtime.ts](../src/lib/tabletop/tabletop-player-runtime.ts), [src/components/tabletop/tabletop-editor-panel.tsx](../src/components/tabletop/tabletop-editor-panel.tsx), [src/components/tabletop/tabletop-progressive-interface-bridge.tsx](../src/components/tabletop/tabletop-progressive-interface-bridge.tsx), [src/components/tabletop/tabletop-stage-portal.tsx](../src/components/tabletop/tabletop-stage-portal.tsx), [src/components/tabletop/tabletop-participant-workspace.tsx](../src/components/tabletop/tabletop-participant-workspace.tsx), [src/lib/tabletop/tabletop-visibility-service.ts](../src/lib/tabletop/tabletop-visibility-service.ts), [src/lib/tabletop/tabletop-view-preference-service.ts](../src/lib/tabletop/tabletop-view-preference-service.ts), [src/lib/tabletop/tabletop-scene-fingerprint-guard.ts](../src/lib/tabletop/tabletop-scene-fingerprint-guard.ts), [supabase/functions/_shared/tabletop-entity-color.ts](../supabase/functions/_shared/tabletop-entity-color.ts), [supabase/functions/tabletop-view/index.ts](../supabase/functions/tabletop-view/index.ts), [src/components/tabletop/tabletop-radial-actions-bridge.tsx](../src/components/tabletop/tabletop-radial-actions-bridge.tsx), [src/components/tabletop/tabletop-view-bar.tsx](../src/components/tabletop/tabletop-view-bar.tsx), [src/components/tabletop/tabletop-composition-panel.tsx](../src/components/tabletop/tabletop-composition-panel.tsx), [src/lib/tabletop/tabletop-arrangement.ts](../src/lib/tabletop/tabletop-arrangement.ts), [src/lib/tabletop/tabletop-visual-preset.ts](../src/lib/tabletop/tabletop-visual-preset.ts).

Estilos: [src/styles/tabletop-workspace.css](../src/styles/tabletop-workspace.css), [src/styles/tabletop-route-experience.css](../src/styles/tabletop-route-experience.css).

## Painel e administração

A rota é a única dona do rascunho, leitura e autorização via ProtectedShell. Overview recebe dados/callbacks; busca e paginação são locais. Navegação e identidade do cabeçalho recebem a mesma aba React; o router mantém URL. useMasterDraft salva snapshots manuais sem reconhecer edições posteriores. Master-panel-navigation.css é a única autoridade da navegação interna; workspace.css mantém os painéis.

Código: [src/routes/master-panel.tsx](../src/routes/master-panel.tsx), [src/components/master/master-hub.tsx](../src/components/master/master-hub.tsx), [src/routes/manage-users.tsx](../src/routes/manage-users.tsx), [supabase/functions/admin-users/index.ts](../supabase/functions/admin-users/index.ts), [src/components/master/master-overview.tsx](../src/components/master/master-overview.tsx), [src/components/master/master-panel-navigation.tsx](../src/components/master/master-panel-navigation.tsx), [src/components/master/use-master-draft.ts](../src/components/master/use-master-draft.ts).

Estilos: [src/styles/master-panel-navigation.css](../src/styles/master-panel-navigation.css), [src/styles/workspace.css](../src/styles/workspace.css).

## Sessão, offline e flags

Identidade verificada acompanha cada escrita; leituras antigas são invalidadas.

Código: [src/lib/auth.tsx](../src/lib/auth.tsx), [src/lib/offline-cache.ts](../src/lib/offline-cache.ts), [src/lib/feature-flags.ts](../src/lib/feature-flags.ts), [src/lib/latest-request.ts](../src/lib/latest-request.ts).

Estilos: [src/styles/page-hero-parity.css](../src/styles/page-hero-parity.css).

## Assets e portabilidade

URLs privadas não são identidade persistente. Rollout e provedores exigem evidência própria. Histórico de backup parcial por identidade verificada; dados antigos sem escopo não são adotados automaticamente.

Código: [src/lib/assets/asset-service.ts](../src/lib/assets/asset-service.ts), [src/lib/knowledge/knowledge-portability-service.ts](../src/lib/knowledge/knowledge-portability-service.ts).

Estilos: sem proprietário CSS exclusivo.

## Qualidade, documentação e publicação

PR valida a branch; merge em main pode iniciar deploy. Documentação diferencia proposta, validação e integração.

Código: [scripts/check-style-architecture.mjs](../scripts/check-style-architecture.mjs), [scripts/check-project-continuity.mjs](../scripts/check-project-continuity.mjs), [.github/workflows/quality.yml](../.github/workflows/quality.yml), [.github/workflows/cloudflare-preview.yml](../.github/workflows/cloudflare-preview.yml), [scripts/verify-production-build.mjs](../scripts/verify-production-build.mjs).

Estilos: sem proprietário CSS exclusivo.

## Direção visual e motion

Cada propriedade animada tem um responsável; coalescer mutações sem perder registros.

Código: [src/components/tadeon-experience-director.tsx](../src/components/tadeon-experience-director.tsx), [src/lib/frame-batch.ts](../src/lib/frame-batch.ts).

Estilos: [src/styles/motion-foundation.css](../src/styles/motion-foundation.css), [src/styles/motion-interactions.css](../src/styles/motion-interactions.css), [src/styles/motion-composition.css](../src/styles/motion-composition.css).

## Bridges registrados

Nome de bridge não significa código descartável. Antes de transferir, rastrear montagens, estado, listeners, portais e persistência; registrar destino, testes e retirada da origem no mesmo lote. O inventário não afirma que todos já foram auditados em profundidade.

| Arquivo | Domínio | Tratamento |
| --- | --- | --- |
| [src/components/experience-final-polish-bridge.tsx](../src/components/experience-final-polish-bridge.tsx) | sheet | Revisar antes de transferir |
| [src/components/sheet/sheet-experience-bridge.tsx](../src/components/sheet/sheet-experience-bridge.tsx) | sheet | Revisar antes de transferir |
| [src/components/tabletop/tabletop-adaptive-performance-bridge.tsx](../src/components/tabletop/tabletop-adaptive-performance-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-atmosphere-bridge.tsx](../src/components/tabletop/tabletop-atmosphere-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-creative-dock-bridge.tsx](../src/components/tabletop/tabletop-creative-dock-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-cross-surface-bridge.tsx](../src/components/tabletop/tabletop-cross-surface-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-deep-link-locator-bridge.tsx](../src/components/tabletop/tabletop-deep-link-locator-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-director-enhancement-bridge.tsx](../src/components/tabletop/tabletop-director-enhancement-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-director-timeline-bridge.tsx](../src/components/tabletop/tabletop-director-timeline-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-final-interaction-bridge.tsx](../src/components/tabletop/tabletop-final-interaction-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-floating-layout-bridge.tsx](../src/components/tabletop/tabletop-floating-layout-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-fog-geometry-bridge.tsx](../src/components/tabletop/tabletop-fog-geometry-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-integration-tools-bridge.tsx](../src/components/tabletop/tabletop-integration-tools-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-locate-bridge.tsx](../src/components/tabletop/tabletop-locate-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-native-model-bridge.tsx](../src/components/tabletop/tabletop-native-model-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-nexus-capture-bridge.tsx](../src/components/tabletop/tabletop-nexus-capture-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-placeables-inspector-bridge.tsx](../src/components/tabletop/tabletop-placeables-inspector-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-player-interaction-bridge.tsx](../src/components/tabletop/tabletop-player-interaction-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-preflight-bridge.tsx](../src/components/tabletop/tabletop-preflight-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-progressive-interface-bridge.tsx](../src/components/tabletop/tabletop-progressive-interface-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-radial-actions-bridge.tsx](../src/components/tabletop/tabletop-radial-actions-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-region-automation-bridge.tsx](../src/components/tabletop/tabletop-region-automation-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-reliability-editor-bridge.tsx](../src/components/tabletop/tabletop-reliability-editor-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-roof-foreground-bridge.tsx](../src/components/tabletop/tabletop-roof-foreground-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-semantic-transform-bridge.tsx](../src/components/tabletop/tabletop-semantic-transform-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-smart-setup-bridge.tsx](../src/components/tabletop/tabletop-smart-setup-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-spatial-audio-bridge.tsx](../src/components/tabletop/tabletop-spatial-audio-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-spatial-streaming-bridge.tsx](../src/components/tabletop/tabletop-spatial-streaming-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-unified-drop-bridge.tsx](../src/components/tabletop/tabletop-unified-drop-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx](../src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx) | tabletop | Revisar antes de transferir |
| [src/components/visual-viewport-popup-bridge.tsx](../src/components/visual-viewport-popup-bridge.tsx) | popup | Proprietário atual |
