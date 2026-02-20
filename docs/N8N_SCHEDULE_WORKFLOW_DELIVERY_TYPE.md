# Workflow n8n « Schedule » (file d’envoi) – support send / draft

Ce guide décrit **étape par étape** les changements à faire dans ton workflow n8n qui traite la file `email_queue` (celui qui tourne toutes les minutes), pour gérer à la fois l’**envoi SMTP** (`delivery_type = send`) et la **création de brouillons Gmail** (`delivery_type = draft`).

---

## Rappel

- La table `email_queue` a maintenant une colonne **`delivery_type`** : `'send'` ou `'draft'`.
- Même file, mêmes **`scheduled_at`** (répartis aléatoirement en heures de bureau) : la seule différence est l’action à l’heure dite (envoyer vs créer un brouillon).
- **Send** → `POST /api/n8n/send-email` puis tu marques la ligne `sent` (et `leads.email_sent` si tu le fais).
- **Draft** → `POST /api/n8n/create-draft` ; l’API marque déjà la ligne en `sent`, tu n’as rien à mettre à jour en base.

---

## Étape 1 – Récupérer aussi `delivery_type` depuis Supabase

**Nœud :** Supabase « Get many » (ou équivalent) sur `email_queue`.

- **À faire :** Inclure la colonne **`delivery_type`** dans les champs sélectionnés.
- **Filtres inchangés :**  
  `status` = `pending`  
  `scheduled_at` ≤ maintenant (ex. `{{ $now.toISO() }}` ou équivalent).
- **Tri :** `scheduled_at` ASC.
- **Limit :** comme aujourd’hui (ex. 5 ou 10).

Tu dois avoir dans chaque item au moins :  
`id`, `user_id`, `sender_account_id`, `lead_id`, `recipient`, `subject`, `body`, `scheduled_at`, **`delivery_type`**.

---

## Étape 2 – Boucle sur chaque ligne (Loop / SplitInBatches)

Comme aujourd’hui : un nœud qui fait **une exécution par ligne** retournée par l’étape 1 (Loop over items, Split In Batches, etc.).  
Chaque exécution travaille sur **une** ligne de la queue (avec `delivery_type` disponible).

---

## Étape 3 – Brancher selon `delivery_type`

Tu dois avoir **deux chemins** à partir de la boucle :

- **Si `delivery_type` = `send`** → envoi SMTP (étape 4a).
- **Si `delivery_type` = `draft`** → création brouillon Gmail (étape 4b).

En n8n :

- Soit un **IF** (Condition) :  
  - Condition : `delivery_type` égal à `send`  
  - Branche « true » → étape 4a  
  - Branche « false » → étape 4b (draft)
- Soit deux **Switch** / routes différentes selon la valeur de `delivery_type`.

Important : utilise bien le **`delivery_type`** de l’item courant (ex. `{{ $json.delivery_type }}` ou le champ équivalent dans ton nœud Supabase).

---

## Étape 4a – Envoi SMTP (`delivery_type` = `send`)

Sur la branche **send** :

1. **HTTP Request** vers ton app :
   - **Method :** POST  
   - **URL :**  
     `https://<TON_DOMAINE>/api/n8n/send-email`  
     (ex. `https://www.pipeshark.io/api/n8n/send-email`)
   - **Auth :**  
     Header `Authorization: Bearer <N8N_SECRET ou CRON_SECRET>`  
     ou paramètre `?secret=<N8N_SECRET ou CRON_SECRET>`.
   - **Body (JSON) :**
     - `sender_account_id` : `{{ $json.sender_account_id }}`
     - `recipient` : `{{ $json.recipient }}`
     - `subject` : `{{ $json.subject }}`
     - `body` : `{{ $json.body }}`
     - `queue_id` : `{{ $json.id }}`
     - `lead_id` : `{{ $json.lead_id }}` (optionnel mais utile pour mettre à jour `leads.email_sent`)

2. **En cas de succès (2xx) :**
   - **Supabase – Update** sur `email_queue` :  
     `id` = `{{ $json.id }}` (ou le `queue_id` renvoyé par l’API)  
     → mettre `status` = `sent`, `updated_at` = maintenant, `error_log` = null.
   - **Optionnel :** si tu mets à jour les leads, **Supabase – Update** sur `leads` :  
     `id` = `{{ $json.lead_id }}` → `email_sent` = true  
     (seulement si `lead_id` non vide).

