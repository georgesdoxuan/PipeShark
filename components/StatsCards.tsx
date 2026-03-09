'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Users, TrendingUp, Send, ThumbsUp } from 'lucide-react';

const TARGETS_ICON_SRC = '/customer.png';

/** Logo blue (sky-400) for Targets image – light blue like the shark */
const LOGO_BLUE_FILTER =
  '[filter:brightness(0)_saturate(100%)_invert(68%)_sepia(60%)_saturate(1200%)_hue-rotate(180deg)] dark:[filter:brightness(0)_invert(1)]';

/** Ton logo paper-plane en vert pour Emails sent (vert franc, pas turquoise) */
const PAPER_PLANE_SRC = '/paper-plane.png';
const SENT_ICON_GREEN_STYLE = { filter: 'invert(1) sepia(1) hue-rotate(65deg) saturate(10) brightness(0.7) contrast(1.1)' };

interface StatsCardsProps {
  stats: {
    leadsWithEmail: number;
    conversionRate: string;
    emailsSent?: number;
    repliesCount?: number;
    replyRate?: string;
    avgTimeToReplyHours?: string | null;
    positiveRepliesCount?: number;
  };
  compact?: boolean;
  mini?: boolean;
}

const CARD_STYLES = {
  leads: {
    accent: 'from-sky-500/10 to-sky-600/5 dark:from-sky-400/15 dark:to-sky-600/5',
    iconBg: 'bg-sky-500/15 dark:bg-sky-400/20',
    iconColor: 'text-sky-600 dark:text-sky-300',
  },
  sent: {
    accent: 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-400/15 dark:to-teal-600/5',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-400/20',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
  },
  replies: {
    accent: 'from-amber-500/10 to-orange-500/5 dark:from-amber-400/15 dark:to-orange-600/5',
    iconBg: 'bg-amber-500/15 dark:bg-amber-400/20',
    iconColor: 'text-amber-600 dark:text-amber-300',
  },
  positive: {
    accent: 'from-green-500/10 to-emerald-500/5 dark:from-green-400/15 dark:to-emerald-600/5',
    iconBg: 'bg-green-500/15 dark:bg-green-400/20',
    iconColor: 'text-green-600 dark:text-green-300',
  },
} as const;

export default function StatsCards({ stats, compact = false, mini = false }: StatsCardsProps) {
  const cards: Array<{
    title: string;
    value: number;
    icon: typeof Users;
    customIconSrc?: string;
    subtitle?: string;
    extra?: string;
    style: keyof typeof CARD_STYLES;
    href: string;
  }> = [
    {
      title: 'Leads',
      value: stats.leadsWithEmail,
      icon: Users,
      customIconSrc: TARGETS_ICON_SRC,
      style: 'leads',
      href: '/dashboard#all-my-leads',
    },
    {
      title: 'Emails sent',
      value: stats.emailsSent ?? 0,
      icon: Send,
      customIconSrc: PAPER_PLANE_SRC,
      style: 'sent',
      href: '/messages#sent',
    },
    {
      title: 'Replies',
      value: stats.repliesCount ?? 0,
      subtitle: stats.replyRate != null ? `Reply rate: ${stats.replyRate}%` : undefined,
      extra: stats.avgTimeToReplyHours != null ? `Avg: ${stats.avgTimeToReplyHours}h` : undefined,
      icon: TrendingUp,
      style: 'replies',
      href: '/messages#replies',
    },
    {
      title: 'Positive Replies',
      value: stats.positiveRepliesCount ?? 0,
      subtitle: (stats.repliesCount ?? 0) > 0
        ? `${Math.round(((stats.positiveRepliesCount ?? 0) / (stats.repliesCount ?? 1)) * 100)}% of replies`
        : undefined,
      icon: ThumbsUp,
      style: 'positive',
      href: '/messages#replies',
    },
  ];

  const sizeClass = mini
    ? 'w-28 h-24 p-3'
    : compact
    ? 'w-36 min-w-[9rem] h-36 p-4'
    : 'w-36 h-36 sm:w-40 sm:h-40 p-5';
  const iconSizeClass = mini ? 'w-7 h-7' : compact ? 'w-11 h-11' : 'w-14 h-14 sm:w-16 sm:h-16';
  const iconPx = mini ? 28 : compact ? 44 : 64;
  const valueClass = mini ? 'text-2xl' : compact ? 'text-3xl' : 'text-4xl sm:text-5xl';
  const iconPadding = mini ? 'p-1.5' : 'p-3';
  const titleClass = mini ? 'text-xs' : 'text-sm';
  const minWidthClass = mini ? 'min-w-[2.5rem]' : 'min-w-[4rem]';

  return (
    <div className={`flex gap-2 flex-nowrap ${compact ? 'shrink-0' : 'flex-wrap gap-4'}`}>
      {cards.map((card) => {
        const s = CARD_STYLES[card.style];
        return (
          <Link key={card.title} href={card.href} className="flex flex-col items-start shrink-0 hover:opacity-95 transition-opacity">
            <div
              className={`${sizeClass} flex flex-col rounded-2xl bg-white dark:bg-neutral-900 bg-gradient-to-br ${s.accent} shadow-sm transition-all duration-300 overflow-hidden relative cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-2 min-h-0 flex-shrink-0">
                <p className={`text-zinc-600 dark:text-neutral-400 ${titleClass} font-semibold leading-tight break-normal line-clamp-2 flex-1 ${minWidthClass}`} title={card.title}>
                  {card.title}
                </p>
                <span className={`${s.iconBg} rounded-xl ${iconPadding} flex-shrink-0 flex items-center justify-center ${iconSizeClass}`}>
                  {'customIconSrc' in card && card.customIconSrc ? (
                    card.style === 'sent' ? (
                      <span className={`${iconSizeClass} flex items-center justify-center overflow-hidden`} style={SENT_ICON_GREEN_STYLE}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={PAPER_PLANE_SRC} alt="" width={iconPx} height={iconPx} className="w-full h-full object-contain" />
                      </span>
                    ) : (
                      <Image src={card.customIconSrc} alt="" width={iconPx} height={iconPx} className={`${iconSizeClass} object-contain ${LOGO_BLUE_FILTER}`} />
                    )
                  ) : (
                    <card.icon className={`${iconSizeClass} ${s.iconColor}`} strokeWidth={2} />
                  )}
                </span>
              </div>
              <p className={`${valueClass} font-display font-bold text-zinc-900 dark:text-white pt-1 leading-tight tracking-tight`}>
                {card.value}
              </p>
              {!mini && card.extra ? (
                <p className="text-[10px] text-zinc-500 dark:text-neutral-400 leading-tight mt-1">{card.extra}</p>
              ) : null}
            </div>
            {mini && card.subtitle ? (
              <p className="text-[10px] text-zinc-500 dark:text-neutral-400 leading-tight mt-1 px-0.5">{card.subtitle}</p>
            ) : !mini && card.subtitle ? (
              <p className="text-[10px] text-zinc-500 dark:text-neutral-400 leading-tight mt-1 px-0.5">{card.subtitle}</p>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}