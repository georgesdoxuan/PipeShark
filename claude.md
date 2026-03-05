# PipeShark – Contexte complet pour modifications

Ce document décrit **tout** le projet PipeShark pour permettre des modifications sans erreur (contexte pour Claude Code ou tout autre outil).

---

## 0. Produit & positionnement (SaaS)

**Cible** : Entrepreneurs, micro-entreprises, auto-entrepreneurs, freelances dont l’activité vise les **business locaux présents sur Google Maps** (ex. : coffee shop, restaurant, dentiste, kiné, club de tennis, plombier, électricien, etc.).

**Offre** : Le SaaS PipeShark permet de :
- **Trouver des leads** : jusqu’à **30 leads par jour** en scrapant Google Maps via une **recherche personnalisée** définie dans l’app (type de business, ville, zone).
- **Rédiger des mails personnalisés** : pour chaque lead, l’**IA génère un email** qui fait le lien entre le lead (analyse de leur site, ratings, etc.) et **l’entreprise de l’utilisateur** (description, objectif, ton).
- **Envoyer comme un humain** : envoi à des **horaires aléatoires** dans les **créneaux business** (ex. 9h–18h), pour limiter le côté “spam” et ressembler à une prospection manuelle.
- **Connexion boîtes mail** : l’utilisateur connecte **sa/ses boîte(s) mail** au SaaS (OAuth Gmail) ; les brouillons ou envois passent par son compte.

**Envoi des mails (à clarifier dans l’app) :**
- **Génération des leads** : lors du run leadgen, un **brouillon Gmail** est créé pour chaque lead via la **Gmail API** (`createGmailDraft`) ; le texte du mail est aussi stocké en base (`leads.draft`, `leads.gmail_thread_id`). Donc à ce stade, c’est toujours **Gmail (brouillon)**.
- **Mise en file (enqueue)** : les leads sont ajoutés à `email_queue` avec des créneaux horaires aléatoires (heures business). Pour **envoyer** ou **créer un brouillon** à l’heure dite, le système utilise soit **SMTP** soit **Gmail** selon la préférence utilisateur.
- **Choix de l’utilisateur (Preferences)** : `mail_connection_type` = **`smtp`** ou **`gmail`** (API `PATCH /api/preferences/mail-connection`). Ce choix détermine **comment** le mail part quand la file est traitée (cron process-email-queue).
- **SMTP** : l’utilisateur configure un ou plusieurs **sender accounts** (compte email + identifiants SMTP) dans Preferences. À l’enqueue, chaque ligne de la file est associée à un `sender_account_id`. Au moment du traitement : **envoi direct** via Nodemailer (SMTP). Pas de brouillon Gmail dans ce cas (si `delivery_type = 'draft'`, on marque juste l’item comme “draft” en base, sans créer de brouillon dans Gmail).
- **Gmail** : l’utilisateur connecte Gmail (OAuth) dans Preferences. À l’enqueue (côté cron / Daily launch), les lignes sont créées avec `connection_type = 'gmail'`. Au moment du traitement : soit **envoi direct** via **Gmail API** (`sendGmailMessage`), soit **création d’un brouillon Gmail** (`createGmailDraft`) si `delivery_type = 'draft'`.
- **Résumé** : **pas les deux en même temps** — l’utilisateur choisit **un** mode (SMTP **ou** Gmail) dans Preferences. Les brouillons initiaux (leadgen) sont toujours créés en Gmail. L’envoi / la création de brouillons planifiés se fait soit en SMTP (envoi uniquement), soit en Gmail (envoi ou brouillon selon `delivery_type`).
- **État actuel du code** : l’enqueue **manuel** (bouton sur une campagne) exige un **sender account SMTP** pour l’email de la campagne et n’envoie pas `connection_type` ni `delivery_type` → défaut **SMTP + send**. L’enqueue **automatique** (cron après Daily launch) utilise la préférence `mail_connection_type` et peut donc enqueue en Gmail ou SMTP, avec `delivery_type` send ou draft.

**Tarification** :
- **1 boîte mail connectée**, 1000 mails / mois : **19 € / mois**.
- **À partir de 5 licences** (5 boîtes mail) : **15 € / mois** par licence.

Toute évolution (copy, pricing, limites de crédits, wording) doit rester cohérente avec ce positionnement B2B local et ce modèle d’abonnement.

---

## 1. Vue d’ensemble

