# Mesa Nexus — contrato Realtime

Esta etapa prepara o transporte ao vivo sem ativá-lo. A flag global
`nexus_realtime_enabled` permanece desligada e não há override individual.

## Divisão de responsabilidades

- **Broadcast privado:** prévias efêmeras de arraste, ping, seleção, desenho e transição.
- **Presence privada:** identidade, papel, cena ativa, token controlado, estado, cor e horário.
- **Postgres:** somente o estado final validado e versionado, como a posição após soltar o token.

Nenhum pixel de movimento deve ser gravado no banco. Presence não recebe coordenadas de cursor.

## Canais

- `tabletop:scene:{sceneId}`
- `tabletop:session:{sessionId}`

Os identificadores precisam ser UUIDs válidos. Na integração seguinte, os canais devem ser criados
como privados e a autorização deve consultar campanha, sessão, papel e propriedade do token. O
nome do canal nunca substitui RLS nem a validação do estado persistente.

## Envelope de evento

Todo evento inclui versão do protocolo, ID, origem, cena, sequência monotônica e timestamp. O
receptor valida schema estrito, cena esperada, idade, tolerância de relógio, sequência e limite local.
Payloads desconhecidos, antigos, futuros, duplicados, fora de ordem ou excessivos são descartados.

O contrato limita listas, pontos, textos e coordenadas. Ele não aceita HTML, comandos, URLs,
credenciais ou objetos arbitrários.

## Segurança ainda obrigatória na integração

1. confirmar `nexus_realtime_enabled` antes de assinar qualquer canal;
2. autenticar com o JWT normal do usuário, nunca com service role no navegador;
3. autorizar entrada pelo vínculo existente de campanha/sessão;
4. omitir entidades e propriedades de mestre antes da transmissão;
5. permitir ao jogador mover somente token explicitamente controlável;
6. persistir a posição final pela operação transacional e otimista existente;
7. registrar somente eventos administrativos necessários, sem conteúdo secreto;
8. remover canais, Presence e listeners ao trocar de cena, encerrar sessão ou desmontar a tela.

## Próximo canário

A integração real só deve ser habilitada para o proprietário mestre depois de testar dois
navegadores, reconexão, posição final, entrada negada, token alheio, cena secreta e consumo do plano
gratuito. Em falha, remover o override e manter o editor persistente atual.
