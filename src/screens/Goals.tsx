import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Target } from 'lucide-react'
import { db, type Area, type Goal } from '../lib/db'
import { AREAS, areaStyle, goalPace, goalPercent } from '../lib/goals'
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
  const behind = active.filter((g) => ['behind', 'overdue'].includes(goalPace(g))).length

  return (
    <div className="px-5 safe-top">
      <p className="eyebrow mt-2">{active.length} active · {avg}% average{behind ? ` · ${behind} need attention` : ''}</p>
      <h1 className="h1 mt-1">Goals</h1>

      {/* Balance across the four areas */}
      <div className="card mt-5 grid grid-cols-4 divide-x divide-line">
        {AREAS.map((a) => {
          const gs = active.filter((g) => g.area === a)
          const p = gs.length ? Math.round(gs.reduce((s, g) => s + goalPercent(g), 0) / gs.length) : 0
          return (
            <button key={a} onClick={() => setArea(area === a ? 'All' : a)} className={`px-2 py-3 text-center ${area === a ? areaStyle[a].soft : ''}`}>
              <p className={`text-2xs font-semibold uppercase tracking-[0.1em] ${areaStyle[a].text}`}>{a}</p>
              <p className="num mt-1 font-serif text-xl font-semibold">{gs.length ? `${p}%` : '—'}</p>
              <p className="text-2xs text-muted">{gs.length} {gs.length === 1 ? 'goal' : 'goals'}</p>
            </button>
          )
        })}
      </div>

      <div className="seg mt-4 grid-cols-3">
        {([['short', 'Short term'], ['long', 'Long term'], ['done', 'Achieved']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTerm(k)} className={`seg-item ${term === k ? 'seg-item-on' : ''}`}>{l}</button>
        ))}
      </div>
      {area !== 'All' && (
        <button onClick={() => setArea('All')} className="mt-3 text-sm font-semibold text-saffron">Showing {area} only · Show all</button>
      )}

      <div className="mt-4 space-y-3">
        {list.map((g) => <GoalCard key={g.id} goal={g} onOpen={(x) => setOpenId(x.id!)} />)}
        {list.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-10 text-center">
            <Target size={28} strokeWidth={1.5} className="text-faint" />
            <p className="mt-3 font-serif text-lg">{term === 'done' ? 'Achieved goals appear here' : 'Set a goal with a deadline'}</p>
            <p className="mt-1 text-sm text-muted">Tap + to create one.</p>
          </div>
        )}
      </div>

      <Fab onClick={() => { setEditing(null); setFormOpen(true) }} label="Add goal" />
      <GoalDetail goal={formOpen ? null : detail} onClose={() => setOpenId(null)} onEdit={(g) => { setEditing(g); setFormOpen(true) }} />
      <GoalForm open={formOpen} onClose={() => setFormOpen(false)} goal={editing} />
    </div>
  )
}
