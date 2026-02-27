# n8n – Workflow « Schedule + envois des mails par send queue » – paramètres complets

Ce document centralise **tous les paramètres** du workflow n8n qui lance les campagnes planifiées et envoie les mails depuis la file `email_queue`. Utilise-le comme référence pour recréer ou modifier le workflow.

---

## 0. Flux global (à respecter)

1. **Tous les jours à 16h** (ou l’heure configurée) : un **premier** appel n8n appelle `GET /api/cron/launch-scheduled-campaigns`. L’API déclenche le workflow n8n « principal » (génération de leads + brouillons) et enregistre tout dans Supabase. **Aucun enqueue automatique** : les mails ne partent pas en file d’envoi à ce moment-là.
2. **L’utilisateur** va sur le dashboard, sélectionne les campagnes « Daily launch », puis clique sur **« Add to send queue »**. Cela remplit la table `email_queue` (sujet, corps, `scheduled_at` par lead).
3. **Le workflow n8n « Schedule + send queue »** (décrit ci-dessous) tourne **régulièrement** (ex. toutes les minutes). Il récupère les lignes `email_queue` avec `status = pending` et `scheduled_at <= now`, puis envoie (ou crée le brouillon) pour chacune.

Donc : **16h = génération + stockage uniquement** ; **Add to send queue = mise en file** ; **workflow Schedule = envoi aux heures programmées**.

---
## 1. Vue d’ensemble du flux (workflow « Schedule + send queue »)

1. **Schedule Trigger** → déclenche (ex. toutes les minutes).
2. **HTTP Request** (optionnel) → `GET /api/cron/launch-scheduled-campaigns` : à placer dans un workflow séparé déclenché à 16h, ou laisser ici pour que chaque run vérifie si des campagnes doivent être lancées.
3. **Get many rows** (Supabase) → récupère les lignes `email_queue` à traiter.
4. **Loop Over Items** → une exécution par ligne.
5. **If** → condition `delivery_type` = `send` :
   - **True** → HTTP Request `send-email` → Update a row (status = sent).
   - **False** → HTTP Request `create-draft` (Bearer Auth) → Update a row (status = draft) en cas d’usage spécifique, ou rien si l’API marque déjà.

---

## 2. Schedule Trigger

- **Trigger:** Cron (ex. toutes les minutes : `* * * * *`).

---

## 3. HTTP Request – Launch scheduled campaigns (optionnel, souvent dans un workflow séparé à 16h)

- **Method:** GET  
- **URL:**  
  `https://www.pipeshark.io/api/cron/launch-scheduled-campaigns`  
  (ou ton domaine)
- **Authentication:** None  
- **Send Query Parameters:** Off  
- **Send Headers:** On  
- **Specify Headers:** Using JSON  

**Headers (JSON):**
```json
{
  "apikey": "<JWT ou clé API>",
  "Authorization": "Bearer <JWT ou CRON_SECRET>"
}
```

*(Remplace par ta clé / secret réels. Souvent le même secret que pour send-email.)*

---

## 4. Get many rows (Supabase) – email_queue

- **Credential:** Supabase account  
- **Use Custom Schema:** Off  
- **Resource:** Row  
- **Operation:** Get Many  
- **Table Name or ID:** `email_queue`  
- **Return All:** Off  
- **Limit:** 50 (ou 5–10 pour limiter la charge)  
- **Filter:** Build Manually  
- **Must Match:** All Select Conditions (ou équivalent)  

**Select Conditions:**

| Field Name or ID   | Condition              | Field Value              |
|--------------------|------------------------|---------------------------|
| `status` (string)  | Equals                 | `pending`                 |
| `scheduled_at` (string) | Less Than or Equal | `{{ $now.toISO() }}` |

*(Les champs retournés doivent inclure au minimum : `id`, `user_id`, `sender_account_id`, `lead_id`, `recipient`, `subject`, `body`, `scheduled_at`, `delivery_type`, `connection_type`.)*

---

## 5. Loop Over Items

- **Batch Size:** 1  
- *(Optionnel en n8n récent : les nœuds peuvent s’exécuter une fois par item sans ce nœud.)*

---

## 6. If – branche delivery_type

- **Condition (Parameters):**
  - **Value 1 / Expression:** `{{ $json.delivery_type }}`  
  - **Operation:** Is equal to  
  - **Value 2:** `send`  

- **True** → branche vers **HTTP Request send-email** puis **Update a row (sent)**.  
- **False** → branche vers **HTTP Request create-draft** puis éventuellement **Update a row (draft)**.

---

## 7. HTTP Request – send-email (branche True)

- **Method:** POST  
- **URL:**  
  `https://www.pipeshark.io/api/n8n/send-email?secret=8f7a2c9e1b4d6e3a5c8f0b2d4e6a8c0f1b3d5e7a9c1e3f5a7b9d1e3f5a7b9d1e`  
  *(Remplace par ton `N8N_SECRET` ou `CRON_SECRET`.)*  
