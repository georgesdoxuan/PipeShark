# Email de vérification : expéditeur hello@pipeshark.io

Les e-mails de vérification (création de compte, reset password, etc.) sont envoyés par **Supabase Auth**. Pour qu’ils apparaissent comme envoyés depuis **hello@pipeshark.io**, il faut configurer un **SMTP personnalisé** dans le projet Supabase.

## Configuration dans le Dashboard Supabase

1. Ouvre ton projet : [Supabase Dashboard](https://supabase.com/dashboard) → ton projet PipeShark.
2. Va dans **Authentication** → **SMTP** (ou **Settings** → **Auth** selon la version).
3. Active **Custom SMTP** et renseigne :
   - **Sender email** : `hello@pipeshark.io`
   - **Sender name** : `PipeShark` (ou le nom affiché souhaité)
   - **Host / Port / User / Password** : ceux fournis par ton fournisseur d’e-mail (Resend, Brevo, SendGrid, Postmark, etc.) pour envoyer depuis le domaine `pipeshark.io`.

Sans SMTP personnalisé, Supabase utilise son propre serveur (limité : 2 e-mails/heure, envoi uniquement vers les adresses de l’équipe du projet).

## Via l’API Management Supabase (optionnel)

Tu peux aussi configurer le SMTP via l’API :

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "smtp_admin_email": "hello@pipeshark.io",
    "smtp_sender_name": "PipeShark",
    "smtp_host": "smtp.ton-fournisseur.com",
    "smtp_port": 587,
    "smtp_user": "ton-user",
    "smtp_pass": "ton-mot-de-passe"
  }'
```

Remplace `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass` par les valeurs de ton fournisseur (ex. Resend : `smtp.resend.com`, port 465, user `resend`, password = API key).

## Domaine pipeshark.io

Pour que l’envoi depuis `hello@pipeshark.io` soit fiable et bien délivré :

- Le domaine doit être vérifié chez ton fournisseur SMTP.
- Configure **SPF**, **DKIM** et éventuellement **DMARC** pour `pipeshark.io` selon la doc de ton fournisseur (Resend, Brevo, etc.).

Aucun changement n’est nécessaire dans le code de l’app : tout se configure côté Supabase (Dashboard ou API ci-dessus).
