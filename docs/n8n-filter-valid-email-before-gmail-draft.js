/**
 * n8n Code node – à placer JUSTE AVANT "Create Gmail Draft (OAuth)".
 *
 * Gmail renvoie "Invalid To header" si l'email est vide, "no email found", ou invalide.
 * Ce node filtre les items pour ne garder que ceux avec un email valide (et normalise le champ To).
 *
 * Entrée : les items du node précédent (chaque item = un lead avec un champ email).
 * Sortie : uniquement les items dont l'email est valide ; chaque item a un champ "to" utilisable par Gmail.
 */

const invalidEmails = ['', 'no email found', 'n/a', 'null', 'undefined'];

function isValidEmail(value) {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || invalidEmails.includes(trimmed)) return false;
  if (!trimmed.includes('@') || trimmed.length < 5) return false;
  // Reject if it looks like a placeholder
  if (trimmed.startsWith('example') || trimmed.endsWith('@example.com')) return false;
  return true;
}

function getEmailFromItem(item) {
  const json = item.json || {};
  return json.email ?? json.to ?? json.To ?? json.recipient ?? json.mail ?? '';
}

const items = $input.all();
const output = [];

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const email = getEmailFromItem(item);
  if (!isValidEmail(email)) {
    continue; // skip this lead
  }
  const trimmedEmail = String(email).trim();
  output.push({
    json: {
      ...item.json,
      to: trimmedEmail,
      To: trimmedEmail,
    },
  });
}

return output;
