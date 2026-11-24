import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { db, uid, type Area, type CheckItem, type Goal } from '../lib/db'
import { addDays, todayKey } from '../lib/dates'
import { AREAS, areaStyle } from '../lib/goals'

export default function GoalForm({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal | null }) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<Area>('Health')
  const [term, setTerm] = useState<'short' | 'long'>('short')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('')
  const [unit, setUnit] = useState('')
  const [deadline, setDeadline] = useState(addDays(todayKey(), 30))
  const [milestones, setMilestones] = useState<CheckItem[]>([])
  const [newMs, setNewMs] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? '')
    setArea(goal?.area ?? 'Health')
    setTerm(goal?.term ?? 'short')
    setTarget(goal?.target != null ? String(goal.target) : '')
    setCurrent(goal?.current != null ? String(goal.current) : '')
    setUnit(goal?.unit ?? '')
    setDeadline(goal?.deadline ?? addDays(todayKey(), 30))
    setMilestones(goal?.milestones ?? [])
    setNewMs('')
  }, [open, goal])

  const pickTerm = (t: 'short' | 'long') => {
    setTerm(t)
    if (!goal) setDeadline(addDays(todayKey(), t === 'short' ? 30 : 365))
  }
  const addMs = () => {
    if (!newMs.trim()) return
    setMilestones([...milestones, { id: uid(), text: newMs.trim(), done: false }])
    setNewMs('')
  }
  const save = async () => {
    if (!title.trim()) return
    const ms = newMs.trim() ? [...milestones, { id: uid(), text: newMs.trim(), done: false }] : milestones
    const data = {
      title: title.trim(), area, term, deadline, milestones: ms,
      target: target ? Number(target) : undefined,
      current: current ? Number(current) : target ? 0 : undefined,
      unit: unit.trim() || undefined,
    }
    if (goal?.id != null) await db.goals.update(goal.id, data)
    else await db.goals.add({ ...data, startDate: todayKey(), focus: false, createdAt: new Date().toISOString() })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="space-y-5">
        <input autoFocus className="input text-lg font-bold" placeholder="e.g. Run a half marathon" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <span className="label">Area</span>
          <div className="grid grid-cols-4 gap-2">
            {AREAS.map((a) => (
              <button key={a} onClick={() => setArea(a)}
                className={`rounded-2xl py-3 text-sm font-extrabold ${area === a ? `bg-gradient-to-br ${areaStyle[a].grad} text-white shadow-md` : 'bg-gray-100 dark:bg-ink-700'}`}>
                <span className="block text-xl">{areaStyle[a].emoji}</span>{a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Type</span>
          <div className="grid grid-cols-2 gap-2">
            {(['short', 'long'] as const).map((t) => (
              <button key={t} onClick={() => pickTerm(t)}
                className={`rounded-2xl py-3 font-extrabold ${term === t ? 'bg-saffron-500 text-white' : 'bg-gray-100 dark:bg-ink-700'}`}>
                {t === 'short' ? '⚡ Short-term' : '🏔️ Long-term'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Measurable target (optional)</span>
          <div className="grid grid-cols-3 gap-2">
            <input className="input" inputMode="decimal" placeholder="Now" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <input className="input" inputMode="decimal" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} />
            <input className="input" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <p className="mt-1 text-xs font-semibold text-gray-500">e.g. 0 → 21 km, or 0 → 500000 ₹. Leave empty to track by milestones.</p>
        </div>
        <div>
          <span className="label">Deadline</span>
          <input type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div>
          <span className="label">Milestones</span>
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-ink-900">
                <span className="flex-1 font-semibold">{m.text}</span>
                <button onClick={() => setMilestones(milestones.filter((x) => x.id !== m.id))} className="text-gray-400" aria-label="Remove">✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input" placeholder="Add a milestone…" value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMs()} />
              <button onClick={addMs} className="rounded-2xl bg-gray-100 px-5 text-xl font-black dark:bg-ink-700">+</button>
            </div>
          </div>
        </div>
        <button onClick={save} className="btn-primary w-full">{goal ? 'Save changes' : 'Create goal'}</button>
      </div>
    </Sheet>
  )
}
