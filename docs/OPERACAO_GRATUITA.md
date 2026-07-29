# Operação gratuita e recuperação

## Backup independente

O workflow `backup-independente.yml` exporta o PostgreSQL uma vez por semana e conserva cada
arquivo privado por 30 dias no GitHub Actions.

Configuração única:

1. No Supabase, copie a conexão do banco pelo pooler com SSL.
2. No GitHub, abra **Settings → Secrets and variables → Actions**.
3. Crie o secret `SUPABASE_DB_URL`.
4. Não cole a senha em issues, commits, arquivos `.env` ou conversas.
5. Execute manualmente **Backup independente do Supabase** e confirme que o artefato foi criado.

O backup contém o banco. Objetos do Storage, quando passarem a ser usados, exigirão uma rotina
separada.

## Cloudflare sem mensalidade

O projeto pode funcionar no Workers Free, que atualmente inclui 100 mil requisições diárias.
A mudança deve ser gradual:

1. manter a publicação atual ativa;
2. criar uma conta Cloudflare no plano Free;
3. conectar o repositório sem informar cartão;
4. cadastrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` como variáveis de build;
5. validar login, fichas, painel do mestre, recuperação de senha, PWA e rotas diretas;
6. somente então trocar os URLs de autenticação e domínio.

Se o limite gratuito for atingido, o serviço falha em vez de gerar cobrança automática no plano
Free. A hospedagem atual permanece como retorno até a validação final.
