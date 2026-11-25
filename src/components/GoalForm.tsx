import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { db, uid, type Area, type CheckItem, type Goal, type GoalLink } from '../lib/db'
import { addDays, todayKey } from '../lib/dates'
import { AREAS, areaStyle } from '../lib/goals'
import { syncLinkedGoals } from '../lib/health'
import AreaIcon from './AreaIcon'

const LINKS: { id: GoalLink | ''; label: string; unit?: string }[] = [
  { id: '', label: 'Manual' },
  { id: 'weight', label: 'Body weight', unit: 'kg' },
  { id: 'runKm', label: 'Running distance', unit: 'km' },
  { id: 'activeMinutes', label: 'Active minutes', unit: 'min' },
  { id: 'workouts', label: 'Workouts', unit: 'sessions' },
]

export default function GoalForm({ open, onClose, goal }: { open: boolean; onClose: () => void; goal?: Goal | null }) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<Area>('Health')
  const [term, setTerm] = useState<'short' | 'long'>('short')
  const [target, setTarget] = useState('')
  const [start, setStart] = useState('')
  const [unit, setUnit] = useState('')
  const [link, setLink] = useState<GoalLink | ''>('')
  const [deadline, setDeadline] = useState(addDays(todayKey(), 90))
  const [milestones, setMilestones] = useState<CheckItem[]>([])
  const [newMs, setNewMs] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? '')
    setArea(goal?.area ?? 'Health')
    setTerm(goal?.term ?? 'short')
    setTarget(goal?.target != null ? String(goal.target) : '')
    setStart(goal?.start != null ? String(goal.start) : '')
    setUnit(goal?.unit ?? '')
    setLink(goal?.link ?? '')
    setDeadline(goal?.deadline ?? addDays(todayKey(), 90))
    setMilestones(goal?.milestones ?? [])
    setNewMs('')
  }, [open, goal])

  const pickTerm = (t: 'short' | 'long') => { setTerm(t); if (!goal) setDeadline(addDays(todayKey(), t === 'short' ? 90 : 365)) }
  const pickLink = (l: GoalLink | '') => {
    setLink(l)
    const u = LINKS.find((x) => x.id === l)?.unit
    if (u) setUnit(u)
    if (l && l !== 'weight') setStart('0')
  }
  const addMs = () => {
    if (!newMs.trim()) return
    setMilestones([...milestones, { id: uid(), text: newMs.trim(), done: false }])
    setNewMs('')
  }
  const save = async () => {
    if (!title.trim()) return
    const ms = newMs.trim() ? [...milestones, { id: uid(), text: newMs.trim(), done: false }] : milestones
    const hasTarget = target !== ''
    const data = {
      title: title.trim(), area, term, deadline, milestones: ms,
      target: hasTarget ? Number(target) : undefined,
      start: hasTarget ? Number(start || 0) : undefined,
      unit: unit.trim() || undefined,
      link: (area === 'Health' && link) || undefined,
    }
    if (goal?.id != null) await db.goals.update(goal.id, data)
    else await db.goals.add({ ...data, current: data.start, startDate: todayKey(), focus: false, createdAt: new Date().toISOString() })
    await syncLinkedGoals()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={goal ? 'Edit goal' : 'New goal'}>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="goal-title">Goal</label>
          <input id="goal-title" autoFocus className="input text-[17px]" placeholder="e.g. Run a half marathon" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <span className="label">Area</span>
          <div className="grid grid-cols-4 gap-2">
            {AREAS.map((a) => (
              <button key={a} onClick={() => setArea(a)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-sm font-semibold ${area === a ? `${areaStyle[a].border} ${areaStyle[a].soft} ${areaStyle[a].text}` : 'border-line text-muted'}`}>
                <AreaIcon area={a} size={18} />{a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Horizon</span>
          <div className="seg grid-cols-2">
            {(['short', 'long'] as const).map((t) => (
              <button key={t} onClick={() => pickTerm(t)} className={`seg-item ${term === t ? 'seg-item-on' : ''}`}>{t === 'short' ? 'Short term' : 'Long term'}</button>
            ))}
          </div>
        </div>
        {area === 'Health' && (
          <div>
            <span className="label">Track progress from</span>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {LINKS.map((l) => (
                <button key={l.id || 'manual'} onClick={() => pickLink(l.id)} className={`chip ${link === l.id ? 'chip-on' : ''}`}>{l.label}</button>
              ))}
            </div>
            {link && <p className="mt-1.5 text-xs text-muted">Updates automatically from what you log in Health.</p>}
          </div>
        )}
        <div>
          <span className="label">Measurable target (optional)</span>
          <div className="grid grid-cols-3 gap-2">
            <input className="input num" inputMode="decimal" placeholder="Start" aria-label="Starting value" value={start} onChange={(e) => setStart(e.target.value)} />
            <input className="input num" inputMode="decimal" placeholder="Target" aria-label="Target value" value={target} onChange={(e) => setTarget(e.target.value)} />
            <input className="input" placeholder="Unit" aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <p className="mt-1.5 text-xs text-muted">Start and target, e.g. 80 → 72 kg or 0 → 500000 ₹. Leave empty to track by milestones.</p>
        </div>
        <div>
          <label className="label" htmlFor="goal-deadline">Deadline</label>
          <input id="goal-deadline" type="date" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div>
          <span className="label">Milestones</span>
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl bg-sunken px-4 py-2.5">
                <span className="flex-1 text-sm">{m.text}</span>
                <button onClick={() => setMilestones(milestones.filter((x) => x.id !== m.id))} className="text-faint" aria-label="Remove milestone"><X size={16} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input" placeholder="Add a milestone" aria-label="Add a milestone" value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMs()} />
              <button onClick={addMs} aria-label="Add milestone" className="btn-secondary px-4"><Plus size={18} /></button>
            </div>
          </div>
        </div>
        <button onClick={save} disabled={!title.trim()} className="btn-primary w-full">{goal ? 'Save changes' : 'Create goal'}</button>
      </div>
    </Sheet>
  )
}
