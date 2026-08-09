#!/usr/bin/env python3
"""Generate copy-ready Supabase Auth email bodies for Tadeon Nexus."""

from __future__ import annotations

from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "supabase" / "email-templates"


TEMPLATES = [
    {
        "file": "confirm-signup.html",
        "subject": "Confirme seu fio no Tadeon Nexus",
        "preheader": "Confirme seu endereço para concluir a entrada no arquivo.",
        "eyebrow": "ABERTURA DE FIO · IDENTIDADE",
        "title": "Seu lugar no arquivo está quase pronto.",
        "intro": "Um novo fio foi reconhecido pelo Tadeon Nexus. Confirme seu endereço para concluir a abertura da conta e entrar no arquivo vivo de Tessitura do Vazio.",
        "action": ("Confirmar meu endereço", "{{ .ConfirmationURL }}"),
        "detail_title": "Depois da confirmação",
        "detail": "Você retornará ao Nexus para acessar fichas, campanhas e as áreas liberadas para o seu papel.",
    },
    {
        "file": "invite-user.html",
        "subject": "Você foi convidado para o Tadeon Nexus",
        "preheader": "Aceite o convite e entre no arquivo da campanha.",
        "eyebrow": "CONVITE · ARQUIVO COMPARTILHADO",
        "title": "Há um lugar reservado para você no Nexus.",
        "intro": "Alguém abriu uma passagem para que este endereço faça parte do Tadeon Nexus. Aceite o convite para criar sua chave de acesso e entrar no arquivo da campanha.",
        "action": ("Aceitar convite", "{{ .ConfirmationURL }}"),
        "detail_title": "Convite destinado a",
        "detail": "{{ .Email }}",
    },
    {
        "file": "magic-link.html",
        "subject": "Seu acesso ao Tadeon Nexus",
        "preheader": "Use este acesso único para entrar no Nexus.",
        "eyebrow": "ACESSO ÚNICO · SESSÃO",
        "title": "A passagem está aberta.",
        "intro": "Use o acesso abaixo para entrar no Tadeon Nexus sem digitar sua senha. Esta passagem é pessoal, temporária e deve ser usada somente no dispositivo em que você solicitou a entrada.",
        "action": ("Entrar no Tadeon Nexus", "{{ .ConfirmationURL }}"),
        "detail_title": "Endereço solicitado",
        "detail": "{{ .Email }}",
    },
    {
        "file": "change-email.html",
        "subject": "Confirme seu novo endereço no Nexus",
        "preheader": "Autorize a alteração do endereço vinculado à sua conta.",
        "eyebrow": "ALTERAÇÃO DE IDENTIDADE · E-MAIL",
        "title": "Confirme o novo endereço do seu fio.",
        "intro": "Recebemos uma solicitação para alterar o endereço de acesso ao Tadeon Nexus. Confirme somente se você iniciou esta mudança dentro das configurações da sua conta.",
        "action": ("Confirmar novo endereço", "{{ .ConfirmationURL }}"),
        "detail_title": "Novo endereço",
        "detail": "{{ .NewEmail }}",
    },
    {
        "file": "reset-password.html",
        "subject": "Reconstrua sua chave de acesso",
        "preheader": "Crie uma nova senha para o Tadeon Nexus.",
        "eyebrow": "RECUPERAÇÃO · CHAVE DE ACESSO",
        "title": "Uma nova chave pode ser tecida agora.",
        "intro": "Foi solicitada a recuperação da senha vinculada a este endereço. O botão abaixo abre uma passagem segura para criar uma nova chave de acesso ao Nexus.",
        "action": ("Criar nova senha", "{{ .ConfirmationURL }}"),
        "detail_title": "Importante",
        "detail": "A passagem é temporária. Se ela expirar, solicite uma nova recuperação na tela de entrada.",
    },
    {
        "file": "reauthentication.html",
        "subject": "Código de confirmação do Tadeon Nexus",
        "preheader": "Use o código para confirmar uma ação sensível.",
        "eyebrow": "REAUTENTICAÇÃO · AÇÃO SENSÍVEL",
        "title": "Confirme que este fio ainda é seu.",
        "intro": "Uma ação sensível foi iniciada no Tadeon Nexus. Digite o código abaixo na tela que fez a solicitação. Não compartilhe este código, nem mesmo com mestres ou administradores.",
        "code": "{{ .Token }}",
        "detail_title": "Uso único",
        "detail": "Este código confirma apenas a solicitação atual e perde a validade após o prazo definido no projeto.",
    },
    {
        "file": "password-changed.html",
        "subject": "Sua senha do Tadeon Nexus foi alterada",
        "preheader": "Aviso de segurança sobre sua chave de acesso.",
        "eyebrow": "SEGURANÇA · SENHA ALTERADA",
        "title": "Sua chave de acesso foi modificada.",
        "intro": "A senha vinculada à sua conta no Tadeon Nexus foi alterada com sucesso. Esta é uma notificação de segurança; nenhuma confirmação adicional é necessária.",
        "action": ("Abrir o Nexus", "{{ .SiteURL }}"),
        "detail_title": "Conta",
        "detail": "{{ .Email }}",
        "alert": True,
    },
    {
        "file": "email-changed.html",
        "subject": "O endereço da sua conta Nexus foi alterado",
        "preheader": "Aviso de segurança sobre a identidade da sua conta.",
        "eyebrow": "SEGURANÇA · E-MAIL ALTERADO",
        "title": "O endereço do seu fio foi atualizado.",
        "intro": "O endereço usado para entrar no Tadeon Nexus foi alterado. Esta mensagem foi enviada para registrar a mudança e permitir que você reconheça qualquer atividade indevida.",
        "action": ("Abrir o Nexus", "{{ .SiteURL }}"),
        "detail_title": "Endereço anterior → atual",
        "detail": "{{ .OldEmail }} → {{ .Email }}",
        "alert": True,
    },
    {
        "file": "phone-changed.html",
        "subject": "O telefone da sua conta Nexus foi alterado",
        "preheader": "Aviso de segurança sobre os dados da sua conta.",
        "eyebrow": "SEGURANÇA · TELEFONE ALTERADO",
        "title": "O telefone vinculado ao seu fio mudou.",
        "intro": "O telefone associado à sua conta no Tadeon Nexus foi alterado. Esta mensagem apenas registra a mudança e não contém códigos de acesso.",
        "action": ("Abrir o Nexus", "{{ .SiteURL }}"),
        "detail_title": "Telefone anterior → atual",
        "detail": "{{ .OldPhone }} → {{ .Phone }}",
        "alert": True,
    },
    {
        "file": "identity-linked.html",
        "subject": "Um novo método de entrada foi vinculado ao Nexus",
        "preheader": "Aviso de segurança sobre seus métodos de acesso.",
        "eyebrow": "SEGURANÇA · MÉTODO VINCULADO",
        "title": "Uma nova passagem foi ligada à sua conta.",
        "intro": "Um novo método de entrada foi vinculado à sua conta no Tadeon Nexus. A partir de agora, ele também poderá ser usado para iniciar uma sessão.",
        "action": ("Revisar minha conta", "{{ .SiteURL }}"),
        "detail_title": "Provedor vinculado",
        "detail": "{{ .Provider }}",
        "alert": True,
    },
    {
        "file": "identity-unlinked.html",
        "subject": "Um método de entrada foi removido do Nexus",
        "preheader": "Aviso de segurança sobre seus métodos de acesso.",
        "eyebrow": "SEGURANÇA · MÉTODO REMOVIDO",
        "title": "Uma passagem foi desligada da sua conta.",
        "intro": "Um método de entrada foi removido da sua conta no Tadeon Nexus e não poderá mais ser usado para iniciar uma sessão.",
        "action": ("Revisar minha conta", "{{ .SiteURL }}"),
        "detail_title": "Provedor removido",
        "detail": "{{ .Provider }}",
        "alert": True,
    },
    {
        "file": "mfa-added.html",
        "subject": "Uma verificação adicional foi ativada no Nexus",
        "preheader": "Aviso de segurança sobre a proteção da sua conta.",
        "eyebrow": "SEGURANÇA · VERIFICAÇÃO ADICIONADA",
        "title": "Seu fio recebeu uma nova camada de proteção.",
        "intro": "Um método de verificação adicional foi adicionado à sua conta no Tadeon Nexus. Ele poderá ser solicitado para confirmar acessos ou ações sensíveis.",
        "action": ("Revisar minha conta", "{{ .SiteURL }}"),
        "detail_title": "Método adicionado",
        "detail": "{{ .FactorType }}",
        "alert": True,
    },
    {
        "file": "mfa-removed.html",
        "subject": "Uma verificação adicional foi removida do Nexus",
        "preheader": "Aviso de segurança sobre a proteção da sua conta.",
        "eyebrow": "SEGURANÇA · VERIFICAÇÃO REMOVIDA",
        "title": "Uma camada de proteção foi retirada do seu fio.",
        "intro": "Um método de verificação adicional foi removido da sua conta no Tadeon Nexus e não será mais solicitado durante acessos ou ações sensíveis.",
        "action": ("Revisar minha conta", "{{ .SiteURL }}"),
        "detail_title": "Método removido",
        "detail": "{{ .FactorType }}",
        "alert": True,
    },
]


