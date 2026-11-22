import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import Logo from '../common/Logo'
import { buttonStyles } from '../common/buttonStyles'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-canvas/85 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.9)]' : 'bg-transparent'
      } backdrop-blur-xl`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] font-medium text-subtle transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold text-subtle transition hover:bg-white/5 hover:text-ink"
          >
            Log in
          </Link>
          <Link to="/signup" className={buttonStyles({ size: 'sm', className: 'btn-shine' })}>
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-ink transition hover:border-brandlight/40 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-5 sm:px-8">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-subtle transition hover:bg-white/5 hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-line pt-4">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-line text-sm font-semibold text-ink transition hover:bg-white/5"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className={buttonStyles({ size: 'md', className: 'btn-shine' })}
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
