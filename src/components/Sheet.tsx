import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/** Bottom sheet — reachable with one thumb. */
export default function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div className="absolute inset-0 bg-[rgb(20_15_10/0.45)]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-label={title}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border-t border-line bg-surface px-5 pb-8 pt-3 safe-bottom"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-serif text-[22px] font-semibold leading-tight">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken text-muted">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
