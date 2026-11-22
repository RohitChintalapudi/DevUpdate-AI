import { LuExternalLink, LuGitBranch, LuMail, LuShieldCheck, LuSparkles } from 'react-icons/lu'
import Modal from '../common/Modal'
import Button from '../common/Button'

export default function HelpModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Help & Support"
      description="Quick reference guide and resources for DevUpdate AI."
      size="md"
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-[11px] text-slate-400">DevUpdate AI v1.2.0</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Core sections guide */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Workspace Guide</p>
          <div className="grid gap-2 text-xs">
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
              <LuGitBranch className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-slate-900">Repositories & Inventory</p>
                <p className="text-[11px] text-slate-600">
                  Connect GitHub accounts, inspect manifest files, and review all extracted package dependencies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
              <LuShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900">Updates & Security</p>
                <p className="text-[11px] text-slate-600">
                  Identify outdated packages, breaking changes, and critical security advisories from OSV.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
              <LuSparkles className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-slate-900">Memento Memory</p>
                <p className="text-[11px] text-slate-600">
                  Retain upgrade history, breaking-change learnings, and context across sessions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts & Links */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
          <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Helpful Shortcuts</p>
          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60">
            <span className="text-slate-600">Search packages</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-900 shadow-2xs">
              /
            </kbd>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-600">Close dialogues & panels</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-900 shadow-2xs">
              Esc
            </kbd>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <LuMail className="h-4 w-4 text-slate-400" />
            <span>Need technical assistance?</span>
          </div>
          <a
            href="mailto:support@devupdate.ai"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-slate-950 transition-colors"
          >
            support@devupdate.ai <LuExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Modal>
  )
}
