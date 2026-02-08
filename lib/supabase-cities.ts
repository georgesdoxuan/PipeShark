import { createServerSupabaseClient } from './supabase-server';

/** When citySize is "500K+", we need 1M+ and 500K-1M; "250K+" = 1M+ + 500K-1M + 250K-500K; etc. */
const BUCKET_MAP: Record<string, string[]> = {
  '1M+': ['1M+'],
  '500K-1M': ['500K-1M'],
  '500K+': ['1M+', '500K-1M'],
  '250K-500K': ['250K-500K'],
  '250K+': ['1M+', '500K-1M', '250K-500K'],
  '100K-250K': ['100K-250K'],
  '100K+': ['1M+', '500K-1M', '250K-500K', '100K-250K'],
  '50K-100K': ['50K-100K'],
  all: ['1M+', '500K-1M', '250K-500K', '100K-250K', '50K-100K'],
};

/**
 * Fetches English-speaking cities (100k+ inhabitants) from Supabase by citySize.
 * Used when launching a campaign without specific cities, and for n8n to pick one.
 */
export async function getCitiesFromSupabase(citySize: string): Promise<{ name: string; country: string }[]> {
  const supabase = await createServerSupabaseClient();
  const buckets = BUCKET_MAP[citySize] ?? ['1M+'];

  const { data, error } = await supabase
    .from('cities')
    .select('name, country')
    .in('population_bucket', buckets);

  if (error) {
    console.error('getCitiesFromSupabase error:', error);
    return [];
  }

  return (data || []).map((row: { name: string; country: string }) => ({
    name: row.name,
    country: row.country,
  }));
}

/**
 * Returns one random city (and country) from the given citySize category.
 * Used when re-running a campaign so each run targets a different city in the same size bucket.
 */
export async function getRandomCityFromSupabase(
  citySize: string
): Promise<{ name: string; country: string } | null> {
  const list = await getCitiesFromSupabase(citySize);
  if (list.length === 0) return null;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
