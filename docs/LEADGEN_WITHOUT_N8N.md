# Leadgen sans n8n

Le pipeline leadgen (recherche de leads, extraction email, génération de brouillons, enregistrement en base) tourne entièrement dans l’app. Plus besoin de n8n pour le workflow principal ni pour le Schedule.

## Variables d’environnement

À définir (Netlify → Environment variables) :

| Variable | Description |
|----------|-------------|
| `HASDATA_API_KEY` | Clé API HasData (Google Maps search). Remplacer l’ancienne clé hardcodée dans le workflow n8n. |
| `OPENAI_API_KEY` | Clé API OpenAI (gpt-4o-mini pour résumé site + génération d’email). |
| `CRON_SECRET` | Déjà utilisé pour le cron et la file d’emails. |

## Ce qui a été remplacé

1. **Pipeshark Workflow (n8n)**  
   - Webhook → Query Creator → HasData → Split Out → fetch HTML → extraction email / téléphone / LinkedIn → filtre → limite → résumé OpenAI → génération email OpenAI → brouillon Gmail → insert Supabase.  
   - Tout est dans `lib/leadgen/` (hasdata, scrape, ai-draft, pipeline) et est appelé par le cron et par `POST /api/campaign/start`.

2. **Schedule Pipeshark (n8n)**  
   - Schedule Trigger (toutes les minutes) → appel cron launch-scheduled-campaigns + récupération `email_queue` (pending, `scheduled_at` ≤ now) → pour chaque ligne : send-email ou create-draft.  
   - Remplacé par :  
     - **Cron 15 min** : `netlify/functions/cron-launch.ts` appelle `/api/cron/launch-scheduled-campaigns` (unchanged).  
     - **File d’emails** : `netlify/functions/cron-process-queue.ts` (toutes les minutes) appelle `GET /api/cron/process-email-queue`, qui charge les lignes en attente et appelle en interne `/api/n8n/send-email` ou `/api/n8n/create-draft`.

## Fichiers JSON des workflows n8n

Les fichiers `Pipeshark Workflow.json` et `Schedule Pipeshark.json` sont conservés en référence. **Ne pas commiter de secrets** : les deux contiennent des clés (HasData, CRON_SECRET, JWT Supabase). En production tout passe par les variables d’environnement.

## Erreurs corrigées par rapport aux workflows n8n

- **Pipeshark Workflow** : en n8n, le nœud « Create a row1 » utilisait `$json.message.threadId` alors que l’entrée venait de « Remove Duplicates » (sans `message.threadId`). Dans le pipeline on crée d’abord le brouillon Gmail, on récupère le `threadId`, puis on insère le lead en base avec ce `threadId`.
- **Schedule Pipeshark** : le Schedule appelait le cron toutes les minutes alors que le cron Netlify le fait déjà toutes les 15 min. La partie « traitement de la file » (pending emails) est maintenant gérée par `process-email-queue` toutes les minutes.