- **Authentication:** None  
- **Send Query Parameters:** Off  
- **Send Headers:** Off  
- **Send Body:** On  
- **Body Content Type:** JSON  
- **Specify Body:** Using Fields Below  

**Body Parameters:**

| Name                 | Value                        |
|----------------------|------------------------------|
| `sender_account_id`  | `{{ $json.sender_account_id }}` |
| `recipient`          | `{{ $json.recipient }}`      |
| `subject`            | `{{ $json.subject }}`        |
| `body`               | `{{ $json.body }}`           |
| `queue_id`           | `{{ $json.id }}`             |
| `lead_id`            | `{{ $json.lead_id }}`        |

---

## 8. Update a row (Supabase) – après send-email (status = sent)

- **Credential:** Supabase account  
- **Use Custom Schema:** Off  
- **Resource:** Row  
- **Operation:** Update  
- **Table Name or ID:** `email_queue`  
- **Select Type:** Build Manually  
- **Must Match:** Any Select Condition (ou All, selon ton n8n)  

**Select Conditions:**

| Field Name or ID | Condition | Field Value |
|------------------|-----------|-------------|
| `id` (string)    | Equals    | `{{ $json.id }}` |

*(L’item vient de Get many rows, donc `$json.id` est l’id de la ligne. Une seule condition sur `id`.)*

**Fields to Send (Data to Send – Define Below):**

| Field Name or ID | Field Value        |
|------------------|--------------------|
| `status` (string)| `sent`             |
| `updated_at` (string) | `{{ $now.toISO() }}` |
| `error_log` (string)  | *(vide)*          |

---

## 9. HTTP Request – create-draft (branche False)

- **Method:** POST  
- **URL:**  
  `https://www.pipeshark.io/api/n8n/create-draft`  
- **Authentication:** Predefined Credential Type  
- **Credential Type:** Bearer Auth  
- **Bearer Auth:** (ton compte Bearer Auth n8n avec la valeur = `N8N_SECRET` ou `CRON_SECRET`)  
- **Send Query Parameters:** Off  
- **Send Headers:** Off  
- **Send Body:** On  
- **Body Content Type:** JSON  
- **Specify Body:** Using Fields Below  

**Body Parameters:**

| Name      | Value                |
|-----------|----------------------|
| `queue_id` | `{{ $json.id }}`   |

*(L’API accepte aussi `queueId`.)*

---

## 10. Update a row (Supabase) – après create-draft (status = draft)

*(À utiliser si tu veux marquer explicitement la ligne en `draft` côté Supabase. Sinon, l’API create-draft marque déjà la ligne en `sent` après création du brouillon.)*

- **Credential:** Supabase account  
- **Resource:** Row  
- **Operation:** Update  
- **Table Name or ID:** `email_queue`  
- **Select Type:** Build Manually  
- **Must Match:** Any Select Condition  

**Select Conditions:**

| Field Name or ID | Condition | Field Value |
|------------------|-----------|-------------|
| `id` (string)    | Equals    | `{{ $json.id }}` |

**Fields to Send:**

| Field Name or ID | Field Value        |
|------------------|--------------------|
| `status` (string)| `draft`            |
| `updated_at` (string) | `{{ $now.toISO() }}` |
| `error_log` (string)  | *(vide)*          |

---

## 11. Choix de connexion mail : SMTP ou Gmail (send + draft)

L’utilisateur choisit dans **Preferences → Mail account connection** : **SMTP** ou **Gmail (OAuth)**. Ce choix s’applique à l’**envoi** et aux **brouillons**. Lors de l’enqueue (**clic sur « Add to send queue »**), chaque ligne de `email_queue` reçoit un `connection_type` = `smtp` ou `gmail` selon la préférence stockée dans `user_profiles.mail_connection_type`.

**Si tu vois `smtp` dans Supabase alors que tu as sélectionné Gmail :** la préférence est lue depuis `user_profiles` au moment de l’enqueue. Re-enregistre le choix (re-clique sur Gmail dans Preferences puis sauvegarde). L’app crée ou met à jour la ligne `user_profiles` à la sauvegarde ; les **prochains** enqueues utiliseront `connection_type` = `gmail`. Les lignes déjà en file restent en `smtp` ; pour les nouvelles campagnes, ajoute à la file après avoir sauvegardé Gmail.

- **Send (`delivery_type` = `send`)**  
  - Si `connection_type` = **smtp** : l’API `send-email` utilise `sender_account_id` (SMTP, ex. Gmail App Password).  
  - Si `connection_type` = **gmail** : l’API `send-email` charge la ligne par `queue_id`, résout les tokens Gmail (lead → campaign) et envoie via l’API Gmail.

- **Draft (`delivery_type` = `draft`)**  
  - Si `connection_type` = **gmail** : l’API `create-draft` crée un brouillon dans Gmail (comportement habituel).  
  - Si `connection_type` = **smtp** : l’API `create-draft` ne crée pas de brouillon externe ; elle marque simplement la ligne en `status` = `draft` en base.

