# Dépannage : le cron ne lance pas / « No trigger output » sur le webhook n8n

Si à l’heure prévue (ex. 13h) rien ne se lance et que le nœud **Webhook** dans n8n affiche « No trigger output », voici les causes possibles et quoi vérifier.

---

## 1. Qui déclenche le cron ?

Deux possibilités :

- **Vercel Cron** (`vercel.json`) : exécution toutes les 15 min (`*/15 * * * *`) qui appelle `GET /api/cron/launch-scheduled-campaigns`. Aucune action dans n8n n’est nécessaire pour *déclencher* l’appel.
- **Workflow n8n « Daily schedule »** : un **Schedule Trigger** (ex. tous les jours à 13h) qui fait un **HTTP Request** vers la même URL. Dans ce cas, c’est n8n qui appelle l’API à l’heure choisie.

À vérifier selon ton cas :

- Si tu utilises **Vercel Cron** : le cron doit être actif sur le projet (Vercel → Settings → Crons) et l’URL appelée doit être celle de ton déploiement (pas localhost). L’heure effective dépend du fuseau : l’API compare l’heure **locale** (timezone du dashboard) avec `launch_time`. Donc si tu as 13:00 en Europe/Paris, un run cron à 12:00 UTC déclenchera bien 13:00 Paris.
- Si tu utilises **n8n** : le workflow avec le Schedule Trigger doit être **activé** (toggle Actif), et l’heure du trigger doit correspondre à ton `launch_time` (ou à une heure dans la même plage horaire que celle configurée dans le dashboard).

---

## 2. L’URL du webhook côté app (Vercel) = l’URL du webhook dans n8n

Le nœud Webhook que tu vois dans n8n ne reçoit des appels **que** si l’app (Vercel) envoie des requêtes **exactement** vers cette URL.

- L’app utilise la variable d’environnement **`N8N_WEBHOOK_URL`** (ou `N8N_WEBHOOK_URL_LOCAL_BUSINESSES` pour le mode local_businesses).
- Cette valeur doit être **exactement** l’URL « Production » du nœud Webhook dans n8n, par ex. :
  - `http://51.159.52.178/webhook/3b7949d1-3698-4de5-b755-56cbb323b6f1`
  - ou en HTTPS si tu as configuré un domaine/SSL.

Si tu as migré vers un n8n auto-hébergé (nouvelle IP / nouveau workflow) sans mettre à jour les variables sur **Vercel**, l’app continue d’appeler l’ancienne URL. Du coup :
- l’ancien n8n (ou une 404) reçoit les appels,
- le webhook sur ton instance actuelle (ex. 51.159.52.178) ne reçoit rien → « No trigger output ».

**À faire :** Vercel → ton projet → Settings → Environment Variables. Vérifier que `N8N_WEBHOOK_URL` (et éventuellement `N8N_WEBHOOK_URL_LOCAL_BUSINESSES`) est l’URL complète du webhook de **cette** instance n8n, puis redéployer.

---

## 3. Vérifications côté app / planning

L’API ne lance une campagne que si **tous** les points suivants sont ok :

| Vérification | Où / comment |
|--------------|----------------|
| **Planning (Daily launch)** | Dashboard Pipeshark : heure de lancement + au moins une campagne sélectionnée dans « Daily launch ». Les infos sont en base dans `user_schedule` (`launch_time`, `campaign_ids`, `timezone`). |
| **Fuseau horaire** | Le fuseau du dashboard (ex. Europe/Paris) doit correspondre à celui utilisé pour « 13h ». Si `timezone` est vide, l’API utilise UTC. |
| **Campagne active** | La campagne doit être `status = active` et avoir des crédits utilisés (`numberCreditsUsed` > 0). |
| **Gmail connecté** | Compte Gmail lié à la campagne, tokens valides. Sinon l’API renvoie une erreur du type « Gmail not connected » et ne lance pas le workflow. |

---

## 4. Tester l’API à la main (simuler 13h)

Pour vérifier que l’API trouve bien un run à 13h sans attendre le cron :

```bash
curl -H "Authorization: Bearer TON_CRON_SECRET" \
  "https://TON_DOMAINE_VERCEL/api/cron/launch-scheduled-campaigns?simulateTime=13:00"
```

- Si la réponse contient `runsProcessed: 0` et `results: []`, aucun run n’a été trouvé pour 13h → revoir planning, timezone, campagnes, Gmail.
- Si `runsProcessed: 1` et un `launched: true`, l’API a bien lancé une campagne. Si le webhook n8n affiche toujours « No trigger output », le problème vient très probablement de **N8N_WEBHOOK_URL** sur Vercel (voir §2).

---

## 5. Résumé rapide

- **« No trigger output »** = le webhook n8n n’a reçu aucun appel.
- En général, soit **personne n’appelle l’API** à l’heure dite (Vercel cron désactivé / mauvais fuseau, ou workflow n8n désactivé / mauvaise heure), soit **l’API est appelée mais envoie vers une autre URL** que celle de ce webhook → vérifier **N8N_WEBHOOK_URL** sur Vercel et qu’elle correspond bien à l’URL du nœud Webhook que tu regardes dans n8n.
