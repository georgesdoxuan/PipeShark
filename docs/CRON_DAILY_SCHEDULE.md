# Cron « Daily schedule » – lancement des campagnes programmées

**L’automatisation est dans n8n** : un workflow n8n avec un trigger **Schedule / Cron** lance à l’heure voulue (ex. tous les jours à 9h). Ce workflow appelle ensuite l’API Next.js via un nœud **HTTP Request**. Next.js expose uniquement l’endpoint ; c’est n8n qui décide *quand* l’appeler.

## URL à appeler

**Méthode :** `GET`  
**URL exacte :**  
`https://<TON_DOMAINE_VERCEL>/api/cron/launch-scheduled-campaigns`

- Remplace `<TON_DOMAINE_VERCEL>` par l’URL réelle de ton déploiement (ex. `pipeshark.vercel.app` ou ton domaine custom).
- **Ne pas** mettre de slash final : utiliser `/api/cron/launch-scheduled-campaigns` et **pas** `/api/cron/launch-scheduled-campaigns/`.

## Authentification

Si `CRON_SECRET` est défini dans les variables d’environnement de l’app (Vercel), la requête doit être authentifiée. Deux options :

1. **Header (recommandé)**  
   - Nom : `Authorization`  
   - Valeur : `Bearer <CRON_SECRET>`

2. **Query string**  
   - Ajouter à l’URL : `?secret=<CRON_SECRET>`

Exemple d’URL complète avec secret en query :  
`https://pipeshark.vercel.app/api/cron/launch-scheduled-campaigns?secret=TON_CRON_SECRET`

## Configuration du nœud HTTP Request dans n8n (Daily schedule)

1. **Method:** GET  
2. **URL:**  
   `https://<TON_DOMAINE>/api/cron/launch-scheduled-campaigns`  
   (sans slash à la fin)
3. **Authentication:**  
   - Soit « Header Auth » avec `Authorization` = `Bearer {{ $env.CRON_SECRET }}`  
   - Soit ajouter en query : `?secret={{ $env.CRON_SECRET }}`
4. Vérifier que la variable d’environnement (ou le secret n8n) utilisé correspond bien à `CRON_SECRET` défini sur Vercel.

## Erreur 404 « requested path is invalid »

Si tu reçois une 404 avec ce message, l’URL appelée ne correspond pas à la route. Vérifier :

| À vérifier | Correct | Incorrect |
|------------|----------|-----------|
| Préfixe | `/api/cron/launch-scheduled-campaigns` | `/cron/...` (sans `api`) |
| Chemin exact | `launch-scheduled-campaigns` | `launch-schedule-campaigns`, `launch-campaigns`, etc. |
| Slash final | Pas de slash à la fin | `/api/cron/launch-scheduled-campaigns/` |
| Domaine | Ton domaine Vercel / production | `localhost`, ancien sous-domaine, etc. |

Une fois l’URL corrigée dans le nœud HTTP Request du workflow « daily schedule », la 404 doit disparaître.

## Test manuel

Pour tester sans n8n (avec curl) :

```bash
# Avec secret en query
curl "https://TON_DOMAINE/api/cron/launch-scheduled-campaigns?secret=TON_CRON_SECRET"

# Avec header
curl -H "Authorization: Bearer TON_CRON_SECRET" "https://TON_DOMAINE/api/cron/launch-scheduled-campaigns"
```

Une réponse 200 avec un JSON `{ success: true, ... }` indique que l’endpoint fonctionne.
