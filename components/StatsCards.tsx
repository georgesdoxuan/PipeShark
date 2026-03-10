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

const THUMB_UP_SRC = '/thumb-up.png';
/** Vert pour Positive Replies (thumbs up) */
const THUMB_UP_GREEN_STYLE = { filter: 'invert(1) sepia(1) hue-rotate(100deg) saturate(10) brightness(0.75) contrast(1.1)' };

const EMAIL_ICON_SRC = '/email (1).png';
/** Violet pour Open Rate */
const EMAIL_ICON_VIOLET_STYLE = { filter: 'invert(1) sepia(1) hue-rotate(230deg) saturate(8) brightness(0.6) contrast(1.1)' };

interface StatsCardsProps {
  stats: {
    leadsWithEmail: number;
    conversionRate: string;
    emailsSent?: number;
    repliesCount?: number;
    replyRate?: string;
    avgTimeToReplyHours?: string | null;
    positiveRepliesCount?: number;
    openedCount?: number;
    openRate?: string;
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
  open: {
    accent: 'from-violet-500/10 to-purple-500/5 dark:from-violet-400/15 dark:to-purple-600/5',
    iconBg: 'bg-violet-500/15 dark:bg-violet-400/20',
    iconColor: 'text-violet-600 dark:text-violet-300',
  },
} as const;

export default function StatsCards({ stats, compact = false, mini = false }: StatsCardsProps) {
  const cards: Array<{
    title: string;
    value: number | string;
    isPercent?: boolean;
    inlineSuffix?: string;
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
      inlineSuffix: stats.replyRate != null ? `${stats.replyRate}%` : undefined,
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
      customIconSrc: THUMB_UP_SRC,
      style: 'positive',
      href: '/messages#replies',
    },
    {
      title: 'Open Rate',
      value: stats.openRate != null ? `${stats.openRate}%` : '0%',
      isPercent: true,
      subtitle: stats.openedCount != null && stats.openedCount > 0
        ? `${stats.openedCount} opened`
        : undefined,
      icon: Users,
      customIconSrc: EMAIL_ICON_SRC,
      style: 'open',
      href: '/messages#sent',
    },
  ];

  const sizeClass = mini
    ? 'w-24 h-[4.5rem] p-2.5'
    : compact
    ? 'w-32 min-w-[8rem] h-32 p-3.5'
    : 'w-32 h-32 sm:w-36 sm:h-36 p-4';
  const iconSizeClass = mini ? 'w-6 h-6' : compact ? 'w-9 h-9' : 'w-12 h-12 sm:w-14 sm:h-14';
  const iconPx = mini ? 24 : compact ? 36 : 56;
  const valueClass = mini ? 'text-xl' : compact ? 'text-2xl' : 'text-3xl sm:text-4xl';
  const iconPadding = mini ? 'p-1' : 'p-2.5';
  const titleClass = mini ? 'text-[10px]' : 'text-xs';
  const minWidthClass = mini ? 'min-w-[2rem]' : 'min-w-[3.5rem]';

  return (
    <div className={`flex flex-nowrap ${compact ? 'gap-2 shrink-0' : 'flex-wrap gap-3'}`}>
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
                <span className={`${s.iconBg} rounded-lg ${iconPadding} flex-shrink-0 flex items-center justify-center ${iconSizeClass}`}>
                  {'customIconSrc' in card && card.customIconSrc ? (
                    card.style === 'sent' ? (
                      <span className={`${iconSizeClass} flex items-center justify-center overflow-hidden`} style={SENT_ICON_GREEN_STYLE}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={PAPER_PLANE_SRC} alt="" width={iconPx} height={iconPx} className="w-full h-full object-contain" />
                      </span>
                    ) : card.style === 'positive' ? (
                      <span className={`${iconSizeClass} flex items-center justify-center overflow-hidden`} style={THUMB_UP_GREEN_STYLE}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={THUMB_UP_SRC} alt="" width={iconPx} height={iconPx} className="w-full h-full object-contain" />
                      </span>
                    ) : card.style === 'open' ? (
                      <span className={`${iconSizeClass} flex items-center justify-center overflow-hidden`} style={EMAIL_ICON_VIOLET_STYLE}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={EMAIL_ICON_SRC} alt="" width={iconPx} height={iconPx} className="w-full h-full object-contain" />
                      </span>
                    ) : (
                      <Image src={card.customIconSrc} alt="" width={iconPx} height={iconPx} className={`${iconSizeClass} object-contain ${LOGO_BLUE_FILTER}`} />
                    )
                  ) : (
                    <card.icon className={`${iconSizeClass} ${s.iconColor}`} strokeWidth={2} />
                  )}
                </span>
              </div>
              <p className={`${valueClass} font-display font-bold text-zinc-900 dark:text-white pt-1 leading-tight tracking-tight flex items-baseline gap-1`}>
                {card.value}
                {card.inlineSuffix && (
                  <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{card.inlineSuffix}</span>
                )}
              </p>
              {card.extra ? (
                <p className="text-[10px] text-zinc-500 dark:text-neutral-400 leading-tight mt-0.5">{card.extra}</p>
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