- **Nom produit** : PipeShark (nom de code repo : harpon1).
- **Description** : Outil de prospection automatisée pour artisans (plombiers, etc.) : recherche de leads (HasData Google Maps), scrape de sites, résumé IA, génération d’emails, brouillons Gmail, file d’envoi SMTP, dashboard campagnes, Call Center pour suivi d’appels.
- **Stack** : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (auth + DB), déploiement Netlify.
- **Langue UI** : tout en **anglais** (y compris dashboard, erreurs, tooltips). `lang="en"` dans le layout.
- **Build** : `npx next build --webpack` (défini dans l’UI Netlify pour éviter conflits avec le plugin Next).

---

## 2. Structure du projet

```
app/
  layout.tsx              # Root layout (Montserrat, ThemeProvider, ApiPauseProvider, CampaignLoadingProvider)
  page.tsx                # Redirige vers /landing
  globals.css
  error.tsx                # Page d’erreur globale (Try again, Home)
  landing/page.tsx        # Landing marketing
  login/, signup/         # Auth
  dashboard/
    page.tsx              # Dashboard principal (campagnes, stats, Daily launch, liste leads)
    layout.tsx            # Suspense wrapper
    business-descriptions/page.tsx
    exemple-mails/page.tsx
  campaigns/
    new/page.tsx          # Création de campagne (CampaignForm)
    [id]/page.tsx         # Détail campagne + Run + leads + enqueue
  call-center/page.tsx    # Tableau tous les leads + Preparation, Notes, Called, Comments, Folders
  messages/page.tsx       # Conversations / réponses
  profile/, preferences/  # Profil utilisateur, préférences, Gmail
  todo/page.tsx           # Kanban To-Do (todo/doing/done)
  contact/, pricing/, onboarding/
  article/page.tsx, article/silicon-trades/
  legal/                  # GDPR, privacy, terms
  api/                    # Toutes les routes API (voir section 4)
components/
  Header.tsx              # Nav + sidebar (Dashboard, Messages, Call Center, To-Do, Profile, Templates, Help, theme, logout)
  LeadsTable.tsx          # Tableau leads (filtres, draft modal, pagination)
  CardCurves.tsx          # Décoration bleue sur cartes campagnes
  BackgroundCurves.tsx    # Courbes fond pages
  AppBackgroundWrapper.tsx # Fond global
  CampaignForm.tsx        # Formulaire création/édition campagne
  StatsCards.tsx, CreditsGauge.tsx, ViperLogo.tsx, SenderAccountForm.tsx, EditCampaignModal.tsx
contexts/
  ThemeContext.tsx        # Thème clair/sombre (localStorage pipeshark-theme)
  ApiPauseContext.tsx     # isPaused / togglePause (pour dev)
  CampaignLoadingContext.tsx
lib/
  supabase-server.ts      # createServerSupabaseClient() (cookies), createAdminClient() (SUPABASE_SERVICE_ROLE_KEY)
  supabase.ts             # Client navigateur (NEXT_PUBLIC_SUPABASE_*)
  supabase-campaigns.ts   # CRUD campaigns, getCampaignById, getCampaignsByIdsAdmin
  supabase-leads.ts       # getLeadsForUser, mapLeadRecord (camelCase), updateLeadCallCenter, getAlreadyLaunchedToday, etc.
  supabase-schedule.ts    # user_schedule (launch_time, campaign_ids, timezone), getScheduledCampaignRunsNow, recordDailyLaunch
  supabase-email-queue.ts # email_queue (insert, getPendingQueueItemsAdmin, buildScheduledAtForLeads, etc.)
  supabase-gmail-accounts.ts
  supabase-call-center-folders.ts  # getFoldersForUser, createFolder
  supabase-cities.ts, supabase-company-descriptions.ts, supabase-email-templates.ts
  supabase-sender-accounts.ts, supabase-user-plan.ts, supabase-preferences.ts, supabase-todos.ts
  leadgen/
    pipeline.ts           # runLeadgenPipeline (HasData → scrape → AI summary + draft → Gmail draft → insert leads)
    hasdata.ts            # searchGoogleMapsLocal (HasData API)
    scrape.ts             # fetchPageHtml, extractEmailFromHtml, cleanHtmlToText, extractPhoneAndLinkedIn
    ai-draft.ts           # summarizeWebsite, generateDraftEmail (OpenAI)
  gmail.ts                # getValidGmailAccessToken (refresh)
  gmail-api.ts            # createGmailDraft, listThreads, getThread (Gmail API)
  country-timezone.ts, cities-countries.ts
  n8n.ts                  # Ancien appel webhook n8n (optionnel, pas utilisé pour campaign start)
netlify/
  functions/
    cron-launch.ts        # Appelle /api/cron/launch-scheduled-campaigns toutes les 15 min
    cron-process-queue.ts # Désactivé sur Netlify ; utilisé sur Scaleway (script)
scripts/
  cron-process-queue-scaleway.sh  # À exécuter sur Scaleway toutes les minutes (curl process-email-queue)
supabase-migrations/      # 001 à 031 (voir section 5)
docs/                     # CONFIGURATION.md, CRON_SCALEWAY.md, LEADGEN_WITHOUT_N8N.md
middleware.ts             # Supabase session refresh ; protection routes (dashboard, campaigns, profile, preferences, todo, API)
next.config.ts            # redirect / → /landing ; reactCompiler: true ; headers
```

