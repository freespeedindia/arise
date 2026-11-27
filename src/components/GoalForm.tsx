import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { db, uid, type Area, type CheckItem, type Goal, type GoalLink, type GoalStatus } from '../lib/db'
import { addDays, todayKey } from '../lib/dates'
import { AREA_LABEL, AREAS, areaStyle } from '../lib/goals'
import { STATUS_LABEL } from '../lib/day'
import { syncLinkedGoals } from '../lib/health'
import { useLiveQuery } from 'dexie-react-hooks'
import { moneyLinkedValue } from '../lib/money'
import AreaIcon from './AreaIcon'

const HEALTH_LINKS: { id: GoalLink | ''; label: string; unit?: string }[] = [
  { id: '', label: 'Manual' },
  { id: 'weight', label: 'Body weight', unit: 'kg' },
  { id: 'runKm', label: 'Running distance', unit: 'km' },
  { id: 'activeMinutes', label: 'Active minutes', unit: 'min' },
  { id: 'workouts', label: 'Workouts', unit: 'sessions' },
]
const WEALTH_LINKS: { id: GoalLink | ''; label: string; unit?: string }[] = [
  { id: '', label: 'Manual' },
  { id: 'savings', label: 'Money saved (in minus out)', unit: '₹' },
]
/** Short term: by the end of next month. Long term: a year out. */
const defaultDeadline = (t: 'short' | 'long') => {
  const d = new Date()
  if (t === 'short') return todayKeyOf(new Date(d.getFullYear(), d.getMonth() + 2, 0))
  return addDays(todayKey(), 365)
}
const todayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const FOCUS_LINKS: { id: GoalLink | ''; label: string; unit?: string }[] = [
  { id: '', label: 'Manual' },
  { id: 'focusHours', label: 'Focus hours', unit: 'hours' },
]

