import { NextResponse } from 'next/server';
import { getCampaignById, deleteCampaign, updateCampaign } from '@/lib/supabase-campaigns';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Error fetching campaign:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch campaign', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();

    const updates: Parameters<typeof updateCampaign>[2] = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.companyDescription !== undefined) updates.companyDescription = body.companyDescription;
    if (body.toneOfVoice !== undefined) updates.toneOfVoice = body.toneOfVoice;
    if (body.campaignGoal !== undefined) updates.campaignGoal = body.campaignGoal;
    if (body.magicLink !== undefined) updates.magicLink = body.magicLink;
    if (body.cities !== undefined) updates.cities = body.cities;
    if (body.citySize !== undefined) updates.citySize = body.citySize;
    if (body.numberCreditsUsed !== undefined) updates.numberCreditsUsed = body.numberCreditsUsed;
    if (body.gmailEmail !== undefined) updates.gmailEmail = body.gmailEmail;
    if (body.titleColor !== undefined) updates.titleColor = body.titleColor;

    const campaign = await updateCampaign(user.id, params.id, updates);
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error('Error updating campaign:', error.message);
    return NextResponse.json(
      { error: 'Failed to update campaign', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const success = await deleteCampaign(user.id, params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting campaign:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete campaign', details: error.message },
      { status: 500 }
    );
  }
}
