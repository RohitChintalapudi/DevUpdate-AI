import { AnimatePresence, motion } from 'framer-motion'
import { LuCircleAlert, LuCircleCheck, LuInfo, LuX } from 'react-icons/lu'
const variants = {
  success: { icon: LuCircleCheck, className: 'border-success/25 text-success' },
  error: { icon: LuCircleAlert, className: 'border-danger/25 text-danger' },
  info: { icon: LuInfo, className: 'border-accent/25 text-accent' },
}

export default function Toast({ toast, onDismiss }) {
  const variant = variants[toast?.type] || variants.info
  const Icon = variant.icon

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          role="status"
          className="fixed right-4 bottom-4 z-200 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-line bg-elevated/95 px-4 py-3 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:right-6 sm:bottom-6"
        >
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white/[0.03] ${variant.className}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">{toast.title}</p>
            {toast.message ? <p className="mt-1 text-xs leading-relaxed text-subtle">{toast.message}</p> : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="rounded-lg p-1 text-muted transition hover:bg-white/5 hover:text-ink"
          >
            <LuX className="h-4 w-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
