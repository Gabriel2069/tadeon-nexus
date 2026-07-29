# Tadeon Nexus — Nexus Assets

Nexus Assets é a camada unificada de arquivos do Tadeon Nexus. Ela separa o catálogo e as
permissões do local físico em que o arquivo é armazenado.

Nesta entrega, o provedor funcional é o Supabase Storage. O contrato do R2 já existe, mas retorna
`ASSET_PROVIDER_UNAVAILABLE` até que o Worker privado da fase R2 seja implantado. Nenhuma
credencial do R2 pertence ao frontend.

## Ativação

A experiência atual não muda enquanto `nexus_assets_v2_enabled` permanecer desligada. A flag é
necessária para reservar novos uploads e começa desligada em todos os ambientes.

## Componentes

| Camada                   | Responsabilidade                                                    |
| ------------------------ | ------------------------------------------------------------------- |
| `AssetService`           | reservas, upload, catálogo, paginação, busca, uso, links e exclusão |
| `AssetStorageAdapter`    | contrato físico de upload, acesso temporário e remoção              |
| `SupabaseStorageAdapter` | upload privado com progresso e cancelamento                         |
| `R2StorageAdapter`       | contrato inativo para a integração pelo Cloudflare Worker           |
| Postgres e RLS           | autorização final, quotas, metadados, vínculos e auditoria          |
| Supabase Storage         | binários privados do provedor `supabase`                            |

Nenhum binário é armazenado no Postgres.

## Fluxo de upload Supabase

1. o navegador valida tamanho, MIME e extensão;
2. `AssetService` cria um UUID e um caminho interno sem usar o nome enviado pelo navegador;
3. o banco reserva o caminho e a quota em `asset_upload_sessions`;
4. o navegador envia diretamente ao bucket privado com JWT do usuário;
5. o catálogo só aceita o registro quando o objeto reservado existe e seus metadados conferem;
6. a sessão termina como `completed`, `cancelled` ou `failed`.

O caminho interno segue `workspace_id/user_id/asset_id.ext`. O nome original existe apenas como
metadado e nunca controla caminhos.

## Formatos e limites

O bucket privado `nexus-assets` usa limite físico de 25 MiB por arquivo e uma whitelist explícita
para imagens, PDF, texto, Markdown, CSV, JSON, áudio, vídeo e documentos Office modernos.
Executáveis e `application/octet-stream` são rejeitados.

Cada workspace recebe quotas separadas por provedor:

- Supabase Storage: 512 MiB no catálogo e 25 MiB por arquivo;
- Cloudflare R2: 8 GiB no catálogo e 25 MiB por arquivo, ainda inativo.

As quotas podem ser ajustadas por administrador no banco. O bloqueio ocorre antes do upload.

## Visibilidade e autorização

Os níveis são `private`, `workspace` e `campaign`. A interface usa a autorização central de
`src/lib/permissions.ts`, mas a autoridade final é sempre a RLS.

- autor, administradores e curadores autorizados podem gerenciar;
- membros autorizados veem somente o escopo a que pertencem;
- observadores são somente leitura;
- usuário sem vínculo não recebe linhas do catálogo nem do Storage;
- downloads usam URL temporária de curta duração.

## Exclusão, vínculos e órfãos

`soft_delete_asset` arquiva metadados. Se houver vínculos, a operação é recusada até confirmação
explícita. A purga remove o objeto pela API do Storage; SQL nunca apaga diretamente
`storage.objects`.

Falha depois do envio pode deixar um objeto sem catálogo. `findSupabaseOrphans` identifica esses
objetos para revisão administrativa. Registros incompletos continuam identificáveis por estado e
sessão de upload.

## Compatibilidade

Referências legadas em formato de URL continuam sendo resolvidas diretamente. Nenhum arquivo
anterior é movido nesta fase. Uma migração futura poderá registrar arquivos antigos com
simulação, checksum, validação e rollback.

## Próximos cortes

1. seletor reutilizável, painel de uso e visualização de vínculos;
2. miniaturas geradas no cliente;
3. Worker R2 privado e URLs pré-assinadas;
4. ferramenta administrativa de migração, sem movimentação automática.
