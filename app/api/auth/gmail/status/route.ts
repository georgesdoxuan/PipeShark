import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from('user_profiles')
      .select('gmail_connected, gmail_email')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({
        gmailConnected: false,
        gmailEmail: null,
      });
    }

    return NextResponse.json({
      gmailConnected: !!profile.gmail_connected,
      gmailEmail: profile.gmail_email || null,
    });
  } catch (err) {
    console.error('Gmail status error:', err);
    return NextResponse.json(
      { error: 'Failed to get Gmail status' },
      { status: 500 }
    );
  }
}
