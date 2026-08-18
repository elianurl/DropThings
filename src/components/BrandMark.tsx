interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className = 'h-5 w-5' }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dropthings-mark-gradient" x1="17" y1="10" x2="48" y2="53" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M32 8c10 12 17 21 17 31a17 17 0 1 1-34 0c0-10 7-19 17-31Z" fill="url(#dropthings-mark-gradient)" />
      <path d="M32 20v21m-8-8 8 8 8-8M24 49h16" fill="none" stroke="#050507" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
