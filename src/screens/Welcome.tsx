import { motion } from 'framer-motion'
import { useState } from 'react'
import { setSetting } from '../lib/settings'

export default function Welcome() {
  const [name, setName] = useState('')
  const start = async () => {
    await setSetting('name', name.trim())
    await setSetting('onboarded', true)
  }
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-saffron-400 via-orange-500 to-rose-500 px-6 text-white">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 12 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/20 text-6xl shadow-2xl backdrop-blur">🌅</motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
        className="font-display text-5xl font-extrabold tracking-tight">Arise</motion.h1>
      <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
        className="mt-3 max-w-xs text-center text-lg font-semibold text-white/90">
        “Arise, awake, and stop not till the goal is reached.”
      </motion.p>
      <p className="mt-1 text-sm font-bold text-white/70">— Swami Vivekananda</p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="mt-10 w-full max-w-sm">
        <label className="mb-2 block text-sm font-extrabold uppercase tracking-wide text-white/80">What should I call you?</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
          onKeyDown={(e) => e.key === 'Enter' && start()}
          className="w-full rounded-2xl bg-white/95 px-5 py-4 text-lg font-bold text-ink-900 outline-none placeholder:text-gray-400" />
        <button onClick={start} className="mt-4 w-full rounded-2xl bg-ink-900 py-4 text-lg font-extrabold text-white shadow-xl active:scale-[0.98]">
          Begin →
        </button>
        <p className="mt-4 text-center text-xs font-semibold text-white/75">Everything you enter stays on this phone.</p>
      </motion.div>
    </div>
  )
}
