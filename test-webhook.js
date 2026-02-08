// Script de test pour vérifier l'URL du webhook n8n
// Utilisez: node test-webhook.js
// Le script charge automatiquement N8N_WEBHOOK_URL depuis .env.local
// OU définissez: N8N_WEBHOOK_URL="votre-url" node test-webhook.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnvFile();

const url = process.env.N8N_WEBHOOK_URL;

console.log('\n🔍 Test du webhook n8n\n');
console.log('URL configurée:', url || '❌ NON DÉFINIE');

if (!url) {
  console.error('\n❌ N8N_WEBHOOK_URL n\'est pas définie dans .env.local');
  process.exit(1);
}

// Préparer le body JSON comme dans le code réel
const requestBody = {
  trigger: 'true',
  timestamp: new Date().toISOString(),
  businessType: 'test',
  companyDescription: 'Test description for webhook',
  toneOfVoice: 'professional',
  campaignGoal: 'book_call',
  magicLink: '',
  citySize: '1M+'
};

console.log('\n🚀 Test de la requête POST (comme le code réel)...\n');
console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));

axios.post(url, requestBody, {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  validateStatus: (status) => status < 500
})
  .then(response => {
    console.log('\n✅ Succès !');
    console.log('   Status:', response.status);
    console.log('   Data:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Le webhook répond correctement !');
  })
  .catch(error => {
    console.error('\n❌ Erreur:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      if (error.response.status === 404) {
        console.error('\n⚠️  Webhook non trouvé (404)');
        console.error('   Vérifiez que le workflow est bien publié dans n8n');
      }
    } else if (error.request) {
      console.error('   Pas de réponse du serveur');
      console.error('   Vérifiez que le workflow est activé dans n8n');
      console.error('   URL appelée:', url);
    } else {
      console.error('   Erreur:', error.message);
    }
    process.exit(1);
  });
