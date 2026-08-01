# Mesa Nexus — contrato Realtime

Esta etapa prepara o transporte ao vivo sem ativá-lo. A flag global
`nexus_realtime_enabled` permanece desligada e não há override individual.

## Divisão de responsabilidades

- **Broadcast privado:** prévias efêmeras de arraste, ping, seleção, desenho e transição.
- **Presence privada:** identidade, papel, cena ativa, token controlado, estado, cor e horário.
- **Postgres:** somente o estado final validado e versionado, como a posição após soltar o token.

Nenhum pixel de movimento deve ser gravado no banco. Presence não recebe coordenadas de cursor.

## Sala persistente

`tabletop_sessions` guarda somente campanha, cena atual, nome, estado, bloqueio de entrada, versão e
auditoria. Há no máximo uma sala aberta por campanha. `tabletop_session_participants` registra a
participação naquela sessão e deriva o papel de `campaign_members`; ela não substitui nem duplica o
cadastro permanente de membros.

Abrir, entrar, sair, trocar cena, bloquear entrada, remover participante e encerrar usam RPCs
`SECURITY INVOKER`. RLS exige a flag efetiva e o vínculo com a campanha. Alterações gerenciais usam
controle otimista de versão; participantes removidos não são apagados do histórico.

## Canais

- `tabletop:scene:{sceneId}`: arraste, ping, seleção e desenho.
- `tabletop:session:{sessionId}`: Presence e transição de cena.

Os identificadores precisam ser UUIDs válidos. O transporte cria os dois canais com
`private: true`, autentica o Realtime com o JWT atual antes da assinatura e solicita confirmação do
servidor para cada Broadcast. O nome do canal nunca substitui RLS nem a validação do estado
persistente.

## Envelope de evento

Todo evento inclui versão do protocolo, ID, origem, cena, sequência monotônica e timestamp. O
receptor valida schema estrito, cena esperada, idade, tolerância de relógio, sequência e limite local.
Payloads desconhecidos, antigos, futuros, duplicados, fora de ordem ou excessivos são descartados.

O contrato limita listas, pontos, textos e coordenadas. Ele não aceita HTML, comandos, URLs,
credenciais ou objetos arbitrários.

## Camada de transporte

`TabletopRealtimeTransport` é a única ponte prevista entre o domínio da Mesa e o cliente Supabase.
Ela não cria canal enquanto a flag efetiva estiver desligada e oferece:

- autenticação anterior à assinatura;
- separação de eventos por escopo de cena ou sessão;
- validação de entrada e saída pelo mesmo contrato;
- descarte da própria origem e proteção contra repetição e excesso;
- Presence reduzida aos campos conhecidos, ignorando metadados internos do provedor;
- mensagens de erro próprias, sem repassar detalhes brutos do banco à interface;
- `untrack`, remoção dos dois canais e limpeza do estado local ao desconectar.

O adaptador de cliente é injetável para que todos os fluxos sejam testados sem abrir conexões reais.

## Autorização no Realtime

A migration `tabletop_realtime_channel_authorization` instala políticas RLS em
`realtime.messages` para `authenticated`, sem criar tabelas, funções ou colunas no schema interno
gerenciado pelo Supabase.

- somente participante ativo de uma sessão aberta pode receber Presence e Broadcast;
- Presence só pode ser publicada no canal privado da própria sessão;
- Broadcast só pode ser publicado por mestre ou co-mestre, no canal da sessão ou da cena atual;
- usuário removido, ausente, fora da campanha ou com a flag desligada não satisfaz as políticas.

Antes do canário, a opção **Allow public access** também deve estar desligada nas configurações de
Realtime do projeto.

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

A integração real só deve ser habilitada para o proprietário mestre depois de confirmar a opção de
acesso público desligada e testar dois navegadores, reconexão, posição final, entrada negada, token
alheio, cena secreta e consumo do plano gratuito. Em falha, remover o override e manter o editor
persistente atual.
