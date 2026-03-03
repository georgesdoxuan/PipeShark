# Configuration à faire toi‑même

Ce document liste tout ce que tu dois configurer pour que PipeShark fonctionne de bout en bout (sans n8n).jhoo

---

## Copier-coller dans `.env.local`

Colle ce bloc à la racine du projet dans un fichier `.env.local` (crée-le s’il n’existe pas), puis **remplace chaque placeholder** par tes vraies valeurs (Supabase → Settings → API ; Google → Cloud Console ; HasData/OpenAI/CRON → voir sections ci‑dessous).

```env
# Supabase (Settings → API : Project URL, anon public, service_role)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google OAuth (Gmail) — Cloud Console → Credentials → OAuth client ID
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron + leadgen (CRON_SECRET : longue chaîne aléatoire ; HasData : hasdata.com)
CRON_SECRET=une-longue-chaine-aleatoire-securisee
HASDATA_API_KEY=ta-cle-hasdata

# OpenAI — https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Optionnel (n8n)
N8N_WEBHOOK_URL=
N8N_WEBHOOK_URL_LOCAL_BUSINESSES=
```

En prod (Netlify), mets les mêmes noms de variables avec **NEXT_PUBLIC_APP_URL** et **NEXT_PUBLIC_REDIRECT_URI** en https (ex. `https://www.pipeshark.io` et `https://www.pipeshark.io/api/auth/gmail/callback`).

---

## 1. Variables d’environnement

### 1.1 En local (`.env.local`)

