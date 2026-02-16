import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-server';

const VALID_CODES: Record<string, { plan: 'standard' | 'pro' }> = {
  RBXNHGOP: { plan: 'standard' },
  OHDKJGRA: { plan: 'pro' },
};

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Log in to activate a promo code', code: 'auth_required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code) {
      return NextResponse.json(
        { error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const config = VALID_CODES[code];
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid promo code' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('user_profiles')
      .update({
        promo_code: code,
        plan: config.plan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Promo redeem error:', error);
      return NextResponse.json(
        { error: 'Could not apply the code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: config.plan,
      message: config.plan === 'standard'
        ? 'Standard plan activated for free.'
        : 'Pro plan activated for free.',
    });
  } catch (err: any) {
    console.error('Promo redeem error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
