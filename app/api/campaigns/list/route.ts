import { NextResponse } from 'next/server';
import { getCampaignsForUser } from '@/lib/supabase-campaigns';
import { getCountriesForCityNames } from '@/lib/supabase-cities';
import { getLastLeadAtByCampaign } from '@/lib/supabase-leads';
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

    const [campaigns, lastLeadAtByCampaign] = await Promise.all([
      getCampaignsForUser(user.id),
      getLastLeadAtByCampaign(user.id),
    ]);
    const allCityNames = [...new Set(campaigns.flatMap((c) => c.cities || []))];
    const countryByCity = await getCountriesForCityNames(allCityNames);

    const campaignsWithCountry = campaigns.map((c) => ({
      ...c,
      lastLeadAt: lastLeadAtByCampaign[c.id] ?? undefined,
      countryByCity: c.cities?.length
        ? Object.fromEntries(
            c.cities.filter((name) => countryByCity[name]).map((name) => [name, countryByCity[name]])
          )
        : undefined,
    }));

    return NextResponse.json(campaignsWithCountry);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error.message);
    return NextResponse.json({ error: 'Failed to fetch campaigns', details: error.message }, { status: 500 });
  }
}
