'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { Menu, X } from 'lucide-react'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Docs', href: '#docs' },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? 'border-white/5 bg-ink/95 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 text-sm text-fog md:flex">
          {navItems.map((item) => (
            <a key={item.label} href={item.href} className="text-fog">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Sign In */}
        <div className="hidden items-center md:flex">
          <Button
            variant="ghost"
            className="border border-white/12 px-4 transition-none hover:border-white/12 hover:bg-transparent"
            onClick={() => window.location.href = '/auth'}
          >
            Sign in
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center md:hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/5 bg-ink/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="border-b border-white/5 py-3 text-fog transition-colors hover:text-parchment"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4">
              <Button
                variant="ghost"
                className="w-full border border-white/12 transition-none hover:border-white/12 hover:bg-transparent"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.location.href = '/auth';
                }}
              >
                Sign in
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
