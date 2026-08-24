# Nexus — inventário e consolidação canônica

## Objetivo

Substituir os sete pacotes públicos atuais por um único pacote canônico, aprofundado e versionado, sem perder proveniência, texto primário ou relações estruturadas.

Este documento registra o estado dos pacotes publicados em 24 de agosto de 2026. A remoção dos pacotes antigos só deve ocorrer depois de o pacote unificado passar por validação de importação, integridade e revisão editorial.

## Diagnóstico quantitativo

| Pacote | Páginas | Relações | Palavras aproximadas | Função atual |
| --- | ---: | ---: | ---: | --- |
| `tadeon-nexus-arden` | 73 | 72 | 17.078 | Cenário e fonte Arden |
| `tadeon-nexus-ciencias` | 7 | 6 | 14.839 | Ciências ardênicas |
| `tadeon-nexus-conexoes` | 61 | 173 | 6.863 | Sínteses e conexões transversais |
| `tadeon-nexus-geografia` | 11 | 10 | 20.123 | Geografia de Arden |
| `tadeon-nexus-lote-01` | 186 | 298 | 114.186 | União integral dos demais pacotes |
| `tadeon-nexus-regras` | 24 | 23 | 40.853 | Livro de Regras |
| `tadeon-nexus-urdidura` | 15 | 14 | 15.397 | Urdidura do Vazio |

O conjunto possui 377 cópias de páginas, mas somente 186 conteúdos únicos. As 191 cópias excedentes são duplicações idênticas; não existe chave lógica com versões conflitantes. Também não há relação apontando para página ausente.

Conclusão: `tadeon-nexus-lote-01` já é uma união sem perda dos seis pacotes temáticos. Ele deve ser usado como base material da consolidação, mas renomeado, revisado e aprofundado antes de substituir os downloads atuais.

## Corpus canônico reunido

| Núcleo | Páginas | Natureza editorial |
| --- | ---: | --- |
| Fontes | 5 | Documentos de origem e proveniência |
| Síntese transversal | 56 | Conceitos conectados, atualmente marcados para revisão |
| Urdidura | 14 | Cosmologia e metafísica canônicas |
| Regras | 23 | Regras primárias e referências mecânicas |
| Geografia | 10 | Corpo, história e territórios de Arden |
| Ciências | 6 | Ciência e tecnologia ardênicas |
| Cenário | 72 | História, povos, instituições, pressões e vida de Arden |

Total: 186 páginas e aproximadamente 114 mil palavras.

## Relações existentes

O manifesto unificado atual contém 298 relações:

- 125 relações estruturais `part_of` entre seções e fontes;
- 111 relações editoriais `custom` com o sentido “fundamentado em”;
- 62 relações semânticas, distribuídas entre `located_in`, `related_to`, `created_by`, `contains` e `precedes`.

As relações estruturais e de proveniência são sólidas. A principal lacuna é a baixa densidade semântica: apenas 62 relações descrevem efetivamente como 186 páginas interagem no mundo, na cosmologia e nas regras.

## Modelo do pacote único

Nome de trabalho: `tadeon-nexus-canonico`.

Estrutura proposta:

1. `00-fontes`: documentos de origem, edição, seção e rastreabilidade;
2. `01-conceitos`: verbetes transversais consolidados, com aliases e definições curtas;
3. `02-urdidura`: cosmologia, naturezas, domínios e fenômenos;
4. `03-regras`: regras, procedimentos, tabelas e referências rápidas;
5. `04-mundo`: geografia, história, povos, instituições e vida cotidiana;
6. `05-ciencias`: disciplinas, tecnologias, limitações e aplicações;
7. `06-entidades`: personagens, criaturas, organizações, lugares e objetos;
8. `07-narrativa`: ameaças, mistérios, ganchos, campanhas e consequências;
9. `08-indices`: glossário, mapas de relações, listas temáticas e trilhas de leitura.

## Trabalho editorial antes da substituição

Cada página deve receber:

- camada canônica explícita: `primary_source`, `cross_source_synthesis` ou `derived_play_aid`;
- referências de origem por documento e seção;
- aliases, tags controladas e tipo de nó consistente;
- resumo curto para cartões e busca;
- conexões bidirecionais úteis no contexto do leitor;
- distinção entre fato canônico, interpretação editorial e proposta de jogo;
- revisão de termos duplicados ou próximos, preservando redirecionamentos;
- ligações entre conceito cosmológico, consequência mecânica, manifestação no cenário e uso narrativo.

## Taxonomia de conexões a aprofundar

As relações genéricas `related_to` e `custom` devem ser substituídas, quando possível, por verbos específicos:

- origem: `emerges_from`, `created_by`, `derived_from`;
- composição: `contains`, `composed_of`, `manifests_as`;
- espaço: `located_in`, `borders`, `connects_to`;
- tempo: `precedes`, `succeeds`, `coincides_with`;
- regra: `governs`, `requires`, `resists`, `causes`, `costs`;
- narrativa: `threatens`, `protects`, `opposes`, `seeks`, `conceals`;
- conhecimento: `documents`, `contradicts`, `interprets`, `reveals`;
- jogo: `used_by`, `applies_to`, `resolved_with`.

## Critérios para trocar os downloads

O pacote único só substitui os sete atuais quando:

1. todas as 186 páginas forem importadas sem perda;
2. nenhuma relação tiver origem ou destino ausente;
3. chaves e aliases forem únicos;
4. a proveniência das fontes primárias estiver preservada;
5. as sínteses em revisão estiverem aprovadas ou claramente marcadas;
6. busca, backlinks, Teia e Árvore funcionarem com o corpus completo;
7. exportar e reimportar o pacote produzir o mesmo grafo;
8. os downloads antigos permanecerem disponíveis durante uma janela de migração.

## Próximo passe

O aprofundamento deve começar pelos 56 verbetes de síntese, pois eles são a ponte entre Urdidura, Regras, Arden, Geografia e Ciências. Para cada verbete, comparar as fontes primárias, enriquecer definição e consequências, criar relações semânticas específicas e só então incorporar entidades e material narrativo derivado.
