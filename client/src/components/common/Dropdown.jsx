import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Dropdown({ trigger, items = [], align = 'right', className = '' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div onClick={() => setOpen((value) => !value)}>{trigger}</div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={`absolute top-[calc(100%+8px)] z-50 min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}
          >
            {items.map((item, index) =>
              item.divider ? (
                <div key={`divider-${index}`} className="my-1.5 h-px bg-slate-100" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    item.onClick?.()
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${
                    item.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  {item.icon ? <item.icon className="h-4 w-4" aria-hidden="true" /> : null}
                  {item.label}
                </button>
              ),
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
