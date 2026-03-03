# Cron « Daily launch » – lancement quotidien du workflow leadgen

**Déclencheur : le cron Netlify** (scheduled function). Il appelle l’API toutes les 15 minutes. L’heure de lancement est celle que tu choisis dans **Pipeshark → Dashboard → Daily launch** (heure + timezone + campagnes). Le workflow leadgen (n8n) ne se déclenche **qu’une fois par jour** à cette heure (première fenêtre de 15 min de l’heure choisie).

## URL appelée

**Méthode :** `GET`  
**URL exacte (sans redirection) :**  
`https://www.pipeshark.io/api/cron/launch-scheduled-campaigns`  
(ou ton domaine **avec www** si ton domaine redirige sans www vers www — sinon le cron peut recevoir une 307 et perdre le header `Authorization`.)

- Utilise l’URL **finale** (avec www si c’est le cas) pour éviter 307 + 401.
- **Ne pas** mettre de slash final.

## Authentification

Si `CRON_SECRET` est défini dans les variables d’environnement de l’app (Netlify), la requête doit être authentifiée. Deux options :

1. **Header (recommandé)**  
   - Nom : `Authorization`  
   - Valeur : `Bearer <CRON_SECRET>`

2. **Query string**  
   - Ajouter à l’URL : `?secret=<CRON_SECRET>`

Exemple d’URL complète avec secret en query :  
`https://www.pipeshark.io/api/cron/launch-scheduled-campaigns?secret=TON_CRON_SECRET`

## Configuration du cron sur Netlify

La fonction planifiée `netlify/functions/cron-launch.ts` est exécutée toutes les 15 minutes (`*/15 * * * *`, en UTC). Elle appelle l’API du site avec le header `Authorization: Bearer CRON_SECRET`.

**Netlify → Site settings → Build & deploy → Environment variables** :
- **`CRON_SECRET`** : à définir (secret pour authentifier l’appel cron). La fonction l’envoie en header à l’API.
- **`URL`** : fournie automatiquement par Netlify en production ; pas besoin de la définir.

Le schedule est défini dans `netlify.toml` (`[functions.cron-launch] schedule = "*/15 * * * *"`). Aucun changement n’est nécessaire dans n8n : le workflow leadgen est déclenché par l’app (webhook appelé par l’API après le cron).

## Erreur 404 « requested path is invalid »

Si tu reçois une 404 avec ce message, l’URL appelée ne correspond pas à la route. Vérifier :

| À vérifier | Correct | Incorrect |
|------------|----------|-----------|
| Préfixe | `/api/cron/launch-scheduled-campaigns` | `/cron/...` (sans `api`) |
| Chemin exact | `launch-scheduled-campaigns` | `launch-schedule-campaigns`, `launch-campaigns`, etc. |
| Slash final | Pas de slash à la fin | `/api/cron/launch-scheduled-campaigns/` |
| Domaine | Ton domaine Netlify / production | `localhost`, ancien sous-domaine, etc. |

Une fois l’URL corrigée (cron Netlify ou test curl), la 404 doit disparaître.

## Test manuel

Pour tester à la main (curl) :

```bash
# Avec secret en query (utiliser https://www.pipeshark.io si le domaine redirige)
curl "https://www.pipeshark.io/api/cron/launch-scheduled-campaigns?secret=TON_CRON_SECRET"

# Avec header
curl -H "Authorization: Bearer TON_CRON_SECRET" "https://www.pipeshark.io/api/cron/launch-scheduled-campaigns?simulateTime=14:00"
```

Une réponse 200 avec un JSON `{ success: true, ... }` indique que l’endpoint fonctionne.
