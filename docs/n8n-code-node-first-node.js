/**
 * n8n Code node – à coller après le node Webhook.
 *
 * Les villes viennent du tableau Supabase (villes anglophones 100k+ habitants).
 * L'app envoie soit une seule ville (city + cities avec 1 élément) quand elle a tiré
 * au sort côté app → on utilise cette ville telle quelle (pas de tirage ici).
 * Soit une liste de villes (cities) → on en tire une au hasard.
 *
 * Le webhook reçoit : businessType, cities (array), city (optionnel, ville unique envoyée par l'app),
 * country (optionnel), companyDescription, toneOfVoice, campaignGoal, magicLink,
 * searchMode, targetCount.
 *
 * Génère un offset de pagination aléatoire pour éviter les doublons.
 */

// Récupère les paramètres du webhook
const webhookData = $('Webhook').first().json.body || {};

const businessType = webhookData.businessType || "plumber";
const companyDescription = webhookData.companyDescription || "";
const country = webhookData.country || null;

const targetCount = typeof webhookData.targetCount === 'number' && webhookData.targetCount >= 1
  ? Math.min(20, Math.max(1, Math.round(webhookData.targetCount)))
  : 10;

const toneOfVoice = webhookData.toneOfVoice || "professional";
const campaignGoal = webhookData.campaignGoal || "book_call";
const magicLink = webhookData.magicLink || "";
const searchMode = webhookData.searchMode || "standard";
const exampleEmail = webhookData.exampleEmail || "";

// Liste des villes envoyée par l'app
const cities = Array.isArray(webhookData.cities) ? webhookData.cities : [];

// Ville à utiliser : si l'app envoie une seule ville (city ou cities avec 1 élément), on la prend telle quelle.
// Sinon on tire une ville au hasard dans la liste (ou fallback si vide).
let city;
if (typeof webhookData.city === 'string' && webhookData.city.trim()) {
  // L'app a déjà tiré une ville (ex. Toronto) → on utilise celle-là uniquement
  city = webhookData.city.trim();
} else if (cities.length === 1) {
  city = cities[0];
} else if (cities.length > 1) {
  city = cities[Math.floor(Math.random() * cities.length)];
} else {
  city = "New York";
}

// Offset de pagination aléatoire
const maxOffset = 100;
const startOffset = Math.floor(Math.random() * maxOffset);

const output = {
  business: businessType,
  city: city,
  companyDescription: companyDescription,
  toneOfVoice: toneOfVoice,
  campaignGoal: campaignGoal,
  magicLink: magicLink,
  searchMode: searchMode,
  targetCount: targetCount,
  exampleEmail: exampleEmail,
  startOffset: startOffset,
};

if (country && typeof country === 'string' && country.trim()) {
  output.country = country.trim();
}

return [{ json: output }];
