import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuMenu, LuX } from 'react-icons/lu'
import { Link } from 'react-router-dom'
import Logo from '../common/Logo'

const links = [
  { label: 'Home', href: '#' },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Technology', href: '#technology' },
  { label: 'About', href: '#about' },
  { label: 'FAQ', href: '#faq' },
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
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-b border-slate-200/80'
          : 'bg-white/90 backdrop-blur-lg'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        {/* Left: Brand Logo */}
        <Logo theme="light" />

        {/* Center: Main Navigation */}
        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13.5px] font-medium text-slate-600 transition-colors hover:text-slate-950"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-medium text-slate-600 transition hover:text-slate-950"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9.5 items-center justify-center rounded-full bg-slate-950 px-5 text-[13.5px] font-semibold text-white shadow-xs transition-all hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:hidden"
        >
          {open ? <LuX className="h-5 w-5" /> : <LuMenu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 sm:px-8">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-4">
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800"
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
