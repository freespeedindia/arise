import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Area, type Goal } from '../lib/db'
import { AREAS, areaStyle, goalPercent } from '../lib/goals'
import GoalCard from '../components/GoalCard'
import GoalForm from '../components/GoalForm'
import GoalDetail from '../components/GoalDetail'
import Fab from '../components/Fab'

export default function Goals() {
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const [term, setTerm] = useState<'short' | 'long' | 'done'>('short')
  const [area, setArea] = useState<Area | 'All'>('All')
  const [openId, setOpenId] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)

  const list = goals
    .filter((g) => (term === 'done' ? !!g.completedAt : !g.completedAt && g.term === term))
    .filter((g) => area === 'All' || g.area === area)
    .sort((a, b) => Number(b.focus) - Number(a.focus) || a.deadline.localeCompare(b.deadline))
  const detail = goals.find((g) => g.id === openId) ?? null

  const active = goals.filter((g) => !g.completedAt)
  const avg = active.length ? Math.round(active.reduce((s, g) => s + goalPercent(g), 0) / active.length) : 0

  return (
    <div className="px-5 safe-top">
      <div className="mt-4 flex items-end justify-between">
        <h1 className="font-display text-3xl font-extrabold">Goals</h1>
        <p className="font-bold text-gray-500">{active.length} active · {avg}% avg</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 dark:bg-ink-800">
        {([['short', '⚡ Short'], ['long', '🏔️ Long'], ['done', '🏆 Done']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTerm(k)}
            className={`rounded-xl py-2.5 text-sm font-extrabold ${term === k ? 'bg-saffron-500 text-white shadow' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>
      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {(['All', ...AREAS] as const).map((a) => (
          <button key={a} onClick={() => setArea(a)}
            className={`chip shrink-0 ${area === a ? (a === 'All' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : `${areaStyle[a].bg} text-white`) : 'bg-white text-gray-600 dark:bg-ink-800 dark:text-gray-300'}`}>
            {a === 'All' ? '🌈 All' : `${areaStyle[a].emoji} ${a}`}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {list.map((g) => <GoalCard key={g.id} goal={g} onOpen={(x) => setOpenId(x.id!)} />)}
        {list.length === 0 && (
          <div className="card px-6 py-10 text-center">
            <p className="text-5xl">🎯</p>
            <p className="mt-3 font-display text-lg font-bold">{term === 'done' ? 'Finished goals will shine here' : 'Set a goal with a deadline'}</p>
            <p className="mt-1 text-sm font-semibold text-gray-500">Tap + to create one.</p>
          </div>
        )}
      </div>

      <Fab onClick={() => { setEditing(null); setFormOpen(true) }} label="Add goal" />
      <GoalDetail goal={formOpen ? null : detail} onClose={() => setOpenId(null)} onEdit={(g) => { setEditing(g); setFormOpen(true) }} />
      <GoalForm open={formOpen} onClose={() => setFormOpen(false)} goal={editing} />
    </div>
  )
}
