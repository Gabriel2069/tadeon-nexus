# E-mails do Tadeon Nexus

Os modelos versionados em `supabase/templates` cobrem confirmação, convite, recuperação de senha
e troca de e-mail. O `config.toml` os utiliza no desenvolvimento local.

Em projetos hospedados, copie os assuntos e HTML para **Authentication → Emails → Templates**.
O Supabase também permite aplicar os mesmos campos pela Management API. Nunca armazene um token
de conta no repositório.

Antes de liberar:

- configure o Site URL e a lista de Redirect URLs para o domínio publicado;
- envie um teste de cada fluxo;
- confira contraste no modo claro/escuro do cliente de e-mail;
- mantenha rastreamento de links desligado no SMTP, pois ele pode alterar links de autenticação;
- use SMTP próprio quando houver um domínio disponível e um provedor gratuito compatível.
