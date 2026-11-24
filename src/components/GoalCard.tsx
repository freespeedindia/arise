import { motion } from 'framer-motion'
import type { Goal } from '../lib/db'
import { areaStyle, daysLeft, goalPace, goalPercent, paceLabel } from '../lib/goals'
import Ring from './Ring'

const paceStyle = {
  done: 'bg-white/30', ahead: 'bg-white/30', on: 'bg-white/25', behind: 'bg-black/20', overdue: 'bg-black/30',
}

export default function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: (g: Goal) => void }) {
  const pct = goalPercent(goal)
  const pace = goalPace(goal)
  const left = daysLeft(goal)
  const st = areaStyle[goal.area]
  return (
    <motion.button layout whileTap={{ scale: 0.98 }} onClick={() => onOpen(goal)}
      className={`relative w-full overflow-hidden rounded-4xl bg-gradient-to-br ${st.grad} p-5 text-left text-white shadow-lg`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15" />
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-nowrap text-xs font-extrabold uppercase tracking-wide text-white/85">
            <span>{st.emoji} {goal.area}</span><span>·</span><span>{goal.term === 'short' ? 'Short-term' : 'Long-term'}</span>
            {goal.focus && <span className="rounded-full bg-white/30 px-2 py-0.5">⭐ Focus</span>}
          </div>
          <p className="mt-1.5 font-display text-xl font-bold leading-tight">{goal.title}</p>
          {goal.target != null && (
            <p className="mt-1 text-sm font-bold text-white/90">{(goal.current ?? 0).toLocaleString()} / {goal.target.toLocaleString()} {goal.unit}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
            <span className={`rounded-full px-2.5 py-1 ${paceStyle[pace]}`}>{pace === 'behind' || pace === 'overdue' ? '🐢' : pace === 'done' ? '🏆' : '🚀'} {paceLabel[pace]}</span>
            {pace !== 'done' && <span className="rounded-full bg-white/25 px-2.5 py-1">⏳ {left >= 0 ? `${left} days left` : `${-left} days over`}</span>}
          </div>
        </div>
        <Ring pct={pct} size={76} stroke={9} color="#ffffff" track="stroke-white/25">
          <span className="font-display text-lg font-extrabold">{pct}%</span>
        </Ring>
      </div>
    </motion.button>
  )
}
