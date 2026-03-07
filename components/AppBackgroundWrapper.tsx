'use client';

import { usePathname } from 'next/navigation';
import BackgroundCurves from '@/components/BackgroundCurves';
import { useSidebar } from '@/contexts/SidebarContext';

const NO_SIDEBAR_PATHS = ['/', '/landing', '/login', '/signup', '/contact', '/pricing', '/onboarding'];

export default function AppBackgroundWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { sidebarOpen } = useSidebar();

  const isLanding = ['/', '/landing'].includes(pathname ?? '');
  const hasSidebar = !NO_SIDEBAR_PATHS.includes(pathname ?? '') && !pathname?.startsWith('/legal') && !pathname?.startsWith('/article');

  if (isLanding) {
    return <div className="relative z-10 min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      <BackgroundCurves />
      <div
        className={`relative z-10 transition-all duration-300 ease-in-out ${hasSidebar ? (sidebarOpen ? 'ml-52' : 'ml-14') : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
