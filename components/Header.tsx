'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Settings, Sun, Moon, Menu, X, LayoutDashboard, ListTodo, FileText, Mail, Bell, Sparkles, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import ViperLogo from '@/components/ViperLogo';
import { useTheme } from '@/contexts/ThemeContext';

interface UserProfile {
  email: string | null;
  fullName?: string | null;
}

const NOTIF_SEEN_KEY = 'pipeshark_notif_seen';

interface NotificationData {
  todayLeadsCount: number;
  todayLeads: Array<{ id: string; created_at: string }>;
  todayCampaignName?: string | null;
  /** Fallback when campaign_id is null (e.g. business type) */
  todayLeadLabel?: string | null;
  recentReplies: Array<{
    id: string;
    email: string | null;
    replied_at: string;
    campaign_id: string | null;
    campaignName?: string | null;
  }>;
}

const navLinkClass = "flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-700 dark:text-sky-200 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 transition-colors";

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
  const [user, setUser] = useState<UserProfile | null>(null);
  // Toujours fermé au montage : chaque page rend son propre Header, donc à chaque navigation le sidebar reviendrait ouvert si on initialisait à true
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifSeenToday, setNotifSeenToday] = useState(false);

  // Fermer le sidebar à chaque changement de route (au cas où le même Header resterait monté)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        if (!target.closest('button[aria-label="Notifications"]')) {
          setNotificationsOpen(false);
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
  }, [sidebarOpen, notificationsOpen]);

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

  return (
    <>
      <header className="bg-white dark:bg-black border-b border-zinc-200 dark:border-sky-900/50 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="p-1.5 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" strokeWidth={2} />
              </button>
              <Link href="/dashboard" className="flex items-center gap-2">
                <ViperLogo className="h-12 w-auto flex-shrink-0 min-w-12 self-center" />
                <h1 className="text-lg font-brand font-bold tracking-wide text-zinc-900 dark:text-white">Pipeshark</h1>
              </Link>
            </div>
            {user && (
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((o) => !o)}
                  aria-label="Notifications"
                  className="p-1.5 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-sky-900/40 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" strokeWidth={2} />
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
                        <div className="p-6 text-center text-sm text-zinc-500 dark:text-sky-400">Chargement…</div>
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
                                <span className="text-xs text-zinc-400 dark:text-sky-500 truncate max-w-[160px]" title={notifications.todayCampaignName ?? notifications.todayLeadLabel ?? ''}>
                                  {notifications.todayCampaignName ?? notifications.todayLeadLabel}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                markNewLeadsSeen();
                                router.push('/dashboard?leads=today');
                              }}
                              className="block w-full text-left rounded-xl p-3 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-800/50 transition-colors cursor-pointer"
                            >
                              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                                {notifications.todayLeadsCount} New lead{notifications.todayLeadsCount !== 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-sky-400 mt-0.5">Voir le tableau des leads</p>
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
                                      <span className="font-medium text-zinc-900 dark:text-white truncate">
                                        {r.email || 'Unknown'}
                                      </span>
                                      {r.campaignName && (
                                        <span className="text-xs text-zinc-500 dark:text-sky-500 truncate">{r.campaignName}</span>
                                      )}
                                      <span className="text-xs text-zinc-400 dark:text-sky-600 mt-0.5">
                                        {formatRelativeTime(r.replied_at)}
                                      </span>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="p-6 text-center text-sm text-zinc-500 dark:text-sky-400">Impossible de charger les notifications</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar overlay + panel — ouvert/fermé dynamiquement avec transition */}
      <div
        className={`fixed inset-0 z-[100] flex transition-[visibility] duration-300 ${sidebarOpen ? 'visible' : 'invisible pointer-events-none'}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!sidebarOpen}
        aria-label="Navigation menu"
      >
        <div
          className={`absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeSidebar}
          aria-hidden
        />
        <div
          ref={sidebarRef}
          className={`relative w-72 max-w-[85vw] bg-white dark:bg-neutral-900 border-r border-zinc-200 dark:border-sky-800/50 shadow-xl flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-sky-800/50">
              <div className="flex items-center gap-2">
                <ViperLogo className="h-10 w-auto" />
                <span className="font-brand font-bold text-zinc-900 dark:text-white">Pipeshark</span>
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
            <nav className="flex-1 py-4 flex flex-col min-h-0">
              <div className="flex flex-col">
                <Link href="/dashboard" onClick={closeSidebar} className={navLinkClass}>
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  Dashboard
                </Link>
                <Link href="/todo" onClick={closeSidebar} className={navLinkClass}>
                  <ListTodo className="w-5 h-5 shrink-0" />
                  To-Do list
                </Link>
                {user && (
                  <Link href="/profile" onClick={closeSidebar} className={navLinkClass}>
                    <User className="w-5 h-5 shrink-0" />
                    Profile
                  </Link>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-sky-800/50">
                <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-sky-500">
                  Templates
                </p>
                <Link href="/dashboard/business-descriptions" onClick={closeSidebar} className={navLinkClass}>
                  <FileText className="w-5 h-5 shrink-0" />
                  Business description
                </Link>
                <Link href="/dashboard/exemple-mails" onClick={closeSidebar} className={navLinkClass}>
                  <Mail className="w-5 h-5 shrink-0" />
                  Exemple mails
                </Link>
              </div>
              <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-sky-800/50 space-y-0">
                {user && (
                  <Link href="/preferences" onClick={closeSidebar} className={navLinkClass}>
                    <Settings className="w-5 h-5 shrink-0" />
                    Preferences
                  </Link>
                )}
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
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={navLinkClass + ' w-full'}
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5 shrink-0" />
                    Sign out
                  </button>
                )}
              </div>
            </nav>
          </div>
        </div>
    </>
  );
}
