import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LuX } from 'react-icons/lu'
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full ${widths[size]} overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl`}
          >
            <div className="relative flex items-start justify-between gap-4">
              <div>
                {title ? <h3 className="text-lg font-bold text-slate-950">{title}</h3> : null}
                {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>
            {children ? <div className="relative mt-5">{children}</div> : null}
            {footer ? <div className="relative mt-6 flex justify-end gap-3">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
