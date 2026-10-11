# Base de manutenção do Tadeon Nexus

Esta etapa reorganiza a estrutura para permitir o refinamento visual do Fio-Mestre sem continuar acumulando correções sobrepostas. A referência é o commit `353808af68c8ba0d08bbc90d6f8ad9117c9e25f8`. O design atual foi preservado; a redução de arquivos não significa que todos os conflitos entre declarações antigas foram eliminados.

## O que foi consolidado

Os 212 arquivos CSS passaram a 57. Os 65 links locais do root passaram a 12. Módulos exclusivos consecutivos foram reunidos; estilos compartilhados conservaram seus pontos de importação e sua identidade. Imports CSS locais aninhados foram expandidos na mesma posição. As 24 folhas sem caminho de carregamento no código da aplicação foram removidas; o histórico Git permite recuperá-las.

`style-migration.json` registra entradas, arquivos sem alcance, testes textuais migrados e requisitos dos testes aposentados. Comentários `source` e `end-source` delimitam a origem de cada trecho ativo. Esses comentários facilitam uma limpeza progressiva; não devem virar novos arquivos de correção. Não há cópia de CSS histórico para satisfazer testes.

`style-migration-verification.json` compara eventos ordenados da AST PostCSS dos 55 módulos transformados com a base: seletores, regras condicionais, propriedades, valores e prioridade. Comentários e espaços não entram no hash. Todos foram equivalentes no momento da migração. O script `node scripts/verify-style-migration.mjs` exige o commit-base local e serve para verificar esta migração, não para congelar futuros refinamentos.

## Mapa de responsabilidades

| Área | Entrada responsável | Limite de manutenção |
|---|---|---|
| Tokens, tipografia e primitivas | `src/styles.css` | Base do sistema; não redeclarar tokens em outra camada para mudar uma seção |
| Responsividade global | `responsive-shell.css`, `viewport.css`, `mobile-viewport.css` | Viewport e shell; dimensões de portais passam pelo contrato dos componentes UI |
| Layout global e compatibilidade | `interface-layout.css`, `layout-compatibility.css`, `route-layout.css` | Trechos legados preservados; eliminar concorrentes ao editar cada propriedade |
| Materiais e superfícies | `experience-surfaces.css`, `nexus-material.css`, `workspace.css` | Aparência de superfícies e materiais, sem controlar coordenadas da Mesa |
| Motion global | `motion-foundation.css`, `motion-interactions.css`, `motion-composition.css` | Sequência preservada; consolidar cada animação com seu estado e reduced-motion |
| Navegação e shell autenticado | `desktop-shell.css`, `navigation-layout.css` | Sidebar, barras e alinhamento do shell |
| Cabeçalhos e identidades | `page-hero-parity.css`, `hero-backgrounds.css`, `section-symbols.tsx` | Símbolos autorais e marcas compartilhadas; evitar uma segunda geometria por rota |
| Fichas | `sheet-layout.css`, `sheet-premium.css`, `sheet-experience.css` | Densidade, leitura e modo de jogo |
| Popups e pesquisa | `route-popup-frame.css`, `visual-viewport-popup.css`, `global-search.css` | Geometria nos componentes UI; CSS só apresenta o estado definido pelo componente |
| Mesa | `tabletop-workspace.css`, `tabletop-route-experience.css`, `tabletop-chrome.css`, módulos `tabletop-*` | Stage e coordenadas pertencem ao workspace; cada ferramenta conserva seu módulo |
| Sessão e cache offline | `src/lib/auth.tsx`, `src/lib/offline-cache.ts` | Identidade verificada antes de liberar conteúdo; namespace por usuário e cargo |
| Leituras concorrentes | `src/lib/latest-request.ts` e consumidor Nexus | Última leitura vence; invalidar também erro e loading anteriores |
| Observação de apresentação | `src/lib/frame-batch.ts`, `tadeon-experience-director.tsx` | Acumular todos os registros de um frame; desmontagem cancela trabalho pendente |

Os módulos de layout e motion ainda contêm seções históricas. O próximo refinamento deve escolher uma propriedade e seus estados, localizar todos os concorrentes e deixar uma regra responsável, em vez de acrescentar uma camada no fim da lista. Mover regras entre módulos altera a cascata e exige validação visual.

## Gates contra novas sobreposições

`npm run check:styles` é parte de `npm run check` e verifica inventário aprovado, existência dos imports, ordem dos 12 links globais, ausência de imports locais aninhados e tetos de `!important` e `:root` por arquivo. Os tetos representam dívida existente, não metas aceitáveis. A aprovação de um módulo realmente novo deve explicitar seu proprietário e seu motivo. Aumentar tetos apenas para passar no gate não é uma correção.

A validação completa roda arquitetura de estilos, ESLint, TypeScript, Vitest e builds cliente/SSR. `npm audit --omit=dev --audit-level=high` é obrigatório tanto no Quality quanto na publicação. Produção só é publicada de `main`; dispatch de outra referência é ignorado. PR não tem caminho de publicação em produção.

## Correções de comportamento

