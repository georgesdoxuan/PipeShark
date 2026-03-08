'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, Sun, Moon, PanelLeft, ListTodo, FileText, Mail, Bell, Sparkles, MessageCircle, HelpCircle, ChevronDown, Zap, LayoutDashboard, Phone, BarChart2, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import ViperLogo from '@/components/ViperLogo';
import { useTheme } from '@/contexts/ThemeContext';
import { useSidebar } from '@/contexts/SidebarContext';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

const NOTIF_SEEN_KEY = 'pipeshark_notif_seen';

interface NotificationData {
  todayLeadsCount: number;
  todayLeads: Array<{ id: string; created_at: string }>;
  todayCampaignName?: string | null;
  todayLeadLabel?: string | null;
  recentReplies: Array<{
    id: string;
    email: string | null;
    replied_at: string;
    campaign_id: string | null;
    campaignName?: string | null;
  }>;
}

const navLinkClass = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors w-full";

function formatLeadTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { sidebarOpen, setSidebarOpen } = useSidebar();
  const [user, setUser] = useState<UserProfile | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifSeenToday, setNotifSeenToday] = useState(false);
  const [configsOpen, setConfigsOpen] = useState(false);
  const configsRef = useRef<HTMLDivElement>(null);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('button[aria-label="Notifications"]')) {
          setNotificationsOpen(false);
        }
      }
      if (configsRef.current && !configsRef.current.contains(e.target as Node)) {
        setConfigsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSidebarOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().split('T')[0];
    setNotifSeenToday(!!localStorage.getItem(`${NOTIF_SEEN_KEY}_${today}`));
  }, [pathname]);

  useEffect(() => {
    if (!user || !notificationsOpen) return;
    setNotificationsLoading(true);
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch'))))
      .then((data) => setNotifications(data))
      .catch(() => setNotifications(null))
      .finally(() => setNotificationsLoading(false));
  }, [user, notificationsOpen]);

  function markNewLeadsSeen() {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(`${NOTIF_SEEN_KEY}_${today}`, '1');
    setNotifSeenToday(true);
    setNotificationsOpen(false);
  }

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

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');
  const isConfigs = pathname?.startsWith('/dashboard/business-descriptions') || pathname?.startsWith('/dashboard/exemple-mails');

  const bannerNavClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
      active
        ? 'bg-zinc-100 dark:bg-neutral-800 text-zinc-900 dark:text-white'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-neutral-800/60'
    }`;

  return (
    <>
      {/* ── White top banner ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur border-b border-zinc-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          {/* Left: logo (visible when sidebar collapsed) */}
          <div className="flex items-center gap-2 shrink-0 min-w-[120px]">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ViperLogo className="h-8 w-auto" />
              <span className="font-brand font-bold text-zinc-900 dark:text-white text-sm hidden sm:block">Pipeshark</span>
            </Link>
          </div>

          {/* Center: nav tabs */}
          <nav className="flex items-center gap-3 flex-1 justify-center">
            <Link href="/dashboard" className={bannerNavClass(isActive('/dashboard'))}>
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="currentColor">
                <rect x="1" y="1" width="9" height="9" rx="2.5" />
                <rect x="13" y="1" width="9" height="9" rx="2.5" />
                <rect x="1" y="13" width="9" height="9" rx="2.5" />
                <rect x="13" y="13" width="9" height="9" rx="2.5" />
              </svg>
              Dashboard
            </Link>
            <Link href="/messages" className={bannerNavClass(isActive('/messages'))}>
              <MessageCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              Messages
            </Link>
            <Link href="/call-center" className={bannerNavClass(isActive('/call-center'))}>
              <Phone className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              Call Center
            </Link>
            {/* Configurations dropdown */}
            <div ref={configsRef} className="relative">
              <button
                type="button"
                onClick={() => setConfigsOpen((o) => !o)}
                className={bannerNavClass(isConfigs ?? false)}
              >
                <SlidersHorizontal className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                Configurations
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${configsOpen ? 'rotate-180' : ''}`} />
              </button>
              {configsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-52 rounded-xl border border-zinc-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl z-[60] overflow-hidden py-1">
                  <Link
                    href="/dashboard/business-descriptions"
                    onClick={() => setConfigsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    Business description
                  </Link>
                  <Link
                    href="/dashboard/exemple-mails"
                    onClick={() => setConfigsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    Exemple mails
                  </Link>
                </div>
              )}
            </div>
            <Link href="/analytics" className={bannerNavClass(isActive('/analytics'))}>
              <BarChart2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              Analytics
            </Link>
          </nav>

          {/* Right: notifications + user */}
          <div className="flex items-center gap-1 shrink-0 min-w-[120px] justify-end">
            {user && (
              <>
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((o) => !o)}
                    aria-label="Notifications"
                    className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-neutral-800 rounded-lg transition-colors relative"
                  >
                    <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
                    {notifications && ((notifications.todayLeadsCount > 0 && !notifSeenToday) || notifications.recentReplies.length > 0) && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full" aria-hidden />
                    )}
                  </button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-[min(90vw,380px)] rounded-2xl border border-zinc-200 dark:border-sky-800/50 bg-white dark:bg-neutral-900 shadow-2xl shadow-black/10 dark:shadow-black/40 z-[60] overflow-hidden">
                      <div className="px-4 py-3.5 bg-zinc-50 dark:bg-neutral-800/50 border-b border-zinc-100 dark:border-sky-900/50">
                        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sky-500" />
                          Notifications
                        </h3>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto">
                        {notificationsLoading ? (
                          <div className="p-6 text-center text-sm text-zinc-500 dark:text-sky-400">Loading…</div>
                        ) : notifications ? (
                          <>
                            <div className="p-4 border-b border-zinc-100 dark:border-sky-900/50">
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50">
                                    <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                                  </span>
                                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-sky-500">New leads</span>
                                </div>
                                {(notifications.todayCampaignName ?? notifications.todayLeadLabel) && (
                                  <span className="text-xs text-zinc-400 dark:text-sky-500 truncate max-w-[160px]">
                                    {notifications.todayCampaignName ?? notifications.todayLeadLabel}
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => { markNewLeadsSeen(); router.push('/dashboard?leads=today'); }}
                                className="block w-full text-left rounded-xl p-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-800/50 transition-colors cursor-pointer"
                              >
                                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                                  {notifications.todayLeadsCount} New lead{notifications.todayLeadsCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-sky-400 mt-0.5">View leads table</p>
                              </button>
                              {notifications.todayLeads.length > 0 && (
                                <p className="mt-3 text-sm text-zinc-600 dark:text-sky-300 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                  {formatLeadTime(notifications.todayLeads[0].created_at)}
                                </p>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-sky-500">Recent replies</span>
                              </div>
                              {notifications.recentReplies.length === 0 ? (
                                <p className="text-sm text-zinc-500 dark:text-sky-400 py-2">No replies yet</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {notifications.recentReplies.map((r) => (
                                    <li key={r.id} className="text-sm">
                                      <Link
                                        href={r.campaign_id ? `/campaigns/${r.campaign_id}` : '/dashboard'}
                                        onClick={() => setNotificationsOpen(false)}
                                        className="flex flex-col rounded-xl p-3 hover:bg-zinc-100 dark:hover:bg-sky-900/30 text-zinc-700 dark:text-sky-200 transition-colors"
                                      >
                                        <span className="font-medium text-zinc-900 dark:text-white truncate">{r.email || 'Unknown'}</span>
                                        {r.campaignName && <span className="text-xs text-zinc-500 dark:text-sky-500 truncate">{r.campaignName}</span>}
                                        <span className="text-xs text-zinc-400 dark:text-sky-600 mt-0.5">{formatRelativeTime(r.replied_at)}</span>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="p-6 text-center text-sm text-zinc-500 dark:text-sky-400">Unable to load notifications</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Sidebar rail ───────────────────────────────────────────────── */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 h-screen z-40 bg-slate-50 dark:bg-neutral-900 border-r border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-52' : 'w-14'}`}
      >
        {/* Toggle / logo */}
        <div className={`flex items-center h-14 shrink-0 border-b border-slate-200 dark:border-neutral-800 ${sidebarOpen ? 'px-4 justify-between' : 'justify-center'}`}>
          {sidebarOpen ? (
            <>
              <Link href="/dashboard" onClick={closeSidebar} className="flex items-center gap-2 min-w-0">
                <ViperLogo className="h-8 w-auto shrink-0" />
                <span className="font-brand font-bold text-zinc-900 dark:text-white whitespace-nowrap">Pipeshark</span>
              </Link>
              <button
                type="button"
                onClick={closeSidebar}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-lg transition-colors shrink-0 ml-2"
                aria-label="Close menu"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User account — expanded only */}
        {sidebarOpen && user && (
          <div className="px-3 py-3 border-b border-slate-200 dark:border-neutral-800">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-200/60 dark:bg-neutral-800">
              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {(user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate whitespace-nowrap">
                {user.fullName || user.email}
              </span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-2 flex flex-col overflow-y-auto">
          <div className={`flex flex-col gap-0.5 ${sidebarOpen ? 'px-2' : 'px-1.5'}`}>
            <Link href="/todo" onClick={closeSidebar} className={sidebarOpen ? navLinkClass : 'flex justify-center p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors'} title={!sidebarOpen ? 'To-Do list' : undefined}>
              <ListTodo className="w-[18px] h-[18px] shrink-0" />
              {sidebarOpen && <span>To-Do list</span>}
            </Link>
          </div>

        </nav>

        {/* Bottom utilities */}
        <div className={`flex flex-col gap-0.5 pb-1 ${sidebarOpen ? 'px-2' : 'px-1.5'}`}>
          <Link href="/contact" onClick={closeSidebar} className={sidebarOpen ? navLinkClass : 'flex justify-center p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors'} title={!sidebarOpen ? 'Contact' : undefined}>
            <HelpCircle className="w-[18px] h-[18px] shrink-0" />
            {sidebarOpen && <span>Contact</span>}
          </Link>
          {user && (
            <Link href="/preferences" onClick={closeSidebar} className={sidebarOpen ? navLinkClass : 'flex justify-center p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors'} title={!sidebarOpen ? 'Preferences' : undefined}>
              <Settings className="w-[18px] h-[18px] shrink-0" />
              {sidebarOpen && <span>Preferences</span>}
            </Link>
          )}
          <button
            type="button"
            onClick={() => { toggleTheme(); }}
            className={sidebarOpen ? navLinkClass : 'flex justify-center p-3 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-slate-200/80 dark:hover:bg-neutral-800 transition-colors w-full'}
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
              onClick={closeSidebar}
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
