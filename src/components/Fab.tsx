import { motion } from 'framer-motion'
export default function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label}
      className="fixed bottom-28 right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-orange-600 text-4xl font-light text-white shadow-xl shadow-orange-500/40"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>+</motion.button>
  )
}
