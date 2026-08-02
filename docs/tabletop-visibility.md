# Mesa Nexus — iluminação e névoa

## Escopo

O módulo é controlado por `nexus_lighting_enabled`. Com a flag desligada, o
editor não consulta nem altera paredes, luzes ou névoa e cenas antigas continuam
totalmente iluminadas.

O mestre pode configurar:

- luz ambiente entre 0% e 100%;
- segmentos de parede e estados de porta;
- fontes de luz com raio, intensidade, cor e sombras;
- operações ordenadas de revelar e ocultar névoa.

## Contrato e concorrência

`save_tabletop_visibility_state` substitui o conjunto da cena em uma única
transação `SECURITY INVOKER`. O cliente envia `visibility_version`; uma versão
desatualizada gera conflito, sem sobrescrever a edição mais recente. O serviço
também lê a nova versão base da cena para que o salvamento comum não fique
obsoleto após salvar iluminação.

Limites do contrato:

| Recurso | Limite por cena |
| --- | ---: |
| Paredes | 512 |
| Luzes | 256 |
| Operações de névoa | 512 |
| Pontos por operação | 64 |

## Segurança da projeção

As tabelas autoritativas têm RLS somente para mestre/co-mestre da campanha.
Participantes recebem a projeção pela Edge Function autenticada `tabletop-view`.
Ela nunca devolve segmentos de paredes; os polígonos de luz são calculados no
servidor e limitados antes da resposta. Camadas de mestre, entidades marcadas
como ocultas, proprietários, vínculos e propriedades privadas continuam fora do
contrato validado pelo frontend.

As URLs de assets do Supabase continuam privadas e assinadas por cinco minutos.
Nenhuma chave de serviço ou segredo entra no bundle do navegador.

## Compatibilidade

Cenas existentes recebem `global_illumination = 1`, `fog_enabled = false` e
listas vazias. Assim, habilitar o código sem habilitar a flag não muda a aparência
ou o fluxo atual. A migration só adiciona colunas, tabelas, políticas e uma RPC;
ela não remove nem migra dados antigos.
