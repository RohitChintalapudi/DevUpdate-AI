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
          <span className="text-[11px] text-muted">DevUpdate AI v1.2.0</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Core sections guide */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-wider text-muted uppercase">Workspace Guide</p>
          <div className="grid gap-2 text-xs">
            <div className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-surface/50 p-2.5">
              <LuGitBranch className="mt-0.5 h-4 w-4 shrink-0 text-brandlight" />
              <div>
                <p className="font-semibold text-ink">Repositories & Inventory</p>
                <p className="text-[11px] text-subtle">
                  Connect GitHub accounts, inspect manifest files, and review all extracted package dependencies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-surface/50 p-2.5">
              <LuShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="font-semibold text-ink">Updates & Security</p>
                <p className="text-[11px] text-subtle">
                  Identify outdated packages, breaking changes, and critical security advisories from OSV.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-surface/50 p-2.5">
              <LuSparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="font-semibold text-ink">AI Intelligence & Memento</p>
                <p className="text-[11px] text-subtle">
                  Generate tailored upgrade recommendations and retain historical upgrade decisions across sessions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts & Links */}
        <div className="rounded-xl border border-line/60 bg-canvas/60 p-3">
          <p className="text-[11px] font-bold tracking-wider text-muted uppercase mb-2">Helpful Shortcuts</p>
          <div className="flex items-center justify-between text-xs py-1 border-b border-line/40">
            <span className="text-subtle">Search packages</span>
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-ink">
              /
            </kbd>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-subtle">Close dialogues & panels</span>
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono text-ink">
              Esc
            </kbd>
          </div>
        </div>

        {/* Contact info */}
        <div className="flex items-center justify-between rounded-xl border border-line/60 bg-surface/50 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs text-subtle">
            <LuMail className="h-4 w-4 text-muted" />
            <span>Need technical assistance?</span>
          </div>
          <a
            href="mailto:support@devupdate.ai"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brandlight hover:text-ink transition-colors"
          >
            support@devupdate.ai <LuExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Modal>
  )
}
