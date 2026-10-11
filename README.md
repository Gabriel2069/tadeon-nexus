# Tadeon Nexus

Aplicação web para gerenciar fichas, progressão de personagens e a mesa do Tadeon Nexus.

## Organização e continuidade

O [índice de manutenção](docs/README.md) reúne o [estado de continuidade](docs/ai/00_ESTADO_ATUAL.md), o [mapa do código](docs/PROJECT_MAP.md), a [fila de trabalho](docs/WORKPLAN.md) e a [conciliação das PRs](docs/PR_RECONCILIATION.md).

`docs/project-continuity.json` é o registro único de tarefas, responsáveis e decisões. Rode `npm run sync:project` após alterá-lo; `npm run check:project` verifica mapas, caminhos, dependências e inventários. Planos históricos são referência, não uma segunda fila.

## Desenvolvimento local

Requisitos: Node.js 22 ou superior e npm.

1. Copie `.env.example` para `.env` e preencha as chaves públicas do Supabase.
   O frontend utiliza somente a publishable key. Operações administrativas ficam na Edge Function
   protegida `admin-users`; nenhuma service role key deve ser adicionada ao site.
2. Instale as dependências com `npm ci`.
3. Inicie o projeto com `npm run dev`.

## Validação

Execute `npm run check` antes de publicar alterações. O comando roda lint, verificação de tipos,
testes e o build de produção. A verificação inclui o contrato da arquitetura de estilos.

Antes de trabalhar na interface, leia [a base de manutenção](docs/FOUNDATION.md) e
as regras de [AGENTS.md](AGENTS.md). Edite os módulos responsáveis existentes; não acrescente
outra camada de correção para sobrepor as anteriores.

## Banco de dados

As alterações do Supabase ficam em `supabase/migrations`. A Edge Function `admin-users` concentra
as operações exclusivas do Mestre e valida a sessão antes de usar privilégios administrativos.

## Manutenção do projeto gratuito

O workflow `.github/workflows/manter-supabase-ativo.yml` chama a função
`public.project_heartbeat()` duas vezes ao dia. A função é `SECURITY INVOKER`, não lê tabelas,
não altera dados e pode ser executada manualmente pela aba **Actions** do GitHub.

A URL e a publishable key usadas pelo workflow são públicas por definição. Nunca substitua essa
chave por uma secret key ou pela service role key.

## Backup

O histórico do GitHub é o backup principal do código. Um arquivo ZIP é uma cópia adicional útil,
mas não inclui o histórico de commits nem os dados do Supabase. Faça também backups/exportações do
banco e do Storage antes de mudanças importantes.
