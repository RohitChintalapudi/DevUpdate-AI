import { useState } from 'react'
import Logo from '../common/Logo'
import Modal from '../common/Modal'
import Button from '../common/Button'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'AI Recommendations', href: '#why' },
      { label: 'Security Intelligence', href: '#security' },
      { label: 'Documentation', to: '/login' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Getting Started', to: '/signup' },
      { label: 'GitHub Integration', href: '#technology' },
      { label: 'Supported Ecosystems', href: '#ecosystems' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: 'mailto:support@devupdate.ai' },
    ],
  },
  {
    title: 'Technologies',
    links: [
      { label: 'GitHub API', href: '#technology' },
      { label: 'Google Gemini', href: '#technology' },
      { label: 'LangChain & LangGraph', href: '#technology' },
      { label: 'Firecrawl Research', href: '#technology' },
      { label: 'Memento Memory', href: '#technology' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', action: 'Privacy Policy' },
      { label: 'Terms of Service', action: 'Terms of Service' },
      { label: 'Security', href: '#security' },
    ],
  },
]

export default function Footer() {
  const [modalTitle, setModalTitle] = useState('')

  return (
    <footer className="relative border-t border-slate-200/80 bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          {/* Brand Info */}
          <div>
            <Logo theme="light" />
            <p className="mt-3 text-xs font-bold text-slate-800">
              Intelligent Dependency Management. Powered by AI.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 max-w-xs">
              Understand your dependencies. Research what changed. Upgrade with confidence.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">All systems operational</span>
            </div>
          </div>

          {/* Columns */}
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        className="text-[13px] font-medium text-slate-500 transition hover:text-slate-950"
                      >
                        {link.label}
                      </a>
                    ) : link.action ? (
                      <button
                        type="button"
                        onClick={() => setModalTitle(link.action)}
                        className="text-[13px] font-medium text-slate-500 transition hover:text-slate-950"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.to}
                        className="text-[13px] font-medium text-slate-500 transition hover:text-slate-950"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 flex flex-col gap-3 border-t border-slate-200/60 pt-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 DevUpdate AI. All rights reserved.</p>
          <p className="font-medium text-slate-700">Built for developers. Driven by intelligence.</p>
        </div>
      </div>

      <Modal
        open={Boolean(modalTitle)}
        onClose={() => setModalTitle('')}
        title={modalTitle}
        description="This legal documentation is strictly enforced across all platform tiers and API consumers."
      >
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setModalTitle('')}>Close</Button>
        </div>
      </Modal>
    </footer>
  )
}
