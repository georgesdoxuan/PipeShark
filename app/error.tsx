'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-neutral-950 text-zinc-900 dark:text-zinc-100 p-6">
      <h1 className="text-xl font-semibold mb-2">Une erreur est survenue</h1>
      <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-md mb-6">
        Recharge la page ou retourne à l&apos;accueil. Si le problème continue, vérifie que les assets (JS/CSS) se chargent bien (onglet Réseau dans les outils de développement).
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-medium"
        >
          Réessayer
        </button>
        <Link
          href="/landing"
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
