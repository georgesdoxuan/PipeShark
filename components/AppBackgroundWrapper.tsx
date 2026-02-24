'use client';

import { usePathname } from 'next/navigation';
import BackgroundCurves from '@/components/BackgroundCurves';

const LANDING_PATHS = ['/', '/landing'];

/**
 * Wraps app content: shows blue curves background on all pages except landing (/) and /landing.
 */
export default function AppBackgroundWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = LANDING_PATHS.includes(pathname ?? '');

  if (isLanding) {
    return <div className="relative z-10 min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      <BackgroundCurves />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
