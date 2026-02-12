'use client';

import Image from 'next/image';
import { Users, TrendingUp, Send } from 'lucide-react';

const TARGETS_ICON_SRC = '/Icône de groupe de personnes.png';

/** Logo blue (sky-400) for Targets image – light blue like the shark */
const LOGO_BLUE_FILTER =
  '[filter:brightness(0)_saturate(100%)_invert(68%)_sepia(60%)_saturate(1200%)_hue-rotate(180deg)] dark:[filter:brightness(0)_invert(1)]';

interface StatsCardsProps {
  stats: {
    leadsWithEmail: number;
    conversionRate: string;
    emailsSent?: number;
    repliesCount?: number;
    replyRate?: string;
    avgTimeToReplyHours?: string | null;
  };
  /** When true, use smaller squares so two fit side-by-side in a narrow column (e.g. below Credits) */
  compact?: boolean;
}

const CARD_STYLES = {
  leads: {
    accent: 'from-sky-500/10 to-sky-600/5 dark:from-sky-400/15 dark:to-sky-600/5',
    iconBg: 'bg-sky-500/15 dark:bg-sky-400/20',
    iconColor: 'text-sky-600 dark:text-sky-300',
    border: 'border-sky-200/60 dark:border-sky-500/30',
  },
  sent: {
    accent: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-400/15 dark:to-teal-600/5',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-400/20',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    border: 'border-emerald-200/60 dark:border-emerald-500/30',
  },
  replies: {
    accent: 'from-amber-500/10 to-orange-500/5 dark:from-amber-400/15 dark:to-orange-600/5',
    iconBg: 'bg-amber-500/15 dark:bg-amber-400/20',
    iconColor: 'text-amber-600 dark:text-amber-300',
    border: 'border-amber-200/60 dark:border-amber-500/30',
  },
} as const;

export default function StatsCards({ stats, compact = false }: StatsCardsProps) {
  const cards: Array<{
    title: string;
    value: number;
    icon: typeof Users;
    customIconSrc?: string;
    subtitle?: string;
    extra?: string;
    style: keyof typeof CARD_STYLES;
  }> = [
    {
      title: 'Leads',
      value: stats.leadsWithEmail,
      icon: Users,
      customIconSrc: TARGETS_ICON_SRC,
      style: 'leads',
    },
    {
      title: 'Emails sent',
      value: stats.emailsSent ?? 0,
      icon: Send,
      style: 'sent',
    },
    {
      title: 'Replies',
      value: stats.repliesCount ?? 0,
      subtitle: stats.replyRate != null ? `Reply rate: ${stats.replyRate}%` : undefined,
      extra: stats.avgTimeToReplyHours != null ? `Avg: ${stats.avgTimeToReplyHours}h` : undefined,
      icon: TrendingUp,
      style: 'replies',
    },
  ];

  const sizeClass = compact
    ? 'w-36 min-w-[9rem] h-36 p-4'
    : 'w-36 h-36 sm:w-40 sm:h-40 p-5';
  const iconSizeClass = compact ? 'w-7 h-7' : 'w-9 h-9 sm:w-10 sm:h-10';
  const valueClass = compact ? 'text-3xl' : 'text-4xl sm:text-5xl';

  return (
    <div className={`flex gap-2 flex-nowrap ${compact ? 'shrink-0' : 'flex-wrap gap-4'}`}>
      {cards.map((card) => {
        const s = CARD_STYLES[card.style];
        return (
          <div
            key={card.title}
            className={`${sizeClass} flex flex-col rounded-2xl bg-white dark:bg-neutral-900 bg-gradient-to-br ${s.accent} ${s.border} border shadow-md hover:shadow-lg transition-all duration-300 shrink-0 overflow-hidden relative`}
          >
            <div className="flex items-start justify-between gap-2 min-h-0 flex-shrink-0">
              <p className="text-zinc-600 dark:text-neutral-400 text-sm font-semibold leading-tight break-normal line-clamp-2 flex-1 min-w-[4rem]" title={card.title}>
                {card.title}
              </p>
              <span className={`${s.iconBg} rounded-xl p-2 flex-shrink-0`}>
                {'customIconSrc' in card && card.customIconSrc ? (
                  <Image src={card.customIconSrc} alt="" width={compact ? 28 : 40} height={compact ? 28 : 40} className={`${iconSizeClass} object-contain ${LOGO_BLUE_FILTER}`} />
                ) : (
                  <card.icon className={`${iconSizeClass} ${s.iconColor}`} strokeWidth={2} />
                )}
              </span>
            </div>
            <p className={`${valueClass} font-display font-bold text-zinc-900 dark:text-white pt-1 leading-tight tracking-tight`}>
              {card.value}
            </p>
            {('subtitle' in card && card.subtitle) || ('extra' in card && card.extra) ? (
              <div className="mt-1 space-y-0.5">
                {card.subtitle && (
                  <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-neutral-400 leading-tight">{card.subtitle}</p>
                )}
                {card.extra && (
                  <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-neutral-400 leading-tight">{card.extra}</p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}