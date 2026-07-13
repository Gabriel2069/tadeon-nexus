# Tadeon Nexus

Aplicação web para gerenciar fichas, progressão de personagens e a mesa do Tadeon Nexus.

## Desenvolvimento local

Requisitos: Node.js 22 ou superior e npm.

1. Copie `.env.example` para `.env` e preencha as chaves públicas do Supabase.
   Mantenha `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente do servidor; nunca a exponha no navegador
   ou em commits.
2. Instale as dependências com `npm ci`.
3. Inicie o projeto com `npm run dev`.

## Validação

Execute `npm run check` antes de publicar alterações. O comando roda lint, verificação de tipos,
testes e o build de produção.

## Banco de dados

As alterações do Supabase ficam em `supabase/migrations`. A migration mais recente corrige as
permissões de exclusão de fichas e garante que cada usuário tenha exatamente um cargo.

## Backup

O histórico do GitHub é o backup principal do código. Um arquivo ZIP é uma cópia adicional útil,
mas não inclui o histórico de commits nem os dados do Supabase. Faça também backups/exportações do
banco e do Storage antes de mudanças importantes.
