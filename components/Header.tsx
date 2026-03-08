'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, Sun, Moon, PanelLeft, ListTodo, HelpCircle, Zap, BarChart2, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import Image from 'next/image';
import ViperLogo from '@/components/ViperLogo';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const [user, setUser] = useState<UserProfile | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSidebarOpen(false);
    router.push('/');
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');
  const isConfigs = pathname?.startsWith('/dashboard/configuration') || pathname?.startsWith('/dashboard/business-descriptions') || pathname?.startsWith('/dashboard/exemple-mails');

  const sidebarLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full ${
      active ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-neutral-800'
    }`;

  return (
    <>
      {/* ── Sidebar only (top panel removed) ───────────────────────────── */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-screen z-40 bg-slate-50 dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-40' : 'w-14'}`}
      >
        {/* Toggle / logo — logo Pipeshark toujours visible en haut */}
        <div className={`flex items-center shrink-0 border-b border-slate-200 dark:border-neutral-800 ${sidebarOpen ? 'h-14 px-4 justify-center' : 'flex-col gap-2 py-3 justify-start'}`}>
          {sidebarOpen ? (
            <Link href="/dashboard" className="flex items-center justify-center gap-1.5 min-w-0">
              <ViperLogo className="h-12 w-auto shrink-0" />
              <span className="font-montserrat font-brand font-bold text-zinc-900 dark:text-white text-base whitespace-nowrap">Pipeshark</span>
            </Link>
          ) : (
            <>
              <Link href="/dashboard" className="flex justify-center p-1" aria-label="Pipeshark home">
                <ViperLogo className="h-10 w-auto" />
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 flex flex-col overflow-y-auto">
          <div className={`flex flex-col gap-0.5 ${sidebarOpen ? 'px-2' : 'px-1.5'}`}>
            {sidebarOpen ? (
              <>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className={sidebarLinkClass(false)}
                  aria-label="Replier le menu"
                >
                  <PanelLeft className="w-[18px] h-[18px] shrink-0" />
                </button>
                <div className="my-1 mx-2 border-t border-zinc-200 dark:border-neutral-700" aria-hidden />
              </>
            ) : null}
            <Link href="/dashboard" className={sidebarOpen ? sidebarLinkClass(isActive('/dashboard')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'Dashboard' : undefined}>
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0 text-zinc-500 dark:text-zinc-400" fill="currentColor">
                <rect x="1" y="1" width="9" height="9" rx="2.5" />
                <rect x="13" y="1" width="9" height="9" rx="2.5" />
                <rect x="1" y="13" width="9" height="9" rx="2.5" />
                <rect x="13" y="13" width="9" height="9" rx="2.5" />
              </svg>
              {sidebarOpen && <span>Dashboard</span>}
            </Link>
            <Link href="/messages" className={sidebarOpen ? sidebarLinkClass(isActive('/messages')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/messages') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'Messages' : undefined}>
              <Image src="/mail.png" alt="" width={18} height={18} className="w-[18px] h-[18px] object-contain brightness-0 opacity-70 dark:brightness-0 dark:invert dark:opacity-80 shrink-0" />
              {sidebarOpen && <span>Messages</span>}
            </Link>
            <Link href="/call-center" className={sidebarOpen ? sidebarLinkClass(isActive('/call-center')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/call-center') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'Call Center' : undefined}>
              <Image src="/phone-receiver-silhouette.png" alt="" width={18} height={18} className="w-[18px] h-[18px] object-contain brightness-0 opacity-70 dark:brightness-0 dark:invert dark:opacity-80 shrink-0" />
              {sidebarOpen && <span>Call Center</span>}
            </Link>
            {sidebarOpen ? (
              <Link href="/dashboard/configuration" className={sidebarLinkClass(isConfigs ?? false)}>
                <SlidersHorizontal className="w-[18px] h-[18px] shrink-0" />
                <span>Configurations</span>
              </Link>
            ) : null}
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex justify-center p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors w-full"
                title="Configurations"
              >
                <SlidersHorizontal className="w-[18px] h-[18px] shrink-0" />
              </button>
            )}
            <Link href="/analytics" className={sidebarOpen ? sidebarLinkClass(isActive('/analytics')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/analytics') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'Analytics' : undefined}>
              <BarChart2 className="w-[18px] h-[18px] shrink-0" />
              {sidebarOpen && <span>Analytics</span>}
            </Link>
            <Link href="/todo" className={sidebarOpen ? sidebarLinkClass(isActive('/todo')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/todo') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'To-Do list' : undefined}>
              <ListTodo className="w-[18px] h-[18px] shrink-0" />
              {sidebarOpen && <span>To-Do list</span>}
            </Link>
          </div>
        </nav>

        {/* Bottom utilities */}
        <div className={`flex flex-col gap-0.5 pb-1 ${sidebarOpen ? 'px-2' : 'px-1.5'}`}>
          {user && (
            <Link href="/preferences" className={sidebarOpen ? sidebarLinkClass(isActive('/preferences')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/preferences') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'Preferences' : undefined}>
              <Settings className="w-[18px] h-[18px] shrink-0" />
              {sidebarOpen && <span>Preferences</span>}
            </Link>
          )}
          <Link href="/contact" className={sidebarOpen ? sidebarLinkClass(isActive('/contact')) : `flex justify-center p-3 rounded-lg transition-colors ${isActive('/contact') ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800'}`} title={!sidebarOpen ? 'Help' : undefined}>
            <HelpCircle className="w-[18px] h-[18px] shrink-0" />
            {sidebarOpen && <span>Help</span>}
          </Link>
          <button
            type="button"
            onClick={() => { toggleTheme(); }}
            className={sidebarOpen ? sidebarLinkClass(false) : 'flex justify-center p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors w-full'}
            title={!sidebarOpen ? (theme === 'dark' ? 'Light theme' : 'Dark theme') : undefined}
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px] shrink-0" /> : <Moon className="w-[18px] h-[18px] shrink-0" />}
            {sidebarOpen && <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>}
          </button>
        </div>

        {/* Bottom profile */}
        {user && (
          <div className={`border-t border-slate-200 dark:border-neutral-800 ${sidebarOpen ? 'px-4 py-4' : 'px-1.5 py-3'}`}>
            {sidebarOpen ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold shrink-0">
                    {(user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    {user.fullName && (
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{user.fullName}</p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-lg transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm"
                >
                  {(user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upgrade — visible uniquement déplié */}
        {sidebarOpen && (
          <div className="px-3 pb-3">
            <Link
              href="/pricing"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors w-full"
            >
              <Zap className="w-[18px] h-[18px] shrink-0" />
              <span>Upgrade</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