À créer à la racine du projet si ce n’est pas déjà fait. **Ne pas commiter ce fichier** (il doit être dans `.gitignore`).

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL du projet Supabase (ex. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Clé anonyme (publique) Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Clé service role Supabase (secrète, côté serveur uniquement) |
| `GOOGLE_CLIENT_ID` | Oui | Client ID OAuth Google (Gmail) |
| `GOOGLE_CLIENT_SECRET` | Oui | Client secret OAuth Google |
| `NEXT_PUBLIC_REDIRECT_URI` | Oui | URL de callback Gmail (ex. `http://localhost:3000/api/auth/gmail/callback` en dev, `https://ton-domaine.com/api/auth/gmail/callback` en prod) |
| `NEXT_PUBLIC_APP_URL` | Oui | URL de l’app (ex. `http://localhost:3000` en dev, `https://www.pipeshark.io` en prod) |
| `CRON_SECRET` | Oui | Secret partagé pour authentifier les appels cron (génère une longue chaîne aléatoire) |
| `HASDATA_API_KEY` | Oui | Clé API HasData (Google Maps search) – [hasdata.com](https://hasdata.com). **Tu peux la copier depuis** `Pipeshark Workflow.json` (nœud « Find Website » → header `x-api-key`). Ne pas commiter les JSON contenant cette clé. |
| `OPENAI_API_KEY` | Oui | Clé API OpenAI (gpt-4o-mini pour résumé + génération d’emails) |
| `N8N_SECRET` | Optionnel | Si tu gardes des appels n8n (send-email, create-draft), même valeur que `CRON_SECRET` ou dédiée |
| `STRIPE_SECRET_KEY` | Optionnel | Si tu utilises le paiement Stripe |
| `NEXT_PUBLIC_ARTICLE_IMAGE_URL` | Optionnel | URL d’une image pour l’article |
| `NEXT_PUBLIC_ARTICLE_PREVIEW_IMAGE_URL` | Optionnel | URL image preview |

**Exemple minimal `.env.local` (dev) :**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/gmail/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=une-longue-chaine-aleatoire-securisee
HASDATA_API_KEY=ta-cle-hasdata
OPENAI_API_KEY=sk-...
```

---

### 1.2 Sur Netlify (production)

**Netlify → Ton site → Site configuration → Environment variables**

Ajoute les **mêmes** variables que ci‑dessus, avec les valeurs **production** :

- `NEXT_PUBLIC_APP_URL` = ton domaine (ex. `https://www.pipeshark.io`)
- `NEXT_PUBLIC_REDIRECT_URI` = `https://www.pipeshark.io/api/auth/gmail/callback` (adapter si autre domaine)
- Toutes les autres (Supabase, Google, CRON_SECRET, HASDATA_API_KEY, OPENAI_API_KEY, etc.)

**Note :** `URL` et `DEPLOY_PRIME_URL` sont définis automatiquement par Netlify ; pas besoin de les créer. Après modification des variables, **redéployer** le site.

---

## 2. Supabase

### 2.1 Projet

- Créer un projet sur [supabase.com](https://supabase.com).
- Récupérer dans **Settings → API** :
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (ne jamais l’exposer côté client)

### 2.2 Migrations SQL

Exécuter les migrations dans l’ordre (Supabase → SQL Editor) :

- Toutes les migrations dans `supabase-migrations/` (de `001_...` jusqu’à la dernière, ex. `028_daily_launch_log.sql`).
- Ou utiliser le fichier regroupé `APPLY_ALL_PENDING.sql` s’il est à jour.

La migration **028_daily_launch_log** est nécessaire pour le cron (éviter la boucle de relance du même run dans la journée).

### 2.3 Politiques RLS

Les migrations créent les tables et les politiques RLS. Vérifier dans **Authentication → Policies** que les tables sensibles (leads, campaigns, email_queue, user_schedule, etc.) ont les bonnes règles (lecture/écriture par `auth.uid()` ou service role).

---

## 3. Google Cloud (Gmail OAuth)

### 3.1 Projet & credentials

- Aller sur [Google Cloud Console](https://console.cloud.google.com/) → créer ou sélectionner un projet.
- **APIs & Services → Credentials → Create credentials → OAuth client ID**.
- Type : **Web application**.
- **Authorized redirect URIs** : ajouter **les deux** :
  - En dev : `http://localhost:3000/api/auth/gmail/callback`
  - En prod : `https://ton-domaine.com/api/auth/gmail/callback` (ex. `https://www.pipeshark.io/api/auth/gmail/callback`)
- Récupérer **Client ID** et **Client secret** → `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.

### 3.2 API Gmail

- **APIs & Services → Library** : activer **Gmail API** pour ce projet.

---

## 4. HasData (recherche Google Maps)

- Créer un compte sur [hasdata.com](https://hasdata.com).
- Souscrire à l’API **Google Maps Search** (ou équivalent) et récupérer la **x-api-key**.
- La mettre dans `HASDATA_API_KEY` (en local et sur Netlify).

---

## 5. OpenAI

- Créer un compte sur [platform.openai.com](https://platform.openai.com).
- Créer une clé API (**API keys**) et la mettre dans `OPENAI_API_KEY`.
- Le pipeline utilise le modèle **gpt-4o-mini** (résumé de site + génération d’email).

---

## 6. Netlify

### 6.1 Déploiement

- Connecter le dépôt Git (GitHub/GitLab) au site Netlify.
- **Build command :** `npm run build`
- **Publish directory :** `.next` (géré par le plugin `@netlify/plugin-nextjs`)
- **Node version :** 18 ou 20 (définir en **Environment variables** : `NODE_VERSION=20` si besoin)

### 6.2 Fonctions planifiées (cron)

Deux fonctions sont définies dans `netlify.toml` :

| Fonction | Schedule | Rôle |
|----------|----------|------|
| `cron-launch` | Toutes les 15 min (`*/15 * * * *`) | Appelle `GET /api/cron/launch-scheduled-campaigns` pour lancer les campagnes du Daily launch |
| `cron-process-queue` | Toutes les minutes (`* * * * *`) | Appelle `GET /api/cron/process-email-queue` pour envoyer ou créer les brouillons en file d’attente |

Aucune config manuelle à faire dans l’UI Netlify pour les schedules : ils sont dans `netlify.toml`. Il faut seulement que **`CRON_SECRET`** soit défini dans les variables d’environnement du site.

### 6.3 Domaine

- **Domain management** : attacher ton domaine (ex. `www.pipeshark.io`).
- S’assurer qu’il n’y a pas de redirection 307 qui enlève les headers (sinon le cron peut recevoir 401). Utiliser l’URL **finale** (avec ou sans www selon ta config) dans les redirect URIs Google et dans `NEXT_PUBLIC_APP_URL`.

---

## 7. Stripe (optionnel)

Si tu utilises le checkout Stripe :

- Créer un compte [Stripe](https://stripe.com).
- Récupérer la **Secret key** (Dashboard → Developers → API keys) → `STRIPE_SECRET_KEY`.
- Optionnel : configurer un webhook vers `https://ton-domaine.com/api/stripe/webhook` et mettre le **Signing secret** dans `STRIPE_WEBHOOK_SECRET` (si l’app l’utilise).

---

## 8. Récap checklist

- [ ] `.env.local` créé avec toutes les variables obligatoires (Supabase, Google, CRON_SECRET, HASDATA_API_KEY, OPENAI_API_KEY, APP_URL, REDIRECT_URI).
- [ ] Variables dupliquées sur Netlify avec les valeurs **production** (domaine, redirect URI prod).
- [ ] Migrations Supabase exécutées (dont `028_daily_launch_log`).
- [ ] Google Cloud : OAuth client créé, redirect URIs (dev + prod) ajoutés, Gmail API activée.
- [ ] HasData : clé API créée et mise dans `HASDATA_API_KEY`.
- [ ] OpenAI : clé API créée et mise dans `OPENAI_API_KEY`.
- [ ] Netlify : site déployé, variables d’environnement renseignées, domaine attaché si besoin.
- [ ] Redéploiement Netlify après toute modification des variables.

Une fois tout ça fait, l’app et les crons (daily launch + file d’emails) fonctionnent sans n8n.

---

## 9. Secrets présents dans les fichiers JSON (n8n)

Les workflows exportés contiennent des secrets en clair :

| Fichier | Ce qui est exposé |
|---------|-------------------|
| **Pipeshark Workflow.json** | Header `x-api-key` HasData : `6450129f-06da-472f-abb0-0dde17bf4639` (nœud « Find Website »). Tu peux utiliser cette valeur pour `HASDATA_API_KEY`. |
| **Schedule Pipeshark.json** | `secret=` dans l’URL (CRON_SECRET) ; JWT Supabase anon dans les headers. |

**À faire :** ne pas pousser ces fichiers sur un repo public (ou les ajouter à `.gitignore`). En production, tout doit passer par les variables d’environnement ; si le repo a déjà été partagé, faire tourner la clé HasData et le CRON_SECRET et ne plus utiliser les anciennes valeurs.
