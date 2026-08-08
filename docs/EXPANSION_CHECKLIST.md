# Tadeon Nexus — verificação consolidada da expansão

Estado revisado em 8 de agosto de 2026. Este documento complementa a auditoria histórica e
registra o que já existe no código atual, o que está protegido por feature flag e o que ainda
precisa ser concluído. “Implementado” significa que há código, contratos e testes no repositório;
uma flag desligada ou uma migration ainda não aplicada pode manter o recurso invisível em produção.

## Princípios preservados

- nenhuma rolagem de dados integrada à ficha, ao Nexus ou à Mesa;
- recursos novos isolados por flags desligadas por padrão;
- Supabase continua responsável por autenticação, autorização, dados e arquivos legados;
- Nexus Assets abstrai o provedor e não armazena binários no Postgres;
- segredos do R2 permanecem fora do frontend;
- conteúdo secreto depende de associação real ao workspace/campanha e de RLS;
- animações respeitam `prefers-reduced-motion`;
- serviços pagos não são requisito para executar o projeto.

## Matriz de cumprimento

| Frente | Estado | Evidência e observação |
| --- | --- | --- |
| Fundação, contratos e permissões | Implementado | Contratos centrais, camada `can(...)`, flags e testes automatizados. |
| Workspaces e campanhas | Implementado | Participações são reutilizadas; não há tabela paralela de membros. |
| Nexus Assets + Supabase Storage | Implementado | Catálogo, upload, seleção, busca, paginação, vínculos, quota e exclusão segura. |
| Adaptador Cloudflare R2 | Implementado sob flag | Worker, sessões de upload, quota e fallback existem; ativação depende da configuração gratuita do ambiente. |
| Modelo de conhecimento | Implementado | Nós, relações, aliases, tags, versões, ACL, anexos e arquivamento. |
| Interface de O Nexus | Implementado e evolutivo | Editor Markdown seguro, wikilinks, backlinks, propriedades, busca, favoritos e grafo. |
| Bibliotecas e templates | Implementado | Cartões/tabela/compacto, filtros, lote, favoritos e administração de templates. |
| Importação e exportação | Implementado | ZIP Markdown/YAML, manifesto, simulação, conflitos e anexos condicionados ao Assets. |
| Fundação gráfica da Mesa | Implementado | PixiJS, câmera, grade, seleção, movimento, rotação, camadas, atalhos e histórico. |
| Cenas e persistência | Implementado | Cenas, entidades, duplicação, snapshots, arquivamento e detecção de conflito. |
| Realtime | Implementado sob flag | Canais privados, Presence, Broadcast e persistência do estado final. |
| Iluminação e névoa | Parcial avançado | Paredes, luzes e operações de névoa existem; portas, oclusão completa e névoa por grupo continuam na sequência. |
| Handouts Nexus → Mesa | Parcial avançado | Imagens, PDFs, downloads privados, zoom/rotação/arraste/tela cheia e retorno ao Nexus; busca interna em PDF e distribuição seletiva permanecem pendentes. |
| Integração ficha/Nexus/Mesa | Parcial | Vínculos e handouts estão conectados; arrastar entidades estruturadas do Nexus para todos os destinos ainda será aprofundado. |
| Segurança e diagnóstico | Implementado e contínuo | Monitor de erros sanitizado, painel de saúde, backup e testes de autorização. |
| Experiência de ficha | Revisado nesta etapa | Dossiê visual, seções persistentes recolhíveis, tabelas móveis rotuladas e dock de salvamento no celular. |

## Próxima sequência recomendada

1. concluir portas, oclusão e propagação de luz na Mesa;
2. implementar névoa por usuário/grupo sem enviar informação secreta ao cliente não autorizado;
3. evoluir handouts com PDF.js, miniaturas, busca textual e histórico de compartilhamento;
4. completar distribuição seletiva, revogação e confirmação de leitura;
5. aprofundar relações bidirecionais entre fichas, páginas do Nexus e entidades de cena;
6. ampliar testes de concorrência, reconexão e carga da Mesa;
7. manter as ativações graduais por usuário/campanha antes de liberar flags globalmente.

## Critério para ativação

Uma frente só deve sair do canário quando build, lint, tipos e testes estiverem verdes; a RLS
negar um usuário sem acesso; a experiência atual continuar disponível com a flag desligada; e o
fluxo principal funcionar em desktop, tablet e celular sem depender de segredo público.
