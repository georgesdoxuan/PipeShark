'use client';

/** Viper logo for PipeShark - uses the custom snake image. */
export default function ViperLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/viper-logo.png"
      alt=""
      className={className}
      aria-hidden
    />
  );
}
