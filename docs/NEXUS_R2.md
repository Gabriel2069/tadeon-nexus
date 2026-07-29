# Tadeon Nexus — Cloudflare R2

Esta integração acrescenta R2 como provedor opcional do Nexus Assets. Ela não substitui o
Supabase Storage e permanece inativa enquanto `nexus_r2_enabled` estiver desligada.

## Custo controlado

Em 29 de julho de 2026, a documentação oficial informa uma franquia mensal para R2 Standard de
10 GB-mês, 1 milhão de operações Classe A e 10 milhões de operações Classe B. O código limita o
catálogo a 8 GiB por workspace para manter margem, mas a Cloudflare continua sendo a autoridade de
cobrança. R2 exige ativar uma assinatura na conta; portanto, bucket, token e flags não devem ser
ativados sem revisar o painel de billing.

- preços: <https://developers.cloudflare.com/r2/pricing/>;
- URLs pré-assinadas: <https://developers.cloudflare.com/r2/api/s3/presigned-urls/>;
- configuração de CORS: <https://developers.cloudflare.com/r2/buckets/cors/>.

Somente a classe Standard deve ser utilizada. O código não exige plano pago, mas também não pode
impedir cobranças externas se a conta ultrapassar as franquias da Cloudflare.

## Fluxo

1. o frontend reserva sessão e quota no Supabase com o JWT do usuário;
2. o Worker valida o JWT na Auth API e relê a sessão usando o mesmo JWT;
3. o Worker gera uma URL `PUT` pré-assinada de cinco minutos;
4. o navegador envia o arquivo diretamente ao R2;
5. o Worker executa `HEAD` e confere tamanho e MIME;
6. o Worker grava uma confirmação curta usando `SUPABASE_SECRET_KEY`;
7. o Worker registra o asset usando novamente o JWT do usuário;
8. o trigger consome a confirmação e conclui a sessão.

A credencial de serviço só escreve a confirmação. Autorização de workspace/campanha, sessão e
registro continuam avaliadas com o JWT do usuário e pela RLS.

## Rotas no Worker

| Método   | Rota                                | Função                                |
| -------- | ----------------------------------- | ------------------------------------- |
| `POST`   | `/api/nexus-assets/request-upload`  | valida sessão e gera `PUT` temporário |
| `POST`   | `/api/nexus-assets/complete-upload` | verifica o objeto e registra o asset  |
| `GET`    | `/api/nexus-assets/:id/access`      | gera `GET` temporário                 |
| `HEAD`   | `/api/nexus-assets/:id`             | confirma existência autorizada        |
| `DELETE` | `/api/nexus-assets/:id`             | remove objeto já arquivado            |

Erros retornam apenas códigos seguros. Respostas de banco, segredos e detalhes do R2 não são
enviados ao navegador.

## Configuração necessária

Criar um bucket privado Standard chamado `nexus-assets-r2` e um token limitado a leitura e escrita
nesse bucket. Configurar no Worker:

| Variável                | Tipo                                              |
| ----------------------- | ------------------------------------------------- |
| `R2_ACCOUNT_ID`         | configuração de servidor                          |
| `R2_BUCKET_NAME`        | configuração de servidor, valor `nexus-assets-r2` |
| `R2_ACCESS_KEY_ID`      | segredo                                           |
| `R2_SECRET_ACCESS_KEY`  | segredo                                           |
| `SUPABASE_SECRET_KEY`   | segredo                                           |
| `NEXUS_ALLOWED_ORIGINS` | lista explícita separada por vírgulas             |

Nunca criar variáveis `VITE_` para esses segredos. Aplicar ao bucket a política
`cloudflare/r2-cors.example.json`, ajustando apenas domínios reais de produção e desenvolvimento.

## Ordem de ativação

1. criar bucket privado e CORS;
2. criar token limitado ao bucket;
3. cadastrar segredos no Worker;
4. publicar e testar as rotas com as flags desligadas;
5. ativar `nexus_assets_v2_enabled`;
6. testar Supabase Storage;
7. ativar `nexus_r2_enabled`;
8. testar upload, download, negação de acesso e quota;
9. manter Supabase como fallback.

Se qualquer verificação falhar, desligar apenas `nexus_r2_enabled`; assets do Supabase continuam
funcionando.
