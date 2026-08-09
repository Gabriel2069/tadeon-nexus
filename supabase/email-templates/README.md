# E-mails de autenticação — Tadeon Nexus

Templates HTML completos para colar em **Supabase Dashboard → Authentication → Email Templates**.
Cada arquivo é independente, usa estilos inline compatíveis com clientes de e-mail e não depende de
imagens ou fontes externas.

## Autenticação

| Painel do Supabase   | Assunto                                  | Corpo                   |
| -------------------- | ---------------------------------------- | ----------------------- |
| Confirm sign up      | `Confirme seu fio no Tadeon Nexus`       | `confirm-signup.html`   |
| Invite user          | `Você foi convidado para o Tadeon Nexus` | `invite-user.html`      |
| Magic link           | `Seu acesso ao Tadeon Nexus`             | `magic-link.html`       |
| Change email address | `Confirme seu novo endereço no Nexus`    | `change-email.html`     |
| Reset password       | `Reconstrua sua chave de acesso`         | `reset-password.html`   |
| Reauthentication     | `Código de confirmação do Tadeon Nexus`  | `reauthentication.html` |

## Notificações de segurança

| Painel do Supabase          | Assunto                                            | Corpo                    |
| --------------------------- | -------------------------------------------------- | ------------------------ |
| Password changed            | `Sua senha do Tadeon Nexus foi alterada`           | `password-changed.html`  |
| Email address changed       | `O endereço da sua conta Nexus foi alterado`       | `email-changed.html`     |
| Phone number changed        | `O telefone da sua conta Nexus foi alterado`       | `phone-changed.html`     |
| Sign-in method linked       | `Um novo método de entrada foi vinculado ao Nexus` | `identity-linked.html`   |
| Sign-in method removed      | `Um método de entrada foi removido do Nexus`       | `identity-unlinked.html` |
| Verification method added   | `Uma verificação adicional foi ativada no Nexus`   | `mfa-added.html`         |
| Verification method removed | `Uma verificação adicional foi removida do Nexus`  | `mfa-removed.html`       |

## Decisões de segurança

- Os fluxos de autenticação usam `{{ .ConfirmationURL }}`. Assim, o Supabase mantém a autoridade
  sobre token, tipo da ação, validade e redirecionamento permitido.
- A reautenticação usa somente `{{ .Token }}`, o código temporário emitido pelo Auth.
- As notificações exibem apenas as variáveis suportadas por seu tipo (`OldEmail`, `Provider`,
  `FactorType` etc.).
- Nenhum template solicita senha, token ou resposta ao e-mail.
- Configure a **Site URL** de produção e as Redirect URLs exatas antes de publicar os corpos.
- Projetos Free criados a partir de 3 de junho de 2026 precisam de SMTP próprio para personalizar
  templates. Projetos existentes mantêm a configuração anterior, segundo o changelog do Supabase.

Para regenerar todos os corpos após uma mudança visual, execute:

```bash
python scripts/build-supabase-email-templates.py
```

Referências: [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) e
[changelog de breaking changes](https://supabase.com/changelog?types=breaking-change).
