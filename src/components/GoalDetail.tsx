import { Check, Link2, Pencil, Star, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import Ring from './Ring'
import { db, type Goal } from '../lib/db'
import { areaStyle, daysLeft, goalPace, goalPercent, paceLabel, paceTone } from '../lib/goals'
import { friendlyDate, todayKey } from '../lib/dates'
import { celebrate } from '../lib/celebrate'
import AreaIcon from './AreaIcon'

export default function GoalDetail({ goal, onClose, onEdit }: { goal: Goal | null; onClose: () => void; onEdit: (g: Goal) => void }) {
  const [amount, setAmount] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => { setAmount(''); setConfirmDelete(false) }, [goal?.id])
  if (!goal) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>
  const pct = goalPercent(goal)
  const st = areaStyle[goal.area]
  const id = goal.id!
  const pace = goalPace(goal)

  const checkComplete = async (g: Goal) => {
    const p = goalPercent({ ...g, completedAt: undefined })
    if (p >= 100 && !g.completedAt) {
      await db.goals.update(id, { completedAt: todayKey(), focus: false })
      celebrate(true, 'Goal achieved. Well done.')
    } else if (p < 100 && g.completedAt) {
      await db.goals.update(id, { completedAt: undefined })
    }
  }
  const setCurrent = async (v: number) => {
    await db.goals.update(id, { current: v })
    await checkComplete({ ...goal, current: v })
  }
  const toggleMs = async (msId: string) => {
    const milestones = goal.milestones.map((m) => (m.id === msId ? { ...m, done: !m.done } : m))
    await db.goals.update(id, { milestones })
    if (milestones.find((m) => m.id === msId)?.done) celebrate(false, 'Milestone reached')
    await checkComplete({ ...goal, milestones })
  }
  const toggleFocus = async () => {
    if (!goal.focus) await db.goals.toCollection().modify({ focus: false })
    await db.goals.update(id, { focus: !goal.focus })
  }
  const markComplete = async () => {
    await db.goals.update(id, { completedAt: todayKey(), focus: false })
    celebrate(true, 'Goal achieved. Well done.')
  }
  const reopen = async () => db.goals.update(id, { completedAt: undefined })
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await db.goals.delete(id)
    onClose()
  }

  return (
    <Sheet open={!!goal} onClose={onClose} title={goal.title}>
      <div className="space-y-6">
        <div className="flex items-center gap-5">
          <Ring pct={pct} size={92} stroke={7} color={st.color}>
            <span className="num font-serif text-2xl font-semibold">{pct}%</span>
          </Ring>
          <div className="space-y-1 text-sm">
            <p className={`flex items-center gap-1.5 font-semibold ${st.text}`}><AreaIcon area={goal.area} size={15} />{goal.area} · {goal.term === 'short' ? 'Short term' : 'Long term'}</p>
            <p className={`font-semibold ${paceTone[pace]}`}>{paceLabel[pace]}</p>
            <p className="text-muted">Due {friendlyDate(goal.deadline)} · {daysLeft(goal) >= 0 ? `${daysLeft(goal)} days left` : 'deadline passed'}</p>
          </div>
        </div>

        {goal.target != null && (goal.link ? (
          <div className="flex items-start gap-3 rounded-xl bg-sunken p-4 text-sm">
            <Link2 size={16} className="mt-0.5 shrink-0 text-muted" />
            <p><span className="num font-semibold">Now {(goal.current ?? goal.start ?? 0).toLocaleString()} {goal.unit}</span> · target {goal.target.toLocaleString()}. This goal updates automatically from your Health log.</p>
          </div>
        ) : (
          <div>
            <span className="label">Update progress</span>
            <div className="flex items-center gap-2">
              <input className="input num" inputMode="decimal" placeholder={`Now ${goal.current ?? goal.start ?? 0}`} aria-label="Progress value" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button onClick={() => { if (amount !== '') { setCurrent(Number(amount)); setAmount('') } }} className="btn-primary shrink-0">Update</button>
              <button onClick={() => { if (amount !== '') { setCurrent((goal.current ?? goal.start ?? 0) + Number(amount)); setAmount('') } }} className="btn-secondary shrink-0">Add</button>
            </div>
            <p className="num mt-1.5 text-xs text-muted">Now {(goal.current ?? goal.start ?? 0).toLocaleString()} {goal.unit} · started at {(goal.start ?? 0).toLocaleString()} · target {goal.target.toLocaleString()}. Type the new value and tap Update, or an amount and tap Add.</p>
          </div>
        ))}

        {goal.milestones.length > 0 && (
          <div>
            <span className="label">Milestones</span>
            <div className="card divide-y divide-line">
              {goal.milestones.map((m) => (
                <button key={m.id} onClick={() => toggleMs(m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${m.done ? 'border-forest bg-forest text-white' : 'border-line'}`}>{m.done && <Check size={14} strokeWidth={3} />}</span>
                  <span className={`text-[15px] ${m.done ? 'text-faint line-through' : ''}`}>{m.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleFocus} className={goal.focus ? 'btn border border-gold bg-gold-soft text-gold' : 'btn-secondary'}>
            <Star size={16} className={goal.focus ? 'fill-gold' : ''} />{goal.focus ? 'Focus goal' : 'Set as focus'}
          </button>
          <button onClick={() => onEdit(goal)} className="btn-secondary"><Pencil size={16} />Edit</button>
        </div>
        {goal.completedAt
          ? <button onClick={reopen} className="btn-secondary w-full">Reopen goal</button>
          : <button onClick={markComplete} className="btn-primary w-full"><Trophy size={17} />Mark as achieved</button>}
        <button onClick={remove} className="btn-ghost w-full text-crimson">{confirmDelete ? 'Tap again to delete' : 'Delete goal'}</button>
      </div>
    </Sheet>
  )
}
