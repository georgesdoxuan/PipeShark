# Exemple de mail + templates : changements n8n et Supabase

## Ce qui a été fait dans PipeShark (app)

- **Formulaire de campagne** : champ optionnel « Example email » pour coller un exemple de mail dont l’IA peut s’inspirer.
- **Templates** : les exemples sont enregistrés dans PipeShark et réutilisables (liste au-dessus du champ, clic pour réutiliser, suppression possible).
- **Lancement** : au lancement d’une campagne, si un exemple est renseigné, il est envoyé à n8n dans le body du webhook sous la clé `exampleEmail` (string).

---

## Supabase : à faire de ton côté

1. **Exécuter la migration**  
   Dans le **SQL Editor** de ton projet Supabase, exécute le contenu du fichier :

   `supabase-migrations/013_create_email_templates.sql`

   Ou, si tu appliques tout d’un coup, le bloc **013** dans `supabase-migrations/APPLY_ALL_PENDING.sql`.

2. **Vérification**  
   Après exécution, la table `email_templates` doit exister avec :
   - `id` (UUID, PK)
   - `user_id` (UUID, FK vers `auth.users`)
   - `name` (TEXT, nullable)
   - `content` (TEXT, NOT NULL)
   - `created_at` (TIMESTAMPTZ)

   RLS et politiques sont créés par la migration.

---

## n8n : à faire de ton côté

1. **Réception du body**  
   Le webhook PipeShark envoie désormais une clé optionnelle :
   - **`exampleEmail`** (string) : contenu de l’exemple de mail saisi par l’utilisateur (ou vide si non renseigné).

2. **Utilisation dans ton workflow**  
   - Dans le node **Webhook** qui reçoit le déclenchement PipeShark, le body JSON contient `exampleEmail` quand l’utilisateur a rempli « Example email ».
   - Récupère cette valeur (ex. `{{ $json.body.exampleEmail }}` ou équivalent selon ta structure de payload).
   - Passe-la à ton node **LLM / AI** (ou au node qui génère les mails) comme contexte supplémentaire, par exemple :
     - « Utilise ce style et cette structure pour les emails : … » + `exampleEmail`
     - Ou : « Exemple de mail que l’utilisateur aime : … » + `exampleEmail`.

3. **Comportement si absent**  
   Si `exampleEmail` est vide ou absent, ton prompt peut ignorer la partie « exemple » et générer le mail comme avant (sans s’inspirer d’un modèle).

4. **Exemple de prompt (idée)**  
   Tu peux adapter ton prompt du type :
   ```
   Tu génères un email de prospection. Contexte entreprise : {{ companyDescription }}.
   Ton : {{ toneOfVoice }}. Objectif : {{ campaignGoal }}.
   {% if exampleEmail %}
   Inspire-toi du style et de la structure de cet exemple (sans le recopier) :
   {{ exampleEmail }}
   {% endif %}
   ...
   ```

Résumé : côté Supabase, exécuter la migration 013 (table `email_templates`) ; côté n8n, lire `exampleEmail` dans le body du webhook et l’injecter dans ton prompt de génération d’emails.
