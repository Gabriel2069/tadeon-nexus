# Tadeon Nexus

Aplicação web para gerenciar fichas, progressão de personagens e a mesa do Tadeon Nexus.

## Desenvolvimento local

Requisitos: Node.js 22 ou superior e npm.

1. Copie `.env.example` para `.env` e preencha as chaves públicas do Supabase.
   O frontend utiliza somente a publishable key. Operações administrativas ficam na Edge Function
   protegida `admin-users`; nenhuma service role key deve ser adicionada ao site.
2. Instale as dependências com `npm ci`.
3. Inicie o projeto com `npm run dev`.

## Validação

Execute `npm run check` antes de publicar alterações. O comando roda lint, verificação de tipos,
testes e o build de produção.

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
