'use client';

import { useEffect, useState, useMemo } from 'react';
import Header from '@/components/Header';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Mail, MessageCircle, Phone, TrendingUp, Target, Clock, CheckCircle } from 'lucide-react';

interface Lead {
  id: string;
  email?: string | null;
  emailSent?: boolean;
  replied?: boolean;
  called?: boolean;
  gmailThreadId?: string | null;
  campaignId?: string | null;
  campaignName?: string;
  date?: string | null;
  deliveryType?: 'draft' | 'send' | null;
}

interface Campaign {
  id: string;
  name?: string;
  businessType: string;
  status: string;
  numberCreditsUsed?: number;
}

interface RepliesByDay {
  day: string;
  count: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
        {sub && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [repliesByDay, setRepliesByDay] = useState<RepliesByDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/leads').then(r => r.ok ? r.json() : []),
      fetch('/api/campaigns/list').then(r => r.ok ? r.json() : []),
      fetch('/api/stats/replies-by-day').then(r => r.ok ? r.json() : []),
    ]).then(([leadsData, campaignsData, repliesData]) => {
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
      setRepliesByDay(Array.isArray(repliesData) ? repliesData : (repliesData?.data ?? []));
    }).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const withEmail = leads.filter(l => !!l.email).length;
    const sent = leads.filter(l => !!l.emailSent).length;
    const inMailbox = leads.filter(l => !l.emailSent && !!l.gmailThreadId).length;
    const replied = leads.filter(l => !!l.replied).length;
    const called = leads.filter(l => !!l.called).length;
    const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : '0';
    const callRate = total > 0 ? ((called / total) * 100).toFixed(1) : '0';
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    return { total, withEmail, sent, inMailbox, replied, called, replyRate, callRate, activeCampaigns };
  }, [leads, campaigns]);

  // Leads per day (last 14 days)
  const leadsPerDay = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      counts[key] = 0;
    }
    leads.forEach(l => {
      if (l.date) {
        const key = l.date.split('T')[0];
        if (key in counts) counts[key] = (counts[key] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([day, count]) => ({
      day: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    }));
  }, [leads]);

  // Leads per campaign
  const leadsPerCampaign = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    leads.forEach(l => {
      if (l.campaignId) {
        if (!counts[l.campaignId]) {
          const camp = campaigns.find(c => c.id === l.campaignId);
          counts[l.campaignId] = { name: camp?.name || camp?.businessType || l.campaignId.slice(0, 8), count: 0 };
        }
        counts[l.campaignId].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [leads, campaigns]);

  // Email status distribution
  const emailStatusData = useMemo(() => [
    { name: 'Sent', value: stats.sent },
    { name: 'In mailbox', value: stats.inMailbox },
    { name: 'Pending', value: stats.total - stats.sent - stats.inMailbox },
  ].filter(d => d.value > 0), [stats]);

  // Replies by day formatted
  const repliesChartData = useMemo(() => {
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return DAYS.map((day, i) => ({
      day,
      count: repliesByDay.find(r => r.day === String(i))?.count ?? 0,
    }));
  }, [repliesByDay]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64 text-zinc-400">Loading analytics…</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-6 max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Analytics</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Overview of your prospecting activity</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total leads" value={stats.total} color="bg-indigo-500" />
          <StatCard icon={Mail} label="Emails sent" value={stats.sent} sub={`${stats.inMailbox} in mailbox`} color="bg-sky-500" />
          <StatCard icon={MessageCircle} label="Reply rate" value={`${stats.replyRate}%`} sub={`${stats.replied} replies`} color="bg-emerald-500" />
          <StatCard icon={Phone} label="Called" value={`${stats.callRate}%`} sub={`${stats.called} / ${stats.total}`} color="bg-violet-500" />
          <StatCard icon={Target} label="Active campaigns" value={stats.activeCampaigns} color="bg-orange-500" />
          <StatCard icon={CheckCircle} label="With email" value={stats.withEmail} sub={`${stats.total - stats.withEmail} without`} color="bg-teal-500" />
          <StatCard icon={TrendingUp} label="Total replied" value={stats.replied} color="bg-pink-500" />
          <StatCard icon={Clock} label="Pending emails" value={stats.total - stats.sent - stats.inMailbox} color="bg-zinc-500" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads per day */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Leads generated — last 14 days</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leadsPerDay} barSize={14}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Replies this week */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Replies this week</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={repliesChartData} barSize={14}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Replies" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads per campaign */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Leads per campaign</h2>
            {leadsPerCampaign.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leadsPerCampaign} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#f59e0b' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Email status pie */}
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-neutral-800 p-5">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Email pipeline</h2>
            {emailStatusData.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={emailStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                    {emailStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e5e7eb' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
