import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** A bottom sheet that slides up — easy to use with one thumb. */
export default function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-label={title}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-5 pb-8 safe-bottom dark:bg-ink-800"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 dark:bg-ink-700" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg dark:bg-ink-700">✕</button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
