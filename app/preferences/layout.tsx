import { Suspense } from 'react';

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-neutral-400">Loading...</p>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