def action_html(label: str, url: str) -> str:
    return f"""
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 26px;">
        <tr>
          <td align="left">
            <a href="{url}" style="display:inline-block;padding:15px 22px;border:1px solid #d9d7a4;border-radius:12px 4px 12px 4px;background:#d9d7a4;color:#080a0e;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:18px;text-decoration:none;box-shadow:0 14px 34px rgba(0,0,0,.28);">{escape(label)}</a>
          </td>
        </tr>
      </table>
    """


def code_html(code: str) -> str:
    return f"""
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 24px;">
        <tr>
          <td align="center" style="padding:20px 18px;border:1px solid #3c3832;border-radius:14px 5px 14px 5px;background:#090b0f;color:#f2eec8;font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:8px;line-height:36px;">{code}</td>
        </tr>
      </table>
    """


def render(template: dict) -> str:
    action = template.get("action")
    code = template.get("code")
    primary = action_html(*action) if action else code_html(code)
    fallback = ""
    if action and action[1] == "{{ .ConfirmationURL }}":
        fallback = """
          <p style="margin:18px 0 0;color:#7f8289;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
          <p style="margin:5px 0 0;word-break:break-all;color:#a9a99b;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:16px;">{{ .ConfirmationURL }}</p>
        """
    alert = ""
    if template.get("alert"):
        alert = """
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border-collapse:separate;">
            <tr>
              <td style="padding:14px 15px;border-left:3px solid #74242d;background:#171216;color:#c8c5bc;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;"><strong style="color:#e9e3d5;">Não reconhece esta mudança?</strong><br>Abra o Nexus por um endereço conhecido, altere sua senha e encerre as outras sessões. Não responda a esta mensagem.</td>
            </tr>
          </table>
        """

    return f"""<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>{escape(template['subject'])}</title>
  </head>
  <body style="margin:0;padding:0;background:#080a0e;color:#e9e3d5;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{escape(template['preheader'])}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#080a0e" style="width:100%;background:#080a0e;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border:1px solid #2a2e35;border-top:2px solid #74242d;border-radius:20px 7px 20px 7px;background:#111318;box-shadow:0 28px 70px rgba(0,0,0,.35);border-collapse:separate;overflow:hidden;">
            <tr>
              <td style="padding:24px 30px;border-bottom:1px solid #252930;background:#0c0e12;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="48" valign="middle">
                      <div style="width:38px;height:38px;border:1px solid #54513e;border-radius:12px 4px 12px 4px;background:#17181b;color:#d9d7a4;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:38px;text-align:center;">◉</div>
                    </td>
                    <td valign="middle">
                      <p style="margin:0;color:#d9d7a4;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:22px;">Tadeon Nexus</p>
                      <p style="margin:3px 0 0;color:#777b82;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:1.6px;line-height:12px;">FIO-MESTRE · ARQUIVO VIVO</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:38px 30px 32px;background:linear-gradient(145deg,#15171c,#101216);">
                <p style="margin:0 0 12px;color:#9f955f;font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;letter-spacing:1.8px;line-height:15px;">{escape(template['eyebrow'])}</p>
                <h1 style="margin:0;max-width:500px;color:#f2f0dc;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:600;letter-spacing:-.6px;line-height:38px;">{escape(template['title'])}</h1>
                <p style="margin:18px 0 0;max-width:520px;color:#b8b6af;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:23px;">{escape(template['intro'])}</p>
                {primary}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
                  <tr>
                    <td style="padding:15px 16px;border:1px solid #2b3037;border-radius:12px 4px 12px 4px;background:#0d0f13;">
                      <p style="margin:0;color:#7f8289;font-family:'Courier New',Courier,monospace;font-size:9px;font-weight:700;letter-spacing:1.4px;line-height:14px;">{escape(template['detail_title']).upper()}</p>
                      <p style="margin:6px 0 0;color:#d1cec4;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;">{template['detail']}</p>
                    </td>
                  </tr>
                </table>
                {alert}
                {fallback}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 30px 26px;border-top:1px solid #252930;background:#0c0e12;">
                <p style="margin:0;color:#777b82;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;">Esta mensagem automática protege uma ação vinculada ao Tadeon Nexus. Nunca enviaremos pedido de senha, token ou código por resposta de e-mail.</p>
                <p style="margin:14px 0 0;color:#545860;font-family:'Courier New',Courier,monospace;font-size:9px;letter-spacing:1.2px;line-height:15px;">TESSITURA DO VAZIO · CONTINUIDADE PRESERVADA</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for template in TEMPLATES:
        destination = OUTPUT / template["file"]
        destination.write_text(render(template), encoding="utf-8")
        print(f"{template['file']}: {template['subject']}")


if __name__ == "__main__":
    main()
