import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { listGmailAccountsForUser, canAddGmailAccount } from '@/lib/supabase-gmail-accounts';
import { getUserPlanInfo } from '@/lib/supabase-user-plan';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await listGmailAccountsForUser(user.id);
    const planInfo = await getUserPlanInfo(user.id);
    const canAddMore = await canAddGmailAccount(user.id);

    return NextResponse.json({
      accounts,
      plan: planInfo.plan,
      dailyLimit: planInfo.dailyLimit,
      canAddMore,
    });
  } catch (err) {
    console.error('Gmail accounts error:', err);
    return NextResponse.json(
      { error: 'Failed to list Gmail accounts' },
      { status: 500 }
    );
  }
}
