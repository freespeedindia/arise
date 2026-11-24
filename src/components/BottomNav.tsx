import { motion } from 'framer-motion'

export type Tab = 'today' | 'tasks' | 'goals' | 'health' | 'money'
const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
  { id: 'today', label: 'Today', icon: '☀️', color: 'from-saffron-400 to-orange-600' },
  { id: 'tasks', label: 'Tasks', icon: '✅', color: 'from-sky-400 to-blue-600' },
  { id: 'goals', label: 'Goals', icon: '🎯', color: 'from-fuchsia-400 to-pink-600' },
  { id: 'health', label: 'Health', icon: '💚', color: 'from-emerald-400 to-green-600' },
  { id: 'money', label: 'Money', icon: '💰', color: 'from-yellow-300 to-amber-500' },
]

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-100 bg-white/90 backdrop-blur-lg safe-bottom dark:border-ink-700 dark:bg-ink-800/90">
      <div className="mx-auto flex max-w-lg justify-around px-2 pt-2 pb-2">
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button key={t.id} onClick={() => onChange(t.id)} aria-current={active ? 'page' : undefined}
              className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl">
              {active && (
                <motion.span layoutId="navpill" className="absolute inset-x-2 inset-y-0 rounded-2xl bg-orange-100 dark:bg-white/10"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }} />
              )}
              <span className={`text-2xl transition-transform ${active ? 'scale-110' : 'grayscale-[40%] opacity-70'}`}>{t.icon}</span>
              <span className={`text-[11px] font-extrabold ${active ? 'text-saffron-600 dark:text-saffron-400' : 'text-gray-500'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