- O cache offline legado sem identidade é descartado. Uma conta não herda dados de outra. Mudança de cargo elimina o cache anterior, inclusive fichas carregadas como mestre; logout elimina o namespace ativo. Escritas recebem usuário/cargo de origem e são recusadas após uma troca de identidade. Dados de mestre só podem ser escritos e lidos no cargo mestre. Storage indisponível não interrompe autenticação.
- Hidratação de sessão é adiada para fora do callback Supabase. Logout, nova hidratação e desmontagem invalidam timers e respostas antigas. Evento de renovação de token não libera uma hidratação pendente. A revisão seguiu a [referência oficial de eventos de autenticação](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).
- Buscas e grafo do Nexus, além da atualização das flags de navegação, usam uma geração de leitura: respostas ou erros antigos não sobrescrevem resultados novos nem desligam seu loading.
- O diretor visual acumula mutações recebidas antes do frame. Antes, cada callback cancelava o frame anterior e descartava seus registros.
- O service worker usa cache-first para assets de conteúdo versionado em `/assets/`. Um asset já salvo não dispara fetch abandonado quando offline. Navegação autenticada e mutações continuam fora desse cache. Isso não implementa abertura offline a frio de todas as rotas.
- A Mesa principal permanece acessível na navegação quando a leitura de flags falha, como já ocorria na rota `/tabletop`. O contrato está em `CORE_SURFACES`; flags dos módulos opcionais continuam separadas e o backend mantém sua autorização.
- O root deixou de acrescentar um `<main>` em volta das rotas que já possuem seu landmark.

## Testes e limites de cobertura

Foram mantidos os testes de domínio e migração. 38 suítes textuais de contratos visuais usam uma ponte que resolve o nome antigo para seu trecho ativo consolidado; testes de ordem agora verificam o importador e a posição real do trecho. Essa ponte é temporária: ao substituir um componente ou regra, substitua também o teste textual por interação ou renderização.

19 suítes já quebradas na base exigiam folhas ausentes ou contratos substituídos, como ausência do bridge de hero, iconografia anterior e hard-lock antigo de coordenadas. Foram aposentadas com suas descrições de requisitos no inventário. Aposentar essas suítes não prova que os requisitos visuais estão resolvidos. A próxima etapa deve cobrir os requisitos pertinentes por renderização: sete cabeçalhos, símbolos, tabs, dialogs, busca, layout da Mesa e controles táticos.

Novos testes exercitam AuthProvider renderizado, cache com troca de usuário/cargo, logout, falhas de storage, ordenação assíncrona, acúmulo de frames e execução do service worker. Não foram alteradas tabelas, RLS, funções ou migrações do Supabase.

## Próximos lotes de refinamento

1. Validar as sete seções com dados e contas de jogador/mestre, em 390, 820 e 1440 px. Registrar geometria, clipping, foco, overlays e movimento reduzido. Estabelecer referências visuais aprovadas.
2. Consolidar o contrato de cabeçalhos, símbolos e cores por seção. Remover apenas depois de comparação as declarações e observers que reproduzem o mesmo papel.
3. Resolver sidebar, busca e portais propriedade por propriedade, incluindo teclado e abertura/fechamento. Desvincular geometria de callbacks de apresentação.
4. Fazer o mesmo para Mesa, fichas, Nexus e painel do mestre. Dividir arquivos TSX grandes por responsabilidade e estado compartilhado, não pelo tamanho em linhas.
5. Revisar flags, carregamento por rota, chunk Pixi e custo de motion. A consolidação atual diminui arquivos/imports, mas não promete redução proporcional dos bytes CSS.
6. Revisar isolamento entre tenants, RLS e migrações com dados de teste e ambiente adequado. Não reunir migrações aplicadas em uma migração única.
7. Reavaliar requisitos úteis da PR antiga conflitante contra a base atual; não integrar seu diff antigo nem apagar branches sem verificar referências.

O encerramento da base visual depende desses testes de telas autenticadas e da eliminação das regras concorrentes por proprietário. Esta entrega estabelece o terreno e os gates para executar essa limpeza com rastreabilidade.

## Evidência final desta entrega

Depois de uma instalação limpa com `npm ci`, `npm run check` encerrou com código 0: 111 suítes e 494 testes, ESLint, TypeScript e builds de cliente, SSR e Worker. A comparação de 55 módulos CSS permaneceu equivalente à base. O ambiente local usa Node 24; o workflow mantém Node 22 e deve validar o commit remoto.

A auditoria de produção (`--omit=dev`) ficou com 0 avisos altos e 1 baixo. A auditoria completa ainda apresenta dois registros altos relacionados ao SDK MCP transitivo e ao pacote que o incorpora, sem correção disponível no relatório npm, além do aviso baixo de esbuild no servidor de desenvolvimento Windows. O MCP participa do build: sua classificação como dev não prova ausência de exposição em produção. Não foi forçada uma atualização incompatível nem desativada a integração. A revisão específica do fluxo OAuth/SDK continua pendente antes de declarar todos os avisos resolvidos.

A comparação visual por screenshots não foi concluída: o Chromium não estava disponível e seu download falhou. A próxima revisão visual precisa de navegador e acesso às telas autenticadas. O build ainda avisa sobre o chunk Pixi e ajustes do adaptador/bundler; esses avisos não impediram a compilação.

Métricas e limites estão em `foundation-validation.json`. Esta branch não publicou o Worker e não alterou o banco.
