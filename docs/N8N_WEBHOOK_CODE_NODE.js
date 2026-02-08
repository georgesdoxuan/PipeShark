/**
 * n8n Code node – à coller après le node Webhook.
 *
 * Les villes viennent du tableau Supabase (villes anglophones 100k+ habitants).
 * L'app envoie dans le webhook la liste des villes (cities) selon la taille choisie (citySize).
 * Ce node tire une ville au hasard dans cette liste et renvoie targetCount dans l'output.
 *
 * Le webhook reçoit : businessType, cities (array depuis Supabase), companyDescription,
 * country (optionnel, tirage au sort côté app), toneOfVoice, campaignGoal, magicLink,
 * searchMode, targetCount.
 */

// Récupère les paramètres du webhook
const webhookData = $('Webhook').item.json.body || {};

const businessType = webhookData.businessType || "plumber";
const companyDescription = webhookData.companyDescription || "";
const country = webhookData.country || null; // Optionnel : pays (quand tirage au sort côté app)

// Nombre de leads choisi par l'utilisateur pour la campagne (formulaire)
const targetCount = typeof webhookData.targetCount === 'number' && webhookData.targetCount >= 1
  ? Math.min(20, Math.max(1, Math.round(webhookData.targetCount)))
  : 10;

const toneOfVoice = webhookData.toneOfVoice || "professional";
const campaignGoal = webhookData.campaignGoal || "book_call";
const magicLink = webhookData.magicLink || "";
const searchMode = webhookData.searchMode || "standard";

// Liste des villes envoyée par l'app (depuis Supabase, filtrée par citySize)
const cities = Array.isArray(webhookData.cities) ? webhookData.cities : [];

// Une ville au hasard dans la liste (ou fallback si vide)
const city = cities.length > 0
  ? cities[Math.floor(Math.random() * cities.length)]
  : "New York";

// Objet de sortie : champs de base + targetCount
const output = {
  business: businessType,
  city: city,
  companyDescription: companyDescription,
  toneOfVoice: toneOfVoice,
  campaignGoal: campaignGoal,
  magicLink: magicLink,
  searchMode: searchMode,
  targetCount: targetCount
};

if (country && typeof country === 'string' && country.trim()) {
  output.country = country.trim();
}

return [{ json: output }];
