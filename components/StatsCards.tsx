'use client';

import Image from 'next/image';
import { Users, TrendingUp, FileText } from 'lucide-react';

const TARGETS_ICON_SRC = '/Icône de groupe de personnes.png';

/** Logo blue (sky-400) for Targets image – light blue like the shark */
const LOGO_BLUE_FILTER =
  '[filter:brightness(0)_saturate(100%)_invert(68%)_sepia(60%)_saturate(1200%)_hue-rotate(180deg)] dark:[filter:brightness(0)_invert(1)]';

/** Draft icon: blue fill, white lines inside – rounded corners, shorter lines */
function DraftsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      {/* Document shape – filled, wider, rounded corners (r=1.2) */}
      <path
        fill="currentColor"
        d="M6.2 2 L14 2 L20 8 L20 18.8 A1.2 1.2 0 0 1 18.8 20 L5 20 A1.2 1.2 0 0 1 3.8 18.8 L3.8 3.2 A1.2 1.2 0 0 1 5 2 L6.2 2 Z"
      />
      {/* Inner lines – moins larges, white in light, visible in dark */}
      <path d="M8 9h8M8 12h8M8 15h6" stroke="white" strokeWidth="1.1" strokeLinecap="round" className="dark:stroke-zinc-800" />
    </svg>
  );
}

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
      title: 'Targets',
      value: stats.leadsWithEmail,
      icon: Users,
      customIconSrc: TARGETS_ICON_SRC,
    },
    {
      title: 'Drafts',
      value: stats.emailsSent ?? 0,
      icon: FileText,
      customDraftsIcon: true,
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            ) : 'customDraftsIcon' in card && card.customDraftsIcon ? (
              <DraftsIcon className="w-10 h-10 flex-shrink-0 text-sky-400 dark:text-white" />
            ) : (
              <card.icon className="w-10 h-10 flex-shrink-0 text-sky-400 dark:text-white" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}