---

## 3. Flux métier principaux

### 3.1 Leadgen (run de campagne)

- **Déclenchement** : bouton « Run » sur une campagne (`/campaigns/[id]`) ou cron Daily launch.
- **API** : `POST /api/campaign/start` (body : campaignId, businessType, cities, companyDescription, toneOfVoice, campaignGoal, magicLink, targetCount, mode, gmailEmail, etc.).
- **Pas de N8N_WEBHOOK_URL requis** : le pipeline tourne entièrement dans l’app.
- **Pipeline** (`lib/leadgen/pipeline.ts`) :
  1. HasData : `searchGoogleMapsLocal(business, city, HASDATA_API_KEY)`.
  2. Pour chaque résultat : fetch HTML du site → extraction email (cheerio), téléphone, LinkedIn, cleanHtmlToText.
  3. Filtre emails valides, limite à `targetCount`.
  4. Pour chaque lead : `summarizeWebsite` (OpenAI) → `generateDraftEmail` (OpenAI) → `createGmailDraft` (Gmail API) → insert dans `leads` (user_id, business_type, city, country, url, email, phone, linkedin, draft, gmail_thread_id, campaign_id, name, preparation_summary, date).
- **Colonnes leads importantes** : name, business_type, city, country, email, phone, linkedin, url, draft, gmail_thread_id, campaign_id, preparation_summary (synthèse site pour Call Center), date. Plus call_notes, called, comments, folder_id (Call Center).

### 3.2 Daily launch (cron)

- **Netlify** : `cron-launch` toutes les 15 min → `GET /api/cron/launch-scheduled-campaigns` (Bearer CRON_SECRET).
- **Logique** : `getScheduledCampaignRunsNow(simulateTime)` lit `user_schedule` (launch_time, timezone, campaign_ids), détermine qui doit lancer à cette heure (dans le créneau des 15 premières minutes de l’heure). Pour chaque run : vérifie `daily_launch_log` (idempotence), puis `runLeadgenPipeline` avec les paramètres de la campagne, attend les leads (poll), complémente si besoin (MAX_SUPPLEMENT_RUNS).
- **Test** : `GET /api/cron/launch-scheduled-campaigns?secret=CRON_SECRET&simulateTime=10:00` (une seule ligne, pas de retour à la ligne dans l’URL).
- **Réinitialiser un lancement du jour** : `DELETE FROM daily_launch_log WHERE launched_date = (CURRENT_DATE AT TIME ZONE 'UTC')::date;`

### 3.3 File d’emails (queue)

- **Endpoint** : `GET /api/cron/process-email-queue` (protégé CRON_SECRET). Charge les lignes `email_queue` (status = 'pending', scheduled_at <= now). Pour chaque ligne : si `delivery_type === 'send'` → appelle `/api/n8n/send-email` (envoi **SMTP** si `connection_type === 'smtp'`, **Gmail API** si `connection_type === 'gmail'`) ; si `delivery_type === 'draft'` → appelle `/api/n8n/create-draft` (brouillon Gmail si connection gmail, sinon simple marquage “draft” en base).
- **Sur Netlify** : la scheduled function `cron-process-queue` est **désactivée** (commentée dans netlify.toml).
- **Sur Scaleway** : exécuter `scripts/cron-process-queue-scaleway.sh` toutes les minutes (crontab), avec `APP_URL` et `CRON_SECRET`. Voir `docs/CRON_SCALEWAY.md`.

### 3.4 Enqueue (ajout à la file)

- Depuis le dashboard : choix des campagnes « Daily launch » puis bouton « Add to send queue ». `POST /api/schedule/enqueue` avec `campaignIds`. Insère dans `email_queue` avec `scheduled_at` réparti (heures de bureau), `delivery_type` = celui du user_schedule (drafts ou queue).

### 3.5 Call Center