3. **En cas d’erreur (4xx/5xx) :**
   - **Supabase – Update** sur `email_queue` :  
     `status` = `failed`, `error_log` = message d’erreur (ex. réponse de l’API).

Tu peux garder exactement la logique que tu avais avant pour « send » ; il suffit que le flux soit déclenché uniquement quand `delivery_type` = `send`.

---

## Étape 4b – Création brouillon Gmail (`delivery_type` = `draft`)

Sur la branche **draft** :

1. **HTTP Request** vers ton app :
   - **Method :** POST  
   - **URL :**  
     `https://<TON_DOMAINE>/api/n8n/create-draft`  
     (ex. `https://www.pipeshark.io/api/n8n/create-draft`)
   - **Auth :**  
     Même secret que pour send-email :  
     Header `Authorization: Bearer <N8N_SECRET ou CRON_SECRET>`  
     ou `?secret=...`
   - **Body (JSON) :**
     - `queue_id` : `{{ $json.id }}`  
       (ou `queue_id` / `queueId`, les deux sont acceptés par l’API)

2. **Comportement de l’API :**  
   L’API charge la ligne, récupère les tokens Gmail (lead → campaign → gmail_email), crée le brouillon dans Gmail, et **marque déjà la ligne** `email_queue` en `sent`.  
   Tu n’as **rien à mettre à jour** dans Supabase après un succès.

3. **En cas de succès (2xx) :**  
   Rien à faire en base (optionnel : logger ou notifier).

4. **En cas d’erreur (4xx/5xx) :**  
   **Supabase – Update** sur `email_queue` :  
   `id` = `{{ $json.id }}`  
   → `status` = `failed`, `error_log` = message d’erreur (ex. le corps de la réponse d’erreur).

---

## Étape 5 – (Optionnel) Gérer les erreurs de façon commune

Si tu veux un seul nœud « Marquer en failed » :

- Après chaque **HTTP Request** (send-email et create-draft), en cas d’erreur tu peux envoyer le même objet vers un nœud **Supabase – Update** qui met `email_queue.status` = `failed` et `error_log` = message, en utilisant l’`id` de la ligne (depuis l’item courant ou la réponse d’erreur).

---

## Résumé du flux

```
[Schedule Cron 1 min]
       ↓
[Supabase: Get many email_queue
  status=pending, scheduled_at <= now
  → select id, user_id, sender_account_id, lead_id, recipient, subject, body, scheduled_at, delivery_type]
       ↓
[Loop / Split In Batches : 1 item par exécution]
       ↓
[IF delivery_type = 'send']
   ├─ true  → [HTTP POST /api/n8n/send-email] → (succès) [Supabase: update queue sent + lead email_sent]
   │                                          → (erreur) [Supabase: update queue failed]
   └─ false → [HTTP POST /api/n8n/create-draft] → (succès) rien à faire
                                               → (erreur) [Supabase: update queue failed]
```

---

## URLs et secret

- **Send :**  
  `POST https://<TON_DOMAINE>/api/n8n/send-email`  
  Body : `sender_account_id`, `recipient`, `subject`, `body`, `queue_id`, `lead_id`.

- **Draft :**  
  `POST https://<TON_DOMAINE>/api/n8n/create-draft`  
  Body : `queue_id` (ou `queueId`).

- **Secret :**  
  Même valeur que dans ton app : `N8N_SECRET` ou `CRON_SECRET`, en header `Authorization: Bearer <secret>` ou en query `?secret=<secret>`.

---

## Checklist rapide

- [ ] Supabase « Get many » : ajouter la colonne **`delivery_type`**.
- [ ] Après la boucle : **IF** (ou Switch) sur `delivery_type`.
- [ ] Branche **send** : HTTP Request → send-email → en succès, update queue (et optionnellement lead).
- [ ] Branche **draft** : HTTP Request → create-draft → en succès, rien ; en erreur, update queue en `failed`.
- [ ] Gestion d’erreur : en échec (send ou draft), mettre la ligne en `status` = `failed` et renseigner `error_log`.

Une fois ces étapes en place, le workflow Schedule gère correctement les deux types d’envoi (SMTP et brouillons) avec la même répartition dans le temps.
