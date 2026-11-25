import { motion } from 'framer-motion'
import { useState } from 'react'
import { setSetting } from '../lib/settings'
import Logo from '../components/Logo'

export default function Welcome() {
  const [name, setName] = useState('')
  const start = async () => {
    await setSetting('name', name.trim())
    await setSetting('onboarded', true)
  }
  return (
    <div className="flex min-h-full flex-col justify-between bg-bg px-7 pb-10 safe-top">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-16">
        <Logo size={56} className="text-saffron" />
        <h1 className="mt-6 font-serif text-[44px] font-semibold leading-none tracking-tight">Arise</h1>
        <p className="mt-2 text-[15px] text-muted">A planner for goals, health and money.</p>
        <div className="mt-12 border-l-2 border-gold pl-4">
          <p className="font-serif text-xl italic leading-snug">Arise, awake, and stop not till the goal is reached.</p>
          <p className="mt-2 text-sm text-muted">Swami Vivekananda</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <label htmlFor="welcome-name" className="label">What should we call you?</label>
        <input id="welcome-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === 'Enter' && start()} className="input text-lg" />
        <button onClick={start} className="btn-primary mt-3 w-full py-4 text-base">Begin</button>
        <p className="mt-4 text-center text-xs text-muted">Everything you enter stays on this phone.</p>
      </motion.div>
    </div>
  )
}
