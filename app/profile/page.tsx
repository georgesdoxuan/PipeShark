'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { User } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((result: { data: { user: SupabaseUser | null } }) => {
      const authUser = result.data?.user;
      if (authUser) {
        setUser({
          email: authUser.email || null,
          fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-black/70 relative">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-neutral-800 shadow-sm dark:shadow-none p-6">
            <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
              <User className="w-6 h-6 text-zinc-700 dark:text-white" />
              Profile
            </h1>
            {loading ? (
              <p className="text-zinc-500 dark:text-neutral-400">Loading...</p>
            ) : user ? (
              <div className="space-y-4">
                {user.fullName && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 dark:text-neutral-500 mb-1">Name</label>
                    <p className="text-zinc-900 dark:text-white font-medium">{user.fullName}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-500 dark:text-neutral-500 mb-1">Email</label>
                  <p className="text-zinc-900 dark:text-white font-medium break-all">{user.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-zinc-500 dark:text-neutral-400">Not logged in</p>
            )}
          </div>
        </div>
    </div>
  );
}
