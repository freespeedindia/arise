import { useState } from 'react'
import Sheet from './Sheet'
import Ring from './Ring'
import { db, type Goal } from '../lib/db'
import { areaStyle, daysLeft, goalPace, goalPercent, paceLabel } from '../lib/goals'
import { friendlyDate, todayKey } from '../lib/dates'
import { celebrate } from '../lib/celebrate'

export default function GoalDetail({ goal, onClose, onEdit }: { goal: Goal | null; onClose: () => void; onEdit: (g: Goal) => void }) {
  const [amount, setAmount] = useState('')
  if (!goal) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>
  const pct = goalPercent(goal)
  const st = areaStyle[goal.area]
  const id = goal.id!

  const checkComplete = async (g: Goal) => {
    const p = goalPercent(g)
    if (p >= 100 && !g.completedAt) {
      await db.goals.update(id, { completedAt: todayKey(), focus: false })
      celebrate(true)
    } else if (p < 100 && g.completedAt) {
      await db.goals.update(id, { completedAt: undefined })
    }
  }
  const setCurrent = async (v: number) => {
    const next = { ...goal, current: v }
    await db.goals.update(id, { current: v })
    await checkComplete(next)
  }
  const toggleMs = async (msId: string) => {
    const milestones = goal.milestones.map((m) => (m.id === msId ? { ...m, done: !m.done } : m))
    await db.goals.update(id, { milestones })
    if (milestones.find((m) => m.id === msId)?.done) celebrate(false)
    await checkComplete({ ...goal, milestones })
  }
  const toggleFocus = async () => {
    if (!goal.focus) await db.goals.toCollection().modify({ focus: false })
    await db.goals.update(id, { focus: !goal.focus })
  }
  const markComplete = async () => {
    await db.goals.update(id, { completedAt: todayKey(), focus: false })
    celebrate(true)
  }
  const remove = async () => {
    await db.goals.delete(id)
    onClose()
  }

  return (
    <Sheet open={!!goal} onClose={onClose} title={goal.title}>
      <div className="space-y-5">
        <div className={`flex items-center gap-5 rounded-3xl p-4 ${st.soft}`}>
          <Ring pct={pct} size={96} stroke={11} color={st.hex}>
            <span className="font-display text-2xl font-extrabold">{pct}%</span>
          </Ring>
          <div className="text-sm font-bold">
            <p className={st.text}>{st.emoji} {goal.area} · {goal.term === 'short' ? 'Short-term' : 'Long-term'}</p>
            <p className="mt-1">{paceLabel[goalPace(goal)]}</p>
            <p className="mt-1 text-gray-500">Deadline {friendlyDate(goal.deadline)} · {daysLeft(goal) >= 0 ? `${daysLeft(goal)} days left` : 'passed'}</p>
          </div>
        </div>

        {goal.target != null && (
          <div>
            <span className="label">Progress ({goal.unit || 'units'})</span>
            <div className="flex items-center gap-2">
              <input className="input" inputMode="decimal" placeholder={`Now: ${goal.current ?? 0}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button onClick={() => { if (amount) { setCurrent((goal.current ?? 0) + Number(amount)); setAmount('') } }}
                className="shrink-0 rounded-2xl bg-health-500 px-4 py-3 font-extrabold text-white">+ Add</button>
              <button onClick={() => { if (amount) { setCurrent(Number(amount)); setAmount('') } }}
                className="shrink-0 rounded-2xl bg-gray-100 px-4 py-3 font-extrabold dark:bg-ink-700">Set</button>
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-500">Now {(goal.current ?? 0).toLocaleString()} of {goal.target.toLocaleString()} {goal.unit}</p>
          </div>
        )}

        {goal.milestones.length > 0 && (
          <div>
            <span className="label">Milestones</span>
            <div className="space-y-2">
              {goal.milestones.map((m) => (
                <button key={m.id} onClick={() => toggleMs(m.id)} className="flex w-full items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-left dark:bg-ink-900">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 font-black ${m.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>{m.done ? '✓' : ''}</span>
                  <span className={`font-semibold ${m.done ? 'text-gray-400 line-through' : ''}`}>{m.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleFocus} className={`rounded-2xl py-3.5 font-extrabold ${goal.focus ? 'bg-saffron-500 text-white' : 'bg-orange-50 text-saffron-700 dark:bg-ink-700 dark:text-saffron-400'}`}>
            {goal.focus ? '⭐ Today\'s focus' : '☆ Make today\'s focus'}
          </button>
          <button onClick={() => onEdit(goal)} className="rounded-2xl bg-gray-100 py-3.5 font-extrabold dark:bg-ink-700">✏️ Edit</button>
        </div>
        {!goal.completedAt && <button onClick={markComplete} className="btn-primary w-full">🏆 Mark goal complete</button>}
        <button onClick={remove} className="w-full py-2 font-bold text-rose-500">Delete goal</button>
      </div>
    </Sheet>
  )
}
