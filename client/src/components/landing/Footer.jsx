import { useState } from 'react'
import { ArrowUpRight, BookOpen, Github } from 'lucide-react'
import Logo from '../common/Logo'
import Modal from '../common/Modal'
import Button from '../common/Button'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Benefits', href: '#benefits' },
      { label: 'About', href: '#about' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Dashboard preview', to: '/signup' },
      { label: 'AI recommendations', to: '/signup' },
      { label: 'Memento memory', to: '/signup' },
    ],
  },
]

export default function Footer() {
  const [comingSoon, setComingSoon] = useState('')

  return (
    <footer className="relative border-t border-line bg-surface/40">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-subtle">
              AI-powered dependency intelligence for developers. Monitor updates, understand
              release notes and make confident upgrade decisions.
            </p>
            <span className="mt-4 inline-flex rounded-full border border-line bg-white/[0.02] px-2.5 py-1 text-[10px] text-muted">
              Phase 1 · Foundation preview
            </span>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="label-caps mb-4">{column.title}</p>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a href={link.href} className="text-[13px] text-subtle transition hover:text-ink">
                        {link.label}
                      </a>
                    ) : (
                      <a href={link.to} className="text-[13px] text-subtle transition hover:text-ink">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="label-caps mb-4">Resources</p>
            <ul className="space-y-3">
              <li>
                <button
                  type="button"
                  onClick={() => setComingSoon('Documentation')}
                  className="inline-flex items-center gap-1.5 text-[13px] text-subtle transition hover:text-ink"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Documentation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setComingSoon('GitHub organization')}
                  className="inline-flex items-center gap-1.5 text-[13px] text-subtle transition hover:text-ink"
                >
                  <Github className="h-3.5 w-3.5" /> GitHub
                </button>
              </li>
              <li>
                <a href="#features" className="text-[13px] text-subtle transition hover:text-ink">
                  Feature roadmap
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DevUpdate AI. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Built for developers, with clarity in mind. <ArrowUpRight className="h-3.5 w-3.5" />
          </p>
        </div>
      </div>

      <Modal
        open={Boolean(comingSoon)}
        onClose={() => setComingSoon('')}
        title={`${comingSoon} — Coming Soon`}
        description="This resource is planned for a later phase of DevUpdate AI."
        footer={<Button onClick={() => setComingSoon('')}>Got it</Button>}
      >
        <p className="text-sm leading-relaxed text-subtle">
          Phase 1 focuses on the website foundation and authentication. Documentation and public
          repository links will be added as the platform grows.
        </p>
      </Modal>
    </footer>
  )
}