Dans le workflow n8n **aucun changement** : tu appelles toujours la même URL pour send et la même pour draft. C’est l’API qui lit `connection_type` sur la ligne (via `queue_id`) et choisit SMTP ou Gmail. Assure-toi que **Get many rows** retourne bien le champ `connection_type` pour que l’API puisse le lire si besoin (send-email charge la ligne par `queue_id` quand le body contient `queue_id`).

---

## 12. Variables d’environnement côté app

- `N8N_SECRET` ou `CRON_SECRET` : même valeur que celle utilisée dans l’URL (`?secret=...`) ou dans le header `Authorization: Bearer ...` pour les appels à `send-email` et `create-draft`.

---

## 13. Checklist rapide

- [ ] Schedule Trigger (ex. toutes les minutes).  
- [ ] HTTP Request → `GET .../api/cron/launch-scheduled-campaigns` avec headers (apikey / Authorization) — optionnel dans ce workflow si tu as un workflow séparé à 16h.  
- [ ] Get many rows sur `email_queue` : `status` = pending, `scheduled_at` ≤ now, avec `delivery_type` et `connection_type` dans les champs.  
- [ ] Loop Over Items (batch size 1) si nécessaire.  
- [ ] If : `{{ $json.delivery_type }}` égal à `send`.  
- [ ] Branche True : HTTP Request send-email (body : sender_account_id, recipient, subject, body, queue_id, lead_id) → Update a row (status = sent, updated_at, error_log vide).  
- [ ] Branche False : HTTP Request create-draft (Bearer Auth, body : queue_id) → optionnellement Update a row (status = draft).  
- [ ] Gestion d’erreur : en cas d’échec HTTP, Update a row avec `status` = `failed` et `error_log` = message.

La préférence **SMTP vs Gmail** est stockée dans `user_profiles.mail_connection_type` et recopiée en `email_queue.connection_type` à l’enqueue (migration `027_mail_connection_type.sql`).
---

## 14. Audit de ton workflow (d’après tes captures)

**Ce qui est correct :**
- **Schedule Trigger** + **HTTP Request** (GET launch-scheduled-campaigns) + **Get many rows** sur `email_queue` avec filtre `status` = pending et `scheduled_at` ≤ `{ $now.toISO() }`, **Limit** 50.
- **Loop Over Items** puis **If** avec condition `{ $json.delivery_type }` égal à `send` (True = send-email, False = create-draft).
- **HTTP Request1** : POST vers `.../api/n8n/send-email?secret=...`, Body JSON.
- **HTTP Request3** : POST vers `.../api/n8n/create-draft`, Bearer Auth.
- **Update a row1** : table `email_queue`, Select Condition sur `id` (Build Manually, Any Select Condition).

**À corriger / vérifier dans n8n :**

1. **HTTP Request1 (send-email) – Body**  
   Sur tes captures le body n’a qu’un champ **`id`**. L’API accepte maintenant **`id`** comme alias de `queue_id` et charge toute la ligne ; pour le chemin Gmail elle utilise la ligne, pour SMTP elle utilise la ligne si tu n’envoies que `id`. Donc **envoyer uniquement `id` = `{ $json.id }` fonctionne** après correction côté app. Pour être explicite et conforme à la doc, tu peux ajouter : `queue_id` = `{ $json.id }`, `sender_account_id`, `recipient`, `subject`, `body`, `lead_id` (tous depuis `$json`).

2. **HTTP Request3 (create-draft) – Body**  
   Tu envoies **`id`**. L’API accepte maintenant **`id`** en plus de `queue_id` / `queueId`. Donc **ça fonctionne tel quel**. Idéalement renommer le champ en **`queue_id`** (valeur `{ $json.id }`) pour rester aligné avec la doc.

3. **Get many rows – Colonnes retournées**  
   Avec **Return All** = Off, il faut s’assurer que les colonnes retournées incluent au minimum : `id`, `user_id`, `sender_account_id`, `lead_id`, `recipient`, `subject`, `body`, `scheduled_at`, **`delivery_type`**, **`connection_type`**. Sinon l’If ne voit pas `delivery_type` et l’API ne peut pas choisir Gmail vs SMTP. Si tu as une option « Columns to return » ou « Select », ajoute **`connection_type`**.

4. **Update a row / Update a row1 – Valeur de la condition**  
   La condition sur `id` doit avoir comme **Field Value** exactement : `{ $json.id }` (expression), pas un champ fixe. Et **une seule** condition (pas de condition sur `scheduled_at`). Vérifier aussi que les champs mis à jour sont : `status` (sent ou draft), `updated_at`, `error_log`.

5. **Rappel : `delivery_type` vs `connection_type`**  
   - **delivery_type** (send / draft) = *quoi faire* : envoyer tout de suite ou créer un brouillon. C’est ce que teste le nœud **If**.  
   - **connection_type** (smtp / gmail) = *comment* : SMTP ou Gmail. C’est stocké dans `email_queue` et lu par l’API quand tu passes `queue_id` ou `id`. Tu ne dois rien changer au If : il reste sur `delivery_type` = `send`.

