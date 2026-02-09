'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApiPause } from '@/contexts/ApiPauseContext';
import { useCampaignLoading } from '@/contexts/CampaignLoadingContext';
import { Pause, Play, LogOut, User, Settings, Sun, Moon } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ViperLogo from '@/components/ViperLogo';
import { useTheme } from '@/contexts/ThemeContext';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

export default function Header() {
  const router = useRouter();
  const { isPaused, togglePause } = useApiPause();
  const { isLoading } = useCampaignLoading();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="bg-white dark:bg-black border-b border-zinc-200 dark:border-sky-900/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className="flex items-center gap-1.5">
              <ViperLogo className="h-10 w-auto flex-shrink-0 min-w-10 self-center" />
              <h1 className="text-xl font-brand font-bold tracking-wide -ml-1"><span className="text-zinc-900 dark:text-white">Pipe</span><span className="text-zinc-900 dark:text-white">Shark</span></h1>
            </Link>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={togglePause}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                isPaused
                  ? 'bg-sky-900/60 hover:bg-sky-800/60 text-white dark:bg-sky-900/60 dark:hover:bg-sky-800/60'
                  : 'bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:hover:bg-sky-800/50 dark:text-white dark:border dark:border-sky-800/50'
              }`}
              title={isPaused ? 'Resume API requests' : 'Pause API requests'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3" />
                  <span>Resume API</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pause API</span>
                </>
              )}
            </button>
            {user && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-sky-900/40 rounded-lg transition-colors border border-zinc-300 dark:border-sky-800/50"
                >
                  <User className="w-4 h-4" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-black border border-zinc-200 dark:border-sky-800/50 rounded-xl shadow-xl py-2 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 transition-colors"
                      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    >
                      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
                    </button>
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/preferences"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Preferences
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 transition-colors"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
