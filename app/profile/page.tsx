'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
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
    <div className="min-h-screen bg-black relative">
      <div className="relative z-10">
        <Header />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
            <h1 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
              <User className="w-6 h-6" />
              Profile
            </h1>
            {loading ? (
              <p className="text-neutral-400">Loading...</p>
            ) : user ? (
              <div className="space-y-4">
                {user.fullName && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-1">Name</label>
                    <p className="text-white">{user.fullName}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">Email</label>
                  <p className="text-white break-all">{user.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-neutral-400">Not logged in</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
