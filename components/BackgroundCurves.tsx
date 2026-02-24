'use client';

/**
 * Courbes bleues claires en arrière-plan (variantes de bleu uniquement).
 */
export default function BackgroundCurves() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-0"
      aria-hidden
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Bleu clair – haut droite */}
        <path
          d="M1200 0c120 80 200 220 100 380-80 120-260 180-400 120-140-60-220-200-120-340 100-140 320-200 420-160z"
          className="fill-sky-200/50 dark:fill-sky-500/15"
        />
        {/* Bleu très clair – droite */}
        <path
          d="M1440 200v500c0 80-120 160-280 140-160-20-340-120-360-280-20-160 100-320 240-360 140-40 400 0 400 0V200z"
          className="fill-sky-100/55 dark:fill-sky-600/12"
        />
        {/* Bleu doux – bas gauche */}
        <path
          d="M0 600c0-100 80-220 200-280 120-60 280-60 380 40 100 100 140 260 80 400-60 140-200 240-360 240-160 0-300-100-300-400z"
          className="fill-sky-300/40 dark:fill-sky-500/12"
        />
        {/* Bleu pâle – gauche */}
        <path
          d="M0 0h400v700c-80 40-180 20-260-60-80-80-120-200-140-340-20-140 0-300 0-300z"
          className="fill-sky-100/45 dark:fill-sky-600/10"
        />
        {/* Bleu centre-gauche */}
        <path
          d="M200 300c60-80 180-100 300-60 120 40 220 140 240 260 20 120-60 240-180 300-120 60-260 40-340-80-80-120-80-280-20-420z"
          className="fill-sky-200/35 dark:fill-sky-500/10"
        />
        {/* Bleu clair – bas droite */}
        <path
          d="M900 500c80 60 140 180 120 320-20 140-120 260-260 320-140 60-300 60-460-20-160-80-280-220-280-220V500h760z"
          className="fill-sky-100/40 dark:fill-sky-600/10"
        />
      </svg>
    </div>
  );
}
