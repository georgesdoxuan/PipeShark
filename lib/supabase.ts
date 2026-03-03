import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) {
    return createNoopClient();
  }
  try {
    return createBrowserClient(url, key);
  } catch {
    return createNoopClient();
  }
}

const noopThenable = {
  single: () => Promise.resolve({ data: null, error: null }),
  then: (fn: (r: { data: null; error: null }) => unknown) => Promise.resolve(fn({ data: null, error: null })),
};
const noopChain = { eq: () => noopThenable, order: () => noopThenable, limit: () => noopThenable, single: () => Promise.resolve({ data: null, error: null }) };

function createNoopClient() {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ ...noopChain, then: noopThenable.then }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
      upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  } as ReturnType<typeof createBrowserClient>;
}
