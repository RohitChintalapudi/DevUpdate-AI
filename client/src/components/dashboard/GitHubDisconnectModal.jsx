import { LuTriangleAlert, LuUnplug } from 'react-icons/lu'
import Modal from '../common/Modal'
import Button from '../common/Button'

export default function GitHubDisconnectModal({ open, onClose, onConfirm, busy = false, username = '' }) {
  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      size="sm"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Keep connected
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 text-[13px] font-semibold text-white shadow-xs transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Disconnecting…
              </>
            ) : (
              <>
                <LuUnplug className="h-4 w-4" />
                Yes, disconnect
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200/90 bg-rose-50 text-rose-600 shadow-xs">
          <LuUnplug className="h-7 w-7" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] text-white">
            !
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-950">Disconnect GitHub?</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          This removes the saved GitHub connection and all locally stored repositories, scan results,
          dependencies, AI analyses, memory, reports and notifications. You will be sent to GitHub to
          authorize the connection again.
        </p>

        <div className="mt-4 flex w-full items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-left">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-[11px] leading-relaxed text-amber-800">
            This cannot be undone. Your GitHub account itself is not changed — you can reconnect at any time.
          </p>
        </div>

        {username ? (
          <p className="mt-3 text-[11px] font-medium text-slate-400">
            Connected as <span className="text-slate-600">{username}</span>
          </p>
        ) : null}
      </div>
    </Modal>
  )
}
