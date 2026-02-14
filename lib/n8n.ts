import axios from 'axios';

export type CampaignMode = 'standard' | 'local_businesses';

interface CampaignParams {
  userId: string;
  campaignId?: string;
  businessType: string;
  targetCount?: number;
  cities?: string[];
  /** Single city (when cities.length === 1, for n8n to use explicitly) */
  city?: string;
  citySize?: string;
  /** Country (e.g. when drawn randomly with city) */
  country?: string;
  companyDescription?: string;
  toneOfVoice?: string;
  campaignGoal?: string;
  magicLink?: string;
  mode?: CampaignMode;
  /** Example email for the AI to inspire from (optional) */
  exampleEmail?: string;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
  gmailEmail?: string;
}

export async function triggerN8nWorkflow(params?: CampaignParams) {
  try {
    const mode = params?.mode || 'standard';
    const url = mode === 'local_businesses'
      ? process.env.N8N_WEBHOOK_URL_LOCAL_BUSINESSES
      : process.env.N8N_WEBHOOK_URL;

    if (!url) {
      const envVar = mode === 'local_businesses' ? 'N8N_WEBHOOK_URL_LOCAL_BUSINESSES' : 'N8N_WEBHOOK_URL';
      throw new Error(`${envVar} is not defined in environment variables`);
    }
    
    console.log('🔗 N8N Webhook URL from env:', url);
    
    // Prepare request body
    const requestBody: any = {
      trigger: 'true',
      timestamp: new Date().toISOString(),
    };

    // Add campaign parameters if provided
    if (params) {
      requestBody.userId = params.userId;
      if (params.campaignId) requestBody.campaignId = params.campaignId;
      if (typeof params.targetCount === 'number') requestBody.targetCount = params.targetCount;
      requestBody.businessType = params.businessType;
      if (params.companyDescription && params.companyDescription.trim()) {
        requestBody.companyDescription = params.companyDescription;
      }
      requestBody.toneOfVoice = params.toneOfVoice || 'professional';
      requestBody.campaignGoal = params.campaignGoal || 'book_call';
      requestBody.magicLink = params.magicLink?.trim() || '';
      if (params.cities && params.cities.length > 0) {
        requestBody.cities = params.cities;
        if (params.country && params.country.trim()) {
          requestBody.country = params.country.trim();
        }
        // Single city: send explicit city + country so workflow must use this location (no fallback to other cities)
        if (params.cities.length === 1) {
          requestBody.city = params.cities[0];
          if (params.country && params.country.trim()) {
            requestBody.country = params.country.trim();
          }
        }
        // Don't send citySize if cities are specified
      } else if (params.citySize) {
        requestBody.citySize = params.citySize;
      }
      if (params.city && params.city.trim()) {
        requestBody.city = params.city.trim();
      }
      if (params.exampleEmail && params.exampleEmail.trim()) {
        requestBody.exampleEmail = params.exampleEmail.trim();
      }
      if (params.gmailAccessToken) requestBody.gmailAccessToken = params.gmailAccessToken;
      if (params.gmailRefreshToken) requestBody.gmailRefreshToken = params.gmailRefreshToken;
      if (params.gmailEmail) requestBody.gmailEmail = params.gmailEmail;
    }
    
    console.log('🚀 Triggering n8n workflow with POST:', url);
    console.log('📋 Request body:', JSON.stringify(requestBody, null, 2));
    
    // Send POST request with JSON body
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 secondes de timeout
      validateStatus: (status) => {
        // Accepter tous les codes sauf les erreurs réseau
        return status < 500;
      }
    });
    
    console.log('✅ Webhook response received:');
    console.log('   - Status:', response.status);
    console.log('   - Data:', response.data);
    
    // Vérifier si c'est une erreur 404 (webhook non enregistré)
    if (response.status === 404) {
      const errorMsg = response.data?.message || 'Webhook not found';
      const hint = response.data?.hint || '';
      
      console.error('❌ Webhook 404 Error:');
      console.error('   - Message:', errorMsg);
      if (hint) {
        console.error('   - Hint:', hint);
      }
      
      // Si c'est une URL de test, donner des instructions spécifiques
      if (url.includes('/ok-test/')) {
        throw new Error(
          'Webhook de test non disponible. ' +
          'Dans n8n, cliquez sur "Listen for test event" dans le node Webhook, ' +
          'puis réessayez. ' +
          'Ou utilisez l\'URL de production et activez le workflow.'
        );
      } else {
        throw new Error(
          'Webhook non enregistré. ' +
          'Activez le workflow dans n8n (toggle en haut à droite) pour utiliser l\'URL de production. ' +
          'Ou utilisez l\'URL de test avec "Listen for test event".'
        );
      }
    }
    
    return { 
      success: true, 
      message: 'Workflow triggered',
      status: response.status,
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ Error triggering n8n workflow:');
    
    if (error.code === 'ECONNABORTED') {
      console.error('   - Timeout: La requête a pris trop de temps');
      // Timeout peut être OK si le workflow continue
      return { success: true, message: 'Workflow triggered (timeout but may have worked)' };
    }
    
    if (error.response) {
      // Le serveur a répondu avec un code d'erreur
      console.error('   - Response status:', error.response.status);
      console.error('   - Response data:', error.response.data);
      console.error('   - Response headers:', error.response.headers);
      throw new Error(`Webhook returned status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('   - No response received from server');
      console.error('   - Request URL:', error.config?.url);
      console.error('   - Error code:', error.code);
      throw new Error(`No response from webhook: ${error.message}. Check if the URL is correct: ${process.env.N8N_WEBHOOK_URL}`);
    } else {
      // Erreur lors de la configuration de la requête
      console.error('   - Request setup error:', error.message);
      throw new Error(`Failed to setup request: ${error.message}`);
    }
  }
}