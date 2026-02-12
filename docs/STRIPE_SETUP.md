# Configuration Stripe pour PipeShark

## Pourquoi Stripe plutôt que PayPal ?

- **Abonnements** : Stripe gère très bien les paiements récurrents (mensuel / annuel), idéal pour un SaaS avec crédits ou formules.
- **Intégration dev** : API claire, doc en français, webhooks pour synchroniser abonnements et crédits.
- **Coûts** : ~1,5 % + 0,25 € par transaction en Europe (pas d’abonnement mensuel).
- **Next.js** : Beaucoup d’exemples et de libs (Stripe Checkout, Customer Portal).

PayPal reste possible en complément plus tard si tu veux proposer ce moyen de paiement.

---

## 1. Créer un compte Stripe

1. Va sur **https://dashboard.stripe.com/register**
2. Inscris-toi avec ton email (pro ou perso).
3. Complète le profil (nom, pays, type d’activité). Tu peux utiliser le **mode test** sans activer les vrais paiements.

---

## 2. Récupérer les clés API

1. Dans le **Dashboard Stripe**, va dans **Developers** (menu en haut à droite) → **API keys**.
2. Tu verras :
   - **Publishable key** (commence par `pk_test_` en test, `pk_live_` en prod) → à mettre dans `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   - **Secret key** (clique sur "Reveal", commence par `sk_test_` ou `sk_live_`) → à mettre dans `STRIPE_SECRET_KEY`.
3. En **test**, garde les clés `_test_` ; quand tu passeras en prod, tu utiliseras les clés `_live_` (après activation du compte).

---

## 3. Variables d’environnement

Dans ton projet, crée ou édite **`.env.local`** (à la racine) :

```env
# Stripe (remplace par tes clés du Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

- Ne commite **jamais** `.env.local` (déjà dans `.gitignore`).
- En production (Vercel, etc.), ajoute les mêmes variables dans les paramètres du projet.

---

## 4. (Optionnel) Créer un produit / prix dans le Dashboard

Pour des offres fixes (ex. "Pro 29€/mois") :

1. **Products** → **Add product**.
2. Nom (ex. "PipeShark Pro"), description, image si tu veux.
3. **Pricing** : récurrent (mensuel) ou one-time, devise (EUR), montant.
4. Une fois créé, tu récupères un **Price ID** (ex. `price_xxxxx`). Tu peux le mettre dans `.env.local` comme `STRIPE_PRICE_ID_PRO` et l’utiliser dans l’API Checkout.

Pour l’instant le code utilise des montants dynamiques ; tu pourras passer aux Price ID quand tes offres sont figées.

---

## 5. Tester un paiement

1. Lance l’app : `npm run dev`.
2. Va sur la page **Pricing** (lien dans le header ou `/pricing`).
3. Clique sur le bouton de paiement : tu es redirigé vers Stripe Checkout (page hébergée Stripe).
4. En **mode test**, utilise les cartes de test Stripe :  
   - **4242 4242 4242 4242**  
   - Date future, CVC quelconque (ex. 12/34, 123).

---

## 6. Après un paiement réussi (webhooks, plus tard)

Quand tu voudras débloquer des crédits ou mettre à jour l’abonnement en BDD :

1. **Developers** → **Webhooks** → **Add endpoint**.
2. URL : `https://ton-domaine.com/api/stripe/webhook`.
3. Événements utiles : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Stripe te donnera un **Signing secret** (`whsec_xxx`) → à mettre dans `STRIPE_WEBHOOK_SECRET` et à utiliser dans la route `api/stripe/webhook` pour vérifier la signature.

Tu pourras ajouter une route `app/api/stripe/webhook/route.ts` qui reçoit l’événement et met à jour Supabase (crédits, statut abonnement, etc.).

---

## Résumé

| Étape | Action |
|-------|--------|
| 1 | Compte sur dashboard.stripe.com |
| 2 | Copier Publishable key + Secret key (API keys) |
| 3 | Les mettre dans `.env.local` |
| 4 | (Optionnel) Créer un produit/prix et noter le Price ID |
| 5 | Tester avec la carte 4242 4242 4242 4242 |

Une fois ces clés en place, la page Pricing et l’API Checkout du projet fonctionnent en mode test.
