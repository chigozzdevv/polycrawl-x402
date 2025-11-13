import { XIcon } from 'lucide-react'

const links = [
  { label: 'Docs', href: 'https://github.com/chigozzdevv/polycrawl-x402' },
  { label: 'GitHub', href: 'https://github.com/chigozzdevv/polycrawl-x402' },
  { label: '', href: 'https://x.com/polycrawl_', icon: XIcon, ariaLabel: 'X' },
]

export function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-16 md:px-6">
      <div className="flex flex-col items-center gap-6 border-t border-white/10 pt-8 text-sm md:flex-row md:justify-between md:gap-4">
        <p className="text-center text-fog md:text-left">© {year} Polycrawl. Authorized data for agents.</p>
        <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <a
                key={link.href}
                href={link.href}
                aria-label={link.ariaLabel || link.label}
                className="flex items-center gap-1.5 text-fog transition-colors hover:text-parchment"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {link.label && <span>{link.label}</span>}
              </a>
            )
          })}
        </nav>
      </div>
    </footer>
  )
}
