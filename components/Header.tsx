'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Settings, Sun, Moon, Menu, X, ListTodo, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ViperLogo from '@/components/ViperLogo';
import { useTheme } from '@/contexts/ThemeContext';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

const navLinkClass = "flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 transition-colors";

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('button[aria-label="Open menu"]')) {
          setSidebarOpen(false);
        }
      }
    }
    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSidebarOpen(false);
    router.push('/');
    router.refresh();
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <>
      <header className="bg-white dark:bg-black border-b border-zinc-200 dark:border-sky-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="p-2 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" strokeWidth={2} />
              </button>
              <Link href="/dashboard" className="flex items-center gap-1.5">
                <ViperLogo className="h-10 w-auto flex-shrink-0 min-w-10 self-center" />
                <h1 className="text-xl font-brand font-bold tracking-wide -ml-1"><span className="text-zinc-900 dark:text-white">Pipe</span><span className="text-zinc-900 dark:text-white">Shark</span></h1>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar overlay + panel */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-hidden
          />
          <div
            ref={sidebarRef}
            className="relative w-72 max-w-[85vw] bg-white dark:bg-neutral-900 border-r border-zinc-200 dark:border-sky-800/50 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-sky-800/50">
              <div className="flex items-center gap-2">
                <ViperLogo className="h-8 w-auto" />
                <span className="font-brand font-bold text-zinc-900 dark:text-white">PipeShark</span>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4">
              <Link href="/dashboard" onClick={closeSidebar} className={navLinkClass}>
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                Dashboard
              </Link>
              <Link href="/todo" onClick={closeSidebar} className={navLinkClass}>
                <ListTodo className="w-5 h-5 shrink-0" />
                To-Do list
              </Link>
              <button
                type="button"
                onClick={() => { toggleTheme(); }}
                className={navLinkClass + ' w-full'}
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
              </button>
              {user && (
                <>
                  <Link href="/profile" onClick={closeSidebar} className={navLinkClass}>
                    <User className="w-5 h-5 shrink-0" />
                    Profile
                  </Link>
                  <Link href="/preferences" onClick={closeSidebar} className={navLinkClass}>
                    <Settings className="w-5 h-5 shrink-0" />
                    Preferences
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={navLinkClass + ' w-full'}
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    Sign out
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
