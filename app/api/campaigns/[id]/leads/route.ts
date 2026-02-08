import { NextResponse } from 'next/server';
import { getCampaignById } from '@/lib/supabase-campaigns';
import { getLeadsForCampaign } from '@/lib/supabase-leads';
import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * GET /api/campaigns/[id]/leads
 * Returns leads for this campaign.
 * Uses campaign_id when set. Fallback: matches leads with campaign_id=NULL by businessType, cities, createdAfter (for n8n not yet updated).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const campaign = await getCampaignById(user.id, params.id);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const leads = await getLeadsForCampaign(user.id, {
      id: campaign.id,
      businessType: campaign.businessType,
      cities: campaign.cities,
      createdAt: campaign.createdAt,
    });

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Error fetching campaign leads:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch leads', details: error.message },
      { status: 500 }
    );
  }
}
