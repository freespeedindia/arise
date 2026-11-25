import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { onToast } from '../lib/celebrate'

export default function Toast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t: number | undefined
    const off = onToast((m) => { setMsg(m); window.clearTimeout(t); t = window.setTimeout(() => setMsg(null), 2600) })
    return () => { off(); window.clearTimeout(t) }
  }, [])
  return (
    <AnimatePresence>
      {msg && (
        <motion.div role="status" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[60] mx-auto mt-[max(env(safe-area-inset-top),12px)] flex w-fit max-w-[90%] items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-card">
          <Check size={16} className="text-gold" /> {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
