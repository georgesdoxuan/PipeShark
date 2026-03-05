'use client';

/**
 * Blue curves (background style) to decorate campaign cards.
 */
export default function CardCurves() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl z-0"
      aria-hidden
    >
      <svg
        className="absolute w-full h-full min-w-[140%] min-h-[140%] -top-[20%] -right-[20%]"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMaxYMin slice"
      >
        {/* Courbe haut droite */}
        <path
          d="M400 0c-100 40-180 120-160 200 20 80-60 120-180 100-120-20-220-100-60-300z"
          className="fill-sky-200/28 dark:fill-sky-500/11"
        />
        <path
          d="M400 60v180c-40 20-120 0-200-40-80-40-120-100-80-160 40-60 160-80 280 20z"
          className="fill-sky-100/25 dark:fill-sky-500/9"
        />
      </svg>
      <svg
        className="absolute w-full h-full min-w-[140%] min-h-[140%] -bottom-[20%] -left-[20%]"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMinYMax slice"
      >
        {/* Courbe bas gauche */}
        <path
          d="M0 300c50-90 140-150 220-110 80 40 90 130 30 190-60 60-150 10-250-80z"
          className="fill-sky-200/24 dark:fill-sky-500/9"
        />
      </svg>
    </div>
  );
}
