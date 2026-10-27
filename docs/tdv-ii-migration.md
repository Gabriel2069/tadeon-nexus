# TdV II no Tadeon Nexus

A fonte normativa é o Livro de Regras TdV II v2.0 anexado por Tadeu em 26/10/2026, SHA-256 `8846b485dc528e3998de9227a033bea746eb439d6519ea7f3362a7a8f9515c0f`. A extração em [rules/tdv-ii-v2.md](rules/tdv-ii-v2.md) inclui corpo e tabelas; ilustrações e paginação não são reproduzidas. Não inferir mecânicas a partir da memória ou de material histórico.

## Edição e compatibilidade

`character_sheets.rules_version` distingue a edição anterior (1) do TdV II (2). `tdv2_data` mantém o registro tipado da nova edição. A migração adiciona campos e guardas, sem converter linhas antigas, apagar atributos ou substituir dados de campanha. Converter prepara um rascunho narrativo; os valores 3,3,2,2 e a seleção de dois Alinhavos d8/quatro d6 são revisados antes de liberar o Motor. Não há conversão automática de PM/Rank em PU nem de cinco atributos em quatro Matrizes.

O Mestre reconhece Marcos; jogadores não podem concedê-los por escrita direta, reabrir a criação de uma ficha concluída ou apagar investimentos anteriores. Compras usam custos canônicos, incorporação e a reserva de 2 PU por Marco. O servidor valida faixas, recursos, pacotes iniciais e investimentos. As políticas existentes continuam delimitando leitura e edição.

## Autoridades

`tdv2.ts` é a autoridade comum dos Fios, recursos, Defesas, Guarda, progressão e continuidade. A Mesa do participante importa esse motor no servidor e entrega apenas resumo autorizado: recursos, estado, condições, Equilíbrio e Desenvolvimento. Feição completa, anotações, vínculos e segredos não entram nesse resumo. A edição anterior conserva seu formato e sua interpretação.

A ficha divide Pessoa, Constituição, Ação, Expressão e Percurso (DEC-021). A cobertura por capítulo e as fronteiras de automação estão em [tdv-ii-coverage.md](tdv-ii-coverage.md). A condução do Mestre usa estado privado `game_settings.tdv2_state`, com salvamento explícito, proteção contra navegação pendente, comparação de `tdv2_revision` antes de gravar e atualização de Iniciativa condicionada à versão realmente lida da ficha. Posição, Urgência e Pressão continuam distintos. Magnitude 0–4 não calcula orçamento, dano, bônus ou equivalência de grupo. Selagem não usa DT/Cargas automáticas por estágio.

Histórico de sessão inclui a edição e o payload novo. O acervo, o cache e o dossiê da Mesa distinguem Desenvolvimento de Exposição. O catálogo da primeira edição recusa inserção de mecânicas antigas em fichas TdV II. Forma de Poder antiga redireciona fichas TdV II para a Expressão integrada.

## Nexus

O pacote único passa a 203 páginas e 314 relações, com 17 páginas do novo livro. O livro anterior e sínteses dependentes são sinalizados para revisão histórica. Os registros de outros livros e os identificadores anteriores são preservados. A importação continua usando prévia e resolução de conflitos; páginas já instaladas e personalizadas não são sobrescritas silenciosamente. Templates TdV II são acrescentados por RPC com a mesma fronteira de administração de workspace; nenhum template pessoal é substituído.

## Interpretação e limites

O site calcula o que o livro define numericamente. Não inventa tabelas de Refluxo, dano crítico dobrado, bônus de amizade, bônus de Magnitude ou penalidades automáticas por Retorno baixo. Causas, incorporação, permissão transcendente, contrapartidas, condições e restabelecimento de continuidade continuam decisões explícitas da ficção. Campos de registro não constituem concessão automática de capacidade.

A fonte da regra não altera a identidade visual aprovada do site. O livro possui edição própria; Cormorant/Alegreya, símbolos, rodas e materiais do Tadeon são preservados.

A migração aditiva foi aplicada em `nkxpstyfrzufsnowjrdi` sob a versão `20261027093709`; as cinco fichas existentes permanecem na edição 1, sem novo payload. A função protegida `tabletop-view` mantém JWT obrigatório. A interface foi integrada pela PR #310 e publicada a partir de main, com os gates e o SHA registrados em tdv-ii-validation.json.

O indicador e a ordenação do acervo usam Desenvolvimento para TdV II, sem reaproveitar Exposição histórica. `list_my_sheets` retorna edição e progresso, sem Rank nem payload completo; `get_sheet` explicita qual payload é normativo, sob o acesso já existente do chamador. O formato de backup preserva campos versionados e o estado do Mestre em uma serialização JSON; essa verificação não equivale a restauração real.

A migração operacional `20261027191353` acrescenta revisão do estado privado, validação de proteção ordinária e uma projeção pública opcional de rodada nos tokens da cena escolhida. A projeção preserva todas as demais propriedades dos tokens, remove somente seu campo reservado ao desvincular e transmite apenas uma invalidação pelo canal privado existente. Sem participação ativa do Mestre na sala, o estado salvo fica disponível ao carregar a cena. Quatorze templates TdV II cobrem também Arma, Preparo, Costura, Operação e Reputação. Nenhum template pessoal é sobrescrito.
