import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
export default function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick} aria-label={label}
      className="fixed bottom-[88px] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron text-white shadow-[0_8px_24px_-8px_rgb(var(--saffron)/0.6)]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      <Plus size={26} strokeWidth={2} />
    </motion.button>
  )
}
