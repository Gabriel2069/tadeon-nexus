# Integração Mesa Nexus ↔ O Nexus

## Compartilhamento

Páginas de tipo `clue` e `document` arrastadas da Biblioteca de O Nexus para a
Mesa são criadas como `handout_pin`. Um pin só aparece para o participante se:

1. a entidade e sua camada estiverem visíveis;
2. a página ainda existir e não estiver arquivada;
3. `nexus_knowledge_enabled` estiver habilitado para a conta;
4. a RLS de `knowledge_nodes` autorizar aquele usuário a ler a página.

Se qualquer verificação falhar, a entidade inteira é removida da projeção. Isso
impede que o próprio nome do pin revele uma pista privada.

## Contrato público

O navegador recebe somente:

- ID da página autorizada;
- título;
- resumo de até 600 caracteres;
- tipo da página;
- capa com URL temporária, quando houver.

O Markdown integral, texto indexado, propriedades, status internos, relações,
aliases e histórico não fazem parte do contrato. O frontend valida a resposta
com esquema estrito e rejeita campos extras.

## Experiência do participante

Handouts autorizados aparecem em uma bandeja recolhível sobre a Mesa. O botão
`Abrir` navega para `/nexus?node=<id>`, onde O Nexus refaz sua própria validação de
flag e RLS. A bandeja é responsiva e vira um painel de largura total no celular.

## Limites

A projeção processa no máximo 64 handouts por cena. Assets continuam privados e
assinados por cinco minutos. Nenhuma chave de serviço é enviada ao frontend; a
Edge Function usa o JWT do participante em uma consulta submetida à RLS.


## Visualização de arquivos na Mesa

A bandeja abre um visualizador interno responsivo. Cada handout pode expor no
máximo 16 vínculos autorizados de `knowledge_assets`:

- imagens JPEG, PNG, WebP, GIF e AVIF são exibidas em modo galeria;
- PDFs são exibidos no leitor nativo do navegador;
- outros formatos aparecem somente como download, sem execução inline;
- a capa é usada como fallback quando não há anexo selecionado.

A Edge Function consulta `knowledge_assets` com o JWT do participante. Portanto,
a RLS precisa autorizar simultaneamente a página e o asset. Só depois dessa
autorização o servidor assina uma URL privada por cinco minutos. O contrato envia
nome, MIME, tamanho, papel, legenda e URL temporária; não envia caminhos internos,
bucket, provider ou chaves.

O visualizador é modal no desktop e ocupa a tela no celular, preservando uma área
mínima para PDFs e uma lista rolável de anexos. Arquivos HTML, SVG e outros formatos
potencialmente executáveis nunca são renderizados inline.
