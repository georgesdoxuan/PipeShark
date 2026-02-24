import { Suspense } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white/60 dark:bg-black/70 flex items-center justify-center">
          <p className="text-zinc-600 dark:text-neutral-400">Loading...</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
