import { motion } from 'framer-motion'
import { Link2, Star } from 'lucide-react'
import type { Goal } from '../lib/db'
import { areaStyle, daysLeft, goalPace, goalPercent, paceLabel, paceTone } from '../lib/goals'
import Ring from './Ring'
import { money } from '../lib/money'
import AreaIcon from './AreaIcon'

export function goalValueText(g: Goal): string | null {
  if (g.target == null) return g.milestones.length ? `${g.milestones.filter((m) => m.done).length} of ${g.milestones.length} milestones` : null
  if (g.unit === '₹') {
    const f = (n: number) => money(n, '₹', { compact: true })
    const now = f(g.current ?? g.start ?? 0)
    return g.start ? `${now} · ${f(g.start)} → ${f(g.target)}` : `${now} of ${f(g.target)}`
  }
  const now = (g.current ?? g.start ?? 0).toLocaleString('en-IN')
  return g.start ? `${now} ${g.unit ?? ''} · ${g.start.toLocaleString('en-IN')} → ${g.target.toLocaleString('en-IN')}` : `${now} of ${g.target.toLocaleString('en-IN')} ${g.unit ?? ''}`
}

export default function GoalCard({ goal, onOpen }: { goal: Goal; onOpen: (g: Goal) => void }) {
  const pct = goalPercent(goal)
  const pace = goalPace(goal)
  const left = daysLeft(goal)
  const st = areaStyle[goal.area]
  const value = goalValueText(goal)
  return (
    <motion.button layout whileTap={{ scale: 0.99 }} onClick={() => onOpen(goal)} className="card relative w-full overflow-hidden p-4 text-left">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${st.bg}`} />
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] ${st.text}`}>
            <AreaIcon area={goal.area} size={13} /> {goal.area}
            <span className="text-faint">·</span><span className="text-muted">{goal.term === 'short' ? 'Short term' : 'Long term'}</span>
            {goal.focus && <Star size={12} className="ml-1 fill-gold text-gold" aria-label="Focus goal" />}
            {goal.link && <Link2 size={12} className="text-muted" aria-label="Updates automatically" />}
          </div>
          <p className="mt-1.5 font-display text-[19px] font-medium leading-snug">{goal.title}</p>
          {value && <p className="num mt-1 text-sm text-muted">{value}</p>}
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span className={`font-semibold ${paceTone[pace]}`}>{paceLabel[pace]}</span>
            {pace !== 'done' && <span className="text-muted">{left >= 0 ? `${left} days left` : `${-left} days past deadline`}</span>}
          </div>
        </div>
        <Ring pct={pct} size={64} stroke={5} color={st.color}>
          <span className="num text-[15px] font-semibold">{pct}%</span>
        </Ring>
      </div>
    </motion.button>
  )
}
