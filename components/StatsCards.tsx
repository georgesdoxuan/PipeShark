'use client';

import Image from 'next/image';
import { Users, TrendingUp } from 'lucide-react';

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
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Leads',
      value: stats.leadsWithEmail,
      icon: Users,
      customIconSrc: TARGETS_ICON_SRC,
    },
    {
      title: 'Replies',
      value: stats.repliesCount ?? 0,
      subtitle: stats.replyRate != null ? `Reply rate: ${stats.replyRate}%` : undefined,
      extra: stats.avgTimeToReplyHours != null ? `Avg: ${stats.avgTimeToReplyHours}h` : undefined,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-zinc-200 dark:border-neutral-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-zinc-600 dark:text-neutral-300 text-sm font-semibold mb-1">{card.title}</p>
              <p className="text-3xl font-display font-bold text-zinc-900 dark:text-white mt-2">{card.value}</p>
              {'subtitle' in card && card.subtitle && (
                <p className="text-xs text-zinc-500 dark:text-neutral-400 mt-1">{card.subtitle}</p>
              )}
              {'extra' in card && card.extra && (
                <p className="text-xs text-zinc-500 dark:text-neutral-400">{card.extra}</p>
              )}
            </div>
            {'customIconSrc' in card && card.customIconSrc ? (
              <Image src={card.customIconSrc} alt="" width={40} height={40} className={`w-10 h-10 object-contain flex-shrink-0 ${LOGO_BLUE_FILTER}`} />
            ) : (
              <card.icon className="w-10 h-10 flex-shrink-0 text-sky-400 dark:text-white" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}