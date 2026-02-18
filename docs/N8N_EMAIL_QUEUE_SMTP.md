# n8n: Email queue (SMTP) workflow

This doc describes how to adapt your n8n setup so that **emails are sent from the Supabase queue via SMTP** instead of creating Gmail drafts via the Gmail API.

## Current vs new flow

- **Before:** Next.js triggers n8n with Gmail OAuth tokens → n8n finds leads, generates drafts, creates Gmail drafts via API.
- **After (option A – hybrid):** Next.js still triggers n8n **without** tokens; n8n finds leads and writes draft content to Supabase `leads`. Your app (or a cron) **enqueues** those leads into `email_queue` with `scheduled_at`. A **second n8n workflow** runs every minute, reads pending rows from `email_queue`, loads SMTP credentials from `sender_accounts`, sends with nodemailer, then marks the row as `sent` and sets `leads.email_sent = true`.
- **After (option B – enqueue from app):** Same as A, but enqueue is done by your Next.js app (e.g. after campaign start when leads are ready, or via `POST /api/campaigns/[id]/enqueue`).

## 1. Database (already done in migration 023)

- **sender_accounts:** `id`, `user_id`, `email`, `smtp_host`, `smtp_port`, `smtp_user`, `smtp_pass_encrypted`, `imap_*`, `is_primary`.
- **email_queue:** `id`, `user_id`, `sender_account_id`, `lead_id`, `recipient`, `subject`, `body`, `scheduled_at`, `status` (pending | sent | failed | cancelled), `error_log`.

## 2. Next.js app (already done)

- **Preferences:** User adds SMTP account (Gmail → prefill `smtp.gmail.com:465`, App Password with help link).
- **Enqueue API:** `POST /api/campaigns/[id]/enqueue` bulk-inserts into `email_queue` with `scheduled_at` spaced 15–20 minutes apart.
- **Optional:** Encryption of `smtp_pass` before insert (set `SMTP_PASSWORD_ENCRYPTION_KEY` env, 32-byte hex).

## 3. n8n workflow: “Send from queue”

Run this workflow **every minute** (Cron).

### Node 1 – Schedule

- Trigger: **Every minute** (e.g. `* * * * *`).

### Node 2 – Supabase: get pending queue rows

- Operation: **Get many** (or use a custom query).
- Table: `email_queue`.
- Filter: `status` = `pending` AND `scheduled_at` <= `{{ $now.toISO() }}`.
- Limit: e.g. **5** per run to avoid bursts.
- Order: `scheduled_at` ASC.

Use your **Supabase** credentials (service role so RLS is bypassed and you can read `sender_accounts`).

### Node 3 – Loop / process each item

For **each** item from Node 2:

1. **Get SMTP credentials:** Supabase **Get one** from `sender_accounts` where `id` = `{{ $json.sender_account_id }}`.  
   You need the decrypted password: either store it in plain in a separate column for n8n-only, or call a small Next.js API that returns decrypted creds for a given `sender_account_id` (and protect it with a shared secret or service key).  
   *Simplest for n8n:* add a column `smtp_pass_plain` (or use a separate “n8n secrets” table) filled by your app when the user sets the App Password, and read that in n8n. Otherwise, use the encryption key only on the Next.js side and expose a single endpoint like `GET /api/sender-accounts/[id]/credentials?secret=...` that returns `{ host, port, user, pass }` for n8n.

2. **Send email (Code node with nodemailer):**

```javascript
const nodemailer = require('nodemailer');
const item = $input.first().json;

const transporter = nodemailer.createTransport({
  host: item.smtp_host,
  port: item.smtp_port,
  secure: item.smtp_port === 465,
  auth: {
    user: item.smtp_user,
    pass: item.smtp_pass,
  },
});

await transporter.sendMail({
  from: item.sender_email,
  to: item.recipient,
  subject: item.subject,
  text: item.body,
  html: item.body.replace(/\n/g, '<br>'),
});

return { json: { queueId: item.id, leadId: item.lead_id, ok: true } };
```

Use the fields from the **email_queue** row plus the SMTP credentials from **sender_accounts** (e.g. `sender_email` = `sender_accounts.email`).

3. **Supabase: update email_queue** – set `status` = `sent`, `updated_at` = now, `error_log` = null for `id` = `{{ $json.queueId }}`.

4. **Supabase: update leads** – set `email_sent` = true for `id` = `{{ $json.leadId }}` (if `leadId` is not null).

If **send** fails, update `email_queue` with `status` = `failed` and `error_log` = error message.

## 4. Getting decrypted SMTP password into n8n

- **Option A (implemented):** Your app stores the password encrypted in `sender_accounts.smtp_pass_encrypted`. Call **GET /api/n8n/sender-credentials?sender_account_id=UUID&secret=N8N_SECRET** (or `CRON_SECRET`). Returns `{ email, smtp_host, smtp_port, smtp_user, smtp_pass }`. n8n calls this before the Code node and passes the result into the Code node. Set `N8N_SECRET` or `CRON_SECRET` in `.env` and use the same value in n8n (e.g. in the HTTP Request node).
- **Option B:** Store a second column `smtp_pass_plain` (or a separate table) only for n8n, written by your app when the user submits the form; n8n reads it. Less secure but simpler.
- **Option C:** Use n8n’s built-in **SMTP** node and store credentials in n8n credentials, and only pass `recipient`, `subject`, `body` from Supabase; then you must still resolve which n8n credential to use per row (e.g. by mapping `sender_account_id` to a credential name). Possible but more wiring.

Recommendation: **Option A** – one protected API that returns decrypted SMTP credentials for a given `sender_account_id`, and n8n calls it and then uses the Code node (or the SMTP node with dynamic credentials).

## 5. Summary

1. **Database:** `email_queue` + `sender_accounts` (migration 023).
2. **Next.js:** Preferences SMTP form, enqueue API, optional encryption.
3. **n8n “Send from queue” workflow:** Cron every minute → Supabase get pending `email_queue` → for each row get sender credentials (from Supabase or from your API) → send with nodemailer → update `email_queue` to `sent` and `leads.email_sent` to true.

This keeps your existing Cursor/Supabase work intact and adds the queue + SMTP path alongside the current flow; you can switch campaigns to “queue mode” when sender accounts are configured and enqueue is used.
