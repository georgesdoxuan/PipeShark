import { NextRequest, NextResponse } from 'next/server';
import { getCitiesFromSupabase } from '@/lib/supabase-cities';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const citySize = request.nextUrl.searchParams.get('citySize') || '1M+';
    const cities = await getCitiesFromSupabase(citySize);
    return NextResponse.json(cities);
  } catch (error: any) {
    console.error('GET /api/cities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    );
  }
}
