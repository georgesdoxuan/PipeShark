import { createAdminClient } from './supabase-server';

/** Standard (and trial) plan: 30 credits/day. Pro: 90/day. */
export const DAILY_LIMIT_STANDARD = 30;
export const DAILY_LIMIT_PRO = 90;

const PROMO_STANDARD_FREE = 'RBXNHGOP';
const PROMO_PRO_FREE = 'OHDKJGRA';

export interface UserPlanInfo {
  plan: string | null;
  promoCode: string | null;
  trialEndsAt: string | null;
  dailyLimit: number;
  trialExpired: boolean;
}

/**
 * Returns the daily credit limit for a user based on plan and promo_code.
 * - promo_code = RBXNHGOP → Standard for free → 30/day
 * - plan = 'standard' → 30/day
 * - plan = 'trial' → 30/day until trial_ends_at, then 0 until they upgrade
 * - plan = 'pro' → 90/day. business or null (legacy) → 90 for now
 */
export async function getDailyLimitForUser(userId: string): Promise<number> {
  const info = await getUserPlanInfo(userId);
  return info.dailyLimit;
}

/**
 * Returns full plan info including daily limit. Used by count-today and UI.
 */
export async function getUserPlanInfo(userId: string): Promise<UserPlanInfo> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('user_profiles')
    .select('plan, promo_code, trial_ends_at')
    .eq('id', userId)
    .single();

  const plan = (row?.plan as string) || 'trial';
  const promoCode = row?.promo_code ?? null;
  const trialEndsAt = row?.trial_ends_at ?? null;

  // Promo code RBXNHGOP = Standard for free
  if (promoCode === PROMO_STANDARD_FREE) {
    return {
      plan: 'standard',
      promoCode,
      trialEndsAt,
      dailyLimit: DAILY_LIMIT_STANDARD,
      trialExpired: false,
    };
  }

  // Promo code OHDKJGRA = Pro for free
  if (promoCode === PROMO_PRO_FREE) {
    return {
      plan: 'pro',
      promoCode,
      trialEndsAt,
      dailyLimit: DAILY_LIMIT_PRO,
      trialExpired: false,
    };
  }

  if (plan === 'standard') {
    return {
      plan: 'standard',
      promoCode,
      trialEndsAt,
      dailyLimit: DAILY_LIMIT_STANDARD,
      trialExpired: false,
    };
  }

  if (plan === 'trial') {
    const expired = trialEndsAt ? new Date(trialEndsAt) < new Date() : false;
    return {
      plan: 'trial',
      promoCode,
      trialEndsAt,
      dailyLimit: expired ? 0 : DAILY_LIMIT_STANDARD,
      trialExpired: expired,
    };
  }

  // pro, business, or null (legacy)
  return {
    plan: plan || null,
    promoCode,
    trialEndsAt,
    dailyLimit: DAILY_LIMIT_PRO,
    trialExpired: false,
  };
}

/**
 * Set trial_ends_at to now + 7 days when not already set (e.g. on first Gmail connect).
 */
export async function ensureTrialEndsAt(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('user_profiles')
    .select('trial_ends_at, plan')
    .eq('id', userId)
    .single();

  if (row?.trial_ends_at || (row?.plan && row.plan !== 'trial')) return;

  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  await admin
    .from('user_profiles')
    .update({
      trial_ends_at: sevenDays.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}