- **Page** : `/call-center`. Tous les leads en tableau ; colonnes : Name, Business, City, Phone, URL, Preparation (fiche synthèse), Notes (texte), Called (checkbox), Comments, Folder, Email (à droite).
- **Filtre campagne** : sélecteur en haut (liste des campagnes via `/api/campaigns/list`).
- **Dossiers** : table `call_center_folders` (user_id, name). API `GET/POST /api/call-center/folders`. Un lead peut avoir `folder_id` (PATCH `/api/leads/[leadId]/call-center` : call_notes, called, comments, folder_id).
- **Icône** : `public/phone-receiver-silhouette.png` (sidebar + titre page Call Center). Filtres : `brightness-0` (noir), `dark:invert` (blanc en dark).

---

## 4. Routes API (liste exhaustive)

- **Auth Gmail** : `/api/auth/gmail` (redirect OAuth), `/api/auth/gmail/callback`, `/api/auth/gmail/status`, `/api/auth/gmail/disconnect`.
- **Campagnes** : `GET/POST /api/campaigns`, `GET/PATCH/DELETE /api/campaigns/[id]`, `GET /api/campaigns/list`, `GET /api/campaigns/count-today`, `GET /api/campaigns/[id]/leads`, `POST /api/campaigns/[id]/enqueue`.
- **Lancement** : `POST /api/campaign/start` (leadgen sans n8n).
- **Leads** : `GET /api/leads` (optionnel `?campaignId=`), `PATCH /api/leads/[leadId]/draft`, `PATCH /api/leads/[leadId]/call-center`.
- **Schedule** : `GET/POST /api/schedule` (launch_time, campaign_ids, timezone, launch_delivery_mode), `POST /api/schedule/enqueue`.
- **Cron** : `GET /api/cron/launch-scheduled-campaigns` (Bearer ou `?secret=` ; optionnel `?simulateTime=HH:MM`), `GET /api/cron/process-email-queue`.
- **Call Center** : `GET/POST /api/call-center/folders`.
- **n8n (internes)** : `/api/n8n/send-email`, `/api/n8n/create-draft`, `/api/n8n/sender-credentials`, `/api/n8n/trigger`, `/api/n8n/test` (N8N_WEBHOOK_URL optionnel).
- **Messages** : `/api/messages/conversations`, `/api/messages/thread`, `/api/messages/queue-item`.
- **Stats** : `GET /api/stats/replies-by-day`.
- **Autres** : `/api/notifications`, `/api/gmail/check-replies`, `/api/gmail/accounts`, `/api/cities`, `/api/company-descriptions`, `/api/email-templates`, `/api/sender-accounts`, `/api/preferences/mail-connection`, `/api/todos`, `/api/promo/redeem`, `/api/stripe/checkout`.

---

## 5. Base de données (Supabase)

### Tables principales

- **campaigns** : id, user_id, business_type, company_description, tone_of_voice, campaign_goal, magic_link, cities (TEXT[]), city_size, status, created_at, name (007), number_credits_used (002), campaign_id (003), mode (009), last_started_at (020), title_color (026), gmail_email (022).
- **leads** : table existante (créée hors migrations fournies ou par seed). Colonnes ajoutées en migrations : campaign_id (003), country (015), replied, replied_at, gmail_thread_id (016), email_sent (019), name (029), preparation_summary, call_notes, called, comments, folder_id (031). Interface dans `lib/supabase-leads.ts` : Lead avec camelCase en sortie (mapLeadRecord).
- **user_schedule** : user_id (PK), launch_time (HH:MM), campaign_ids (017), timezone (018), launch_delivery_mode (024), updated_at.
- **user_profiles** : id (auth.users), gmail_*, gmail_connected. Plus colonnes plan/promo/trial (021), mail_connection_type (027). Table `gmail_accounts` (022) pour Pro (plusieurs comptes Gmail).
- **email_queue** : id, user_id, sender_account_id, lead_id, recipient, subject, body, scheduled_at, status (pending/sent/failed/cancelled), delivery_type (send|draft) (025), error_log, created_at, updated_at.
- **sender_accounts** : id, user_id, email, smtp_*, imap_*, is_primary (023).
- **daily_launch_log** : user_id, campaign_id, launched_date (UTC date), UNIQUE(user_id, campaign_id, launched_date) (028).
- **call_center_folders** : id, user_id, name, created_at (030). RLS.

### Client Supabase

- **Côté serveur (RLS, user)** : `createServerSupabaseClient()` dans `lib/supabase-server.ts` (cookies Next).
- **Admin (bypass RLS)** : `createAdminClient()` (SUPABASE_SERVICE_ROLE_KEY). Utilisé par cron, pipeline, process-email-queue, getCampaignsByIdsAdmin, getPendingQueueItemsAdmin, etc.

### Migrations (ordre)