export default function GoalForm({ open, onClose, goal, term: initialTerm = 'short' }: { open: boolean; onClose: () => void; goal?: Goal | null; term?: 'short' | 'long' }) {
  const [status, setStatus] = useState<GoalStatus | ''>('')
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<Area>('Health')
  const [term, setTerm] = useState<'short' | 'long'>('short')
  const [target, setTarget] = useState('')
  const [start, setStart] = useState('')
  const [unit, setUnit] = useState('')
  const [link, setLink] = useState<GoalLink | ''>('')
  const [linkId, setLinkId] = useState<number | undefined>()
  const holdings = useLiveQuery(() => db.holdings.toArray()) ?? []
  const liabilities = useLiveQuery(() => db.liabilities.toArray()) ?? []
  const LINKS = area === 'Wealth' ? (goal?.link && !WEALTH_LINKS.some((l) => l.id === goal.link) ? [...WEALTH_LINKS, { id: goal.link, label: 'Linked value (older)', unit: '₹' }] : WEALTH_LINKS) : area === 'Health' ? HEALTH_LINKS : FOCUS_LINKS
  const canLink = true
  const [deadline, setDeadline] = useState(defaultDeadline('short'))
  const [milestones, setMilestones] = useState<CheckItem[]>([])
  const [newMs, setNewMs] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(goal?.title ?? '')
    setArea(goal?.area ?? 'Health')
    setTerm(goal?.term ?? initialTerm)
    setStatus(goal?.status ?? '')
    setTarget(goal?.target != null ? String(goal.target) : '')
    setStart(goal?.start != null ? String(goal.start) : '')
    setUnit(goal?.unit ?? '')
    setLink(goal?.link ?? '')
    setLinkId(goal?.linkId)
    setDeadline(goal?.deadline ?? defaultDeadline(goal?.term ?? initialTerm))
    setMilestones(goal?.milestones ?? [])
    setNewMs('')
  }, [open, goal, initialTerm])

  const pickTerm = (t: 'short' | 'long') => { setTerm(t); if (!goal) setDeadline(defaultDeadline(t)) }
  const moneyStart = (l: GoalLink, id?: number) => {
    // Progress is measured from where you stand today
    const v = moneyLinkedValue({ link: l, linkId: id, startDate: todayKey() } as Goal, holdings, liabilities, [])
    setStart(String(Math.round(v ?? 0)))
  }
  const pickLink = (l: GoalLink | '') => {
    setLink(l)
    const u = LINKS.find((x) => x.id === l)?.unit
    if (u) setUnit(u)
    if (l === 'netWorth' || l === 'portfolio') moneyStart(l)
    else if (l === 'holding') { const id = holdings[0]?.id; setLinkId(id); moneyStart(l, id) }
    else if (l && l !== 'weight') setStart('0')
  }
  const pickArea = (a: Area) => { setArea(a); if (a !== area) setLink('') }
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
      title: title.trim(), area, term, deadline, milestones: ms, status: status || undefined,
      target: hasTarget ? Number(target) : undefined,
      start: hasTarget ? Number(start || 0) : undefined,
      unit: unit.trim() || undefined,
      link: (canLink && link && !(link === 'holding' && linkId == null) && link) || undefined,
      linkId: link === 'holding' ? linkId : undefined,
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
              <button key={a} onClick={() => pickArea(a)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-sm font-semibold ${area === a ? `${areaStyle[a].border} ${areaStyle[a].soft} ${areaStyle[a].text}` : 'border-line text-muted'}`}>
                <AreaIcon area={a} size={18} />{AREA_LABEL[a]}
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
          <p className="mt-1.5 text-xs text-muted">{term === 'short' ? 'This month or next.' : 'Six months or more.'}</p>
        </div>
        {canLink && (
          <div>
            <span className="label">Track progress from</span>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
              {LINKS.map((l) => (
                <button key={l.id || 'manual'} onClick={() => pickLink(l.id)} className={`chip ${link === l.id ? 'chip-on' : ''}`}>{l.label}</button>
              ))}
            </div>
            {link === 'holding' && (
              holdings.length ? (
                <select className="input mt-2" aria-label="Which investment" value={linkId ?? ''} onChange={(e) => { const id = Number(e.target.value); setLinkId(id); moneyStart('holding', id) }}>
                  {holdings.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.kind}</option>)}
                </select>
              ) : <p className="mt-1.5 text-xs text-crimson">Add an investment in Money first.</p>
            )}
            {link && <p className="mt-1.5 text-xs text-muted">Updates automatically from what you log in {area === 'Wealth' ? 'Expenses' : area === 'Health' ? 'Health' : 'Focus mode'}.{link === 'savings' ? ' Counts income minus expenses from the day the goal starts.' : ''}</p>}
          </div>
        )}
        <div>
          <span className="label">Measurable target (optional)</span>
          <div className="grid grid-cols-3 gap-2">
            <input className="input num" inputMode="decimal" placeholder="Start" aria-label="Starting value" value={start} onChange={(e) => setStart(e.target.value)} />
            <input className="input num" inputMode="decimal" placeholder="Target" aria-label="Target value" value={target} onChange={(e) => setTarget(e.target.value)} />
            <input className="input" placeholder="Unit" aria-label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <p className="mt-1.5 text-xs text-muted">Start and target, such as 80 → 76 kg or 0 → 50000 ₹. Leave empty to track by milestones.</p>
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
        <div>
          <label className="label" htmlFor="goal-status">Status</label>
          <select id="goal-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as GoalStatus | '')}>
            <option value="">Automatic, from progress and daily actions</option>
            {(['not-started', 'in-progress', 'on-track', 'at-risk'] as const).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-muted">To complete a goal, open it and tap Mark as completed.</p>
        </div>
        <button onClick={save} disabled={!title.trim()} className="btn-primary w-full">{goal ? 'Save changes' : 'Create goal'}</button>
      </div>
    </Sheet>
  )
}
