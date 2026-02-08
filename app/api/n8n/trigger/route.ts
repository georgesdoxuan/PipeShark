import { NextResponse } from 'next/server';
import { triggerN8nWorkflow } from '@/lib/n8n';

export async function POST() {
  console.log('\n=== N8N TRIGGER API CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    if (!process.env.N8N_WEBHOOK_URL) {
      console.error('❌ N8N_WEBHOOK_URL is not configured');
      return NextResponse.json(
        { 
          error: 'N8N_WEBHOOK_URL is not configured',
          hint: 'Check your .env.local file'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ N8N_WEBHOOK_URL is set');
    console.log('URL:', process.env.N8N_WEBHOOK_URL);
    
    const result = await triggerN8nWorkflow();
    console.log('✅ Workflow triggered successfully');
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('\n❌ API Error Details:');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger workflow',
        details: error.message || 'Unknown error',
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}