export function LogoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="8" y="8" width="16" height="16" rx="2" stroke="#D8C8A8" strokeWidth="2" transform="rotate(45 16 16)" />
      <circle cx="16" cy="4.8" r="2.4" fill="#D8C8A8" />
      <circle cx="4.8" cy="16" r="2.4" fill="#D8C8A8" />
      <circle cx="27.2" cy="16" r="2.4" fill="#D8C8A8" />
      <circle cx="16" cy="27.2" r="2.4" fill="#D8C8A8" />
    </svg>
  )
}

export function Logo({ className = "text-lg font-semibold tracking-wide" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span>P</span>
      <LogoIcon className="mx-0.5 inline-block h-4 w-4" />
      <span>lycrawl</span>
    </div>
  )
}