001 campaigns → 002 number_credits_used → 003 campaign_id leads → 004 user_schedule → 005 company_descriptions → 006–008 → 009 mode → 010 user_profiles_gmail → 011 todos → 012 todo_status → 013 email_templates → 014 cities → 015 country leads → 016 leads replied/gmail_thread_id → 017 scheduled_campaign_ids → 018 timezone → 019 email_sent leads → 020 last_started_at → 021 plan_promo_trial → 022 pro_gmail_accounts → 023 email_queue sender_accounts → 024 launch_delivery_mode → 025 delivery_type email_queue → 026 title_color campaigns → 027 mail_connection_type → 028 daily_launch_log → 029 name leads → 030 call_center_folders → 031 leads call_center columns.

---

## 6. Variables d’environnement

**Obligatoires** (voir `docs/CONFIGURATION.md`) :

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_REDIRECT_URI`, `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `HASDATA_API_KEY`
- `OPENAI_API_KEY`

**Optionnels** : `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_URL_LOCAL_BUSINESSES`, `N8N_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_ARTICLE_IMAGE_URL`, `NEXT_PUBLIC_VERCEL` (Analytics).

---

## 7. Middleware et protection

- **middleware.ts** : refresh session Supabase ; protège les pages `/dashboard`, `/campaigns`, `/profile`, `/preferences`, `/todo` (redirection vers `/login` si non authentifié) ; protège les API leads, campaign/start, campaigns, todos, company-descriptions, email-templates (401 si non authentifié). Redirect logged-in user depuis `/login` et `/signup` vers `/dashboard`. Matcher exclut `api/auth/gmail/callback`, `_next/static`, images, etc.
- **À savoir** : `/call-center` et `/messages` ne sont pas listés dans `isProtectedPage` ; les ajouter si ces pages doivent être réservées aux utilisateurs connectés.

---

## 8. Conventions de code

- **Frontend** : les réponses API qui viennent de Supabase sont mappées en **camelCase** (ex. campaignId, preparationSummary, folderId) dans `mapLeadRecord` et utilisées ainsi dans les composants.
- **Icônes** : Lucide React pour la plupart ; Call Center et titre Call Center utilisent l’image `public/phone-receiver-silhouette.png` avec filtres pour noir/white.
- **Thème** : ThemeContext + `pipeshark-theme` en localStorage ; classes `dark:` Tailwind pour le mode sombre.
- **Dashboard** : jours de la semaine en anglais (Sun, Mon, Tue, …) pour le graphique « Replies this week » (tableau `repliesByDay`).

---

## 9. Déploiement et cron

- **Netlify** : plugin `@netlify/plugin-nextjs`. Build : `npx next build --webpack`, Publish : `.next`. Une seule scheduled function active : `cron-launch` (`*/15 * * * *`).
- **Scaleway** : script `cron-process-queue-scaleway.sh` à exécuter chaque minute (crontab) avec `APP_URL` et `CRON_SECRET` pour appeler `GET /api/cron/process-email-queue`.

---

## 10. Fichiers sensibles / à ne pas casser

- **lib/supabase-server.ts** : utilisé partout côté serveur ; createAdminClient requis pour cron et pipeline.
- **lib/leadgen/pipeline.ts** : insert dans `leads` avec les colonnes exactes (name, preparation_summary, etc.) ; pas de N8N_WEBHOOK dans campaign/start.
- **lib/supabase-leads.ts** : mapLeadRecord doit rester aligné avec les colonnes réelles (dont email_sent, preparation_summary, call_notes, called, comments, folder_id en snake_case en base, camelCase en sortie).
- **app/api/campaign/start/route.ts** : appelle uniquement `runLeadgenPipeline` ; pas de vérification N8N_WEBHOOK_URL.
- **netlify.toml** : ne pas réactiver `cron-process-queue` sans décider où tourne la file (Netlify vs Scaleway).

---

## 11. Résumé exécutif

- PipeShark = Next.js 16 + Supabase + leadgen in-app (HasData → scrape → OpenAI → Gmail draft → leads). Pas de dépendance n8n pour le run de campagne.
- Cron 15 min sur Netlify = lancement Daily launch ; file d’emails = cron toutes les minutes sur Scaleway (script shell).
- Call Center = page dédiée avec tous les leads, synthèse (preparation_summary), notes, appelé, commentaires, dossiers.
- Touches UI : tout en anglais, icône Call Center = `phone-receiver-silhouette.png`, colonne Email à droite sur Call Center, filtre par campagne en haut.
- Migrations Supabase à appliquer dans l’ordre (001 à 031). Leads : colonne `name` et colonnes Call Center doivent exister pour éviter erreurs d’insert/update.
