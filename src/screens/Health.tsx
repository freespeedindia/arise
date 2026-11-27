import { useEffect, useState } from 'react'
import { Activity as ActivityIcon, Check, Copy, Pencil, Trash2 } from 'lucide-react'
import type { Settings } from '../lib/settings'
import { setSetting } from '../lib/settings'
import { db, MEAL_SLOTS, type ActivityType, type MealSlot, type Person } from '../lib/db'
import { addDays, friendlyDate } from '../lib/dates'
import { emptyDay, healthScore, healthVerdict, MEAL_LABEL } from '../lib/day'
import { saveDay, useAllData } from '../lib/useData'
import { syncLinkedGoals } from '../lib/health'
import { toast } from '../lib/celebrate'
import DateBar from '../components/DateBar'
import Sheet from '../components/Sheet'
import ListEditor from '../components/money/ListEditor'
import WeightCard from '../components/health/WeightCard'
import WaterCard from '../components/health/WaterCard'
import SupplementsCard from '../components/health/SupplementsCard'

export type HealthAction = 'meals' | 'weight' | 'activity' | null

const VERDICT = {
  good: { label: 'Stayed on track', tone: 'text-forest', bar: 'bg-forest' },
  mixed: { label: 'Partly on track', tone: 'text-saffron-deep', bar: 'bg-saffron' },
  off: { label: 'Off track', tone: 'text-crimson', bar: 'bg-crimson' },
  none: { label: 'Nothing logged yet', tone: 'text-muted', bar: 'bg-faint' },
} as const

export default function Health({ s, today, date, setDate, initial }: { s: Settings; today: string; date: string; setDate: (d: string) => void; initial?: HealthAction }) {
  const [person, setPerson] = useState<Person>('me')
  const [weightOpen, setWeightOpen] = useState(initial === 'weight')
  const data = useAllData()
  const other: Person = person === 'me' ? 'devi' : 'me'
  const names: Record<Person, string> = { me: 'Me', devi: s.childName || 'Devi' }
  useEffect(() => { if (initial === 'meals' || initial === 'activity') document.getElementById(initial === 'meals' ? 'meal-plan' : 'activity')?.scrollIntoView({ block: 'start' }) }, [initial, data == null])
  if (!data) return null

  const hd = data.healthDays.find((h) => h.person === person && h.date === date) ?? emptyDay(person, date)
  const sc = healthScore(data, s, person, date, today)
  const v = VERDICT[healthVerdict(sc.pct)]
  const future = date > today
  const tomorrow = addDays(date, 1)
  const next = data.healthDays.find((h) => h.person === person && h.date === tomorrow)

  const setMeal = (m: MealSlot, text: string) => saveDay(person, date, (d) => ({ meals: { ...d.meals, [m]: text } }))
  const toggleFollowed = (m: MealSlot) => saveDay(person, date, (d) => ({ followed: { ...d.followed, [m]: !d.followed[m] } }))
  const copyTo = async (to: Person, toDate = date) => {
    await saveDay(to, toDate, () => ({ meals: { ...hd.meals } }))
    toast(`Meals copied to ${to === person ? friendlyDate(toDate).toLowerCase() : names[to]}`)
  }
  const routineList = person === 'me' ? s.routineMe : s.routineDevi
  const toggleRoutine = (r: string) => saveDay(person, date, (d) => ({ routine: d.routine.includes(r) ? d.routine.filter((x) => x !== r) : [...d.routine, r] }))

  return (
    <div className="px-5 safe-top">
      <p className="eyebrow mt-2">Meals · Movement · Routine</p>
      <h1 className="h1 mt-1">Health</h1>
      <div className="seg mt-4 grid-cols-2">
        {(['devi', 'me'] as const).map((p) => (
          <button key={p} onClick={() => setPerson(p)} className={`seg-item ${person === p ? 'seg-item-on' : ''}`}>{names[p]}</button>
        ))}
      </div>
      <DateBar date={date} today={today} onChange={setDate} className="mt-3" />

      {/* End-of-day indicator */}
      {!future && (
        <div className="card mt-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className={`font-display text-lg font-medium ${v.tone}`}>{v.label}</p>
            {sc.pct != null && <p className="num font-display text-lg font-medium">{sc.pct}%</p>}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken"><div className={`h-full rounded-full ${v.bar}`} style={{ width: `${sc.pct ?? 0}%` }} /></div>
          <div className="mt-3 grid grid-cols-4 gap-1 text-center">
            <Mini label="Meals" value={sc.planned ? `${sc.followed}/${sc.planned}` : '—'} />
            <Mini label="Activity" value={sc.exercised ? `${sc.exerciseMin} min` : 'None'} />
            <Mini label="Routine" value={sc.routineTotal ? `${sc.routineDone}/${sc.routineTotal}` : '—'} />
            <Mini label="Supplements" value={sc.supTotal ? `${sc.supTaken}/${sc.supTotal}` : '—'} />
          </div>
        </div>
      )}

      {/* Meal plan */}
      <section id="meal-plan" className="mt-6 scroll-mt-4">
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="eyebrow">{person === 'me' ? 'My' : `${names[person]}'s`} meal plan · {friendlyDate(date)}</h2>
        </div>
        <div className="card divide-y divide-line">
          {MEAL_SLOTS.map((m) => (
            <MealRow key={`${person}-${date}-${m}`} label={MEAL_LABEL[m]} value={hd.meals[m] ?? ''} followed={!!hd.followed[m]} canTick={!future && !!hd.meals[m]?.trim()}
              onSave={(t) => setMeal(m, t)} onTick={() => toggleFollowed(m)} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => copyTo(other)} disabled={!Object.values(hd.meals).some((x) => x?.trim())} className="btn-secondary text-sm"><Copy size={15} />Copy to {names[other]}</button>
          <button onClick={() => copyTo(person, tomorrow)} disabled={!Object.values(hd.meals).some((x) => x?.trim())} className="btn-secondary text-sm"><Copy size={15} />Same {friendlyDate(tomorrow).toLowerCase() === 'tomorrow' ? 'tomorrow' : 'next day'}</button>
        </div>
        <p className="mt-2 px-1 text-xs text-muted">Just the idea of the meal, such as "Dal, vegetables and roti". Tick each one once it is eaten as planned.</p>
        {date === today && (
          <button onClick={() => setDate(tomorrow)} className="card mt-3 w-full p-4 text-left">
            <p className="eyebrow">Tomorrow</p>
            {next && Object.values(next.meals).some((x) => x?.trim())
              ? <p className="mt-1 text-sm">{MEAL_SLOTS.map((m) => next.meals[m]).filter(Boolean).join(' · ')}</p>
              : <p className="mt-1 text-sm text-muted">Not planned yet. Tap to plan, so the groceries are ready.</p>}
          </button>
        )}
      </section>

      {/* Activity */}
      <section id="activity" className="mt-6 scroll-mt-4">
        <h2 className="eyebrow mb-2.5">{person === 'me' ? 'Exercise' : 'Physical activity'}</h2>
        <ActivityLog person={person} date={date} acts={data.activities.filter((a) => a.date === date && (a.person ?? 'me') === person)} disabled={future} />
      </section>

      {/* Routine */}
      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Daily routine</h2>
        <Routine items={routineList} done={hd.routine} onToggle={toggleRoutine} disabled={future}
          onEdit={(l) => setSetting(person === 'me' ? 'routineMe' : 'routineDevi', l)} who={names[person]} />
      </section>

      <section className="mt-6 space-y-3">
        <SupplementsCard today={date} person={person} />
        {person === 'me' && s.trackWater && <WaterCard s={s} today={date} />}
        {person === 'me' && <WeightCard s={s} today={today} openLog={weightOpen} setOpenLog={setWeightOpen} />}
        {person === 'me' && (
          <button onClick={() => setSetting('trackWater', !s.trackWater)} className="btn-ghost w-full text-sm">{s.trackWater ? 'Hide water tracking' : 'Show water tracking'}</button>
        )}
      </section>
    </div>
  )
}

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-sunken px-1 py-2"><p className="num text-sm font-semibold">{value}</p><p className="text-2xs text-muted">{label}</p></div>
)

function MealRow({ label, value, followed, canTick, onSave, onTick }: { label: string; value: string; followed: boolean; canTick: boolean; onSave: (t: string) => void; onTick: () => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = () => { if (text.trim() !== value.trim()) onSave(text.trim()) }
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        <input className={`w-full bg-transparent py-1 text-[15px] outline-none placeholder:text-faint ${followed ? 'text-muted' : ''}`} placeholder="Add a meal" aria-label={label}
          value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
      </div>
      {canTick && (
        <button onClick={onTick} aria-label={followed ? `${label} followed. Undo` : `Mark ${label.toLowerCase()} as followed`} aria-pressed={followed}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] ${followed ? 'border-forest bg-forest text-white' : 'border-line text-transparent'}`}><Check size={17} strokeWidth={2.5} /></button>
      )}
    </div>
  )
}

const TYPES: ActivityType[] = ['Walk', 'Run', 'Yoga', 'Gym', 'Cycle', 'Swim', 'Sport', 'Other']
function ActivityLog({ person, date, acts, disabled }: { person: Person; date: string; acts: { id?: number; type: ActivityType; minutes: number; km?: number }[]; disabled: boolean }) {
  const [type, setType] = useState<ActivityType>(person === 'me' ? 'Walk' : 'Sport')
  const [min, setMin] = useState('30')
  const [km, setKm] = useState('')
  const add = async () => {
    const minutes = Math.round(Number(min))
    if (!minutes) return
    await db.activities.add({ person, date, type, minutes, km: type === 'Run' && Number(km) ? +Number(km).toFixed(2) : undefined })
    await syncLinkedGoals()
    setKm('')
    toast(`${type === 'Sport' && person === 'devi' ? 'Play' : type} logged`)
  }
  const label = (t: ActivityType) => (person === 'devi' && t === 'Sport' ? 'Play or sport' : t)
  return (
    <div className="card p-4">
      {acts.length > 0 && (
        <div className="mb-3 divide-y divide-line">
          {acts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 text-[15px]">
              <span className="flex items-center gap-2"><ActivityIcon size={15} className="text-forest" />{label(a.type)}</span>
              <span className="num flex items-center gap-1 text-sm text-muted">{a.km ? `${a.km} km · ` : ''}{a.minutes} min
                <button onClick={async () => { await db.activities.delete(a.id!); await syncLinkedGoals() }} aria-label={`Delete ${a.type}`} className="flex h-9 w-9 items-center justify-center text-faint"><Trash2 size={15} /></button>
              </span>
            </div>
          ))}
        </div>
      )}
      {disabled ? <p className="text-sm text-muted">Log activity on the day itself.</p> : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {TYPES.map((t) => <button key={t} onClick={() => setType(t)} className={`chip ${type === t ? 'chip-on' : ''}`}>{label(t)}</button>)}
          </div>
          <div className="mt-3 flex gap-2">
            <input className="input num" inputMode="numeric" aria-label="Minutes" value={min} onChange={(e) => setMin(e.target.value)} />
            {type === 'Run' && <input className="input num" inputMode="decimal" placeholder="km" aria-label="Distance in km" value={km} onChange={(e) => setKm(e.target.value)} />}
            <button onClick={add} className="btn-primary shrink-0">Add {Number(min) ? `${Math.round(Number(min))} min` : ''}</button>
          </div>
        </>
      )}
    </div>
  )
}

function Routine({ items, done, onToggle, onEdit, disabled, who }: { items: string[]; done: string[]; onToggle: (r: string) => void; onEdit: (l: string[]) => void; disabled: boolean; who: string }) {
  const [edit, setEdit] = useState<string[] | null>(null)
  return (
    <div className="card p-2">
      {items.map((r) => {
        const on = done.includes(r)
        return (
          <button key={r} disabled={disabled} onClick={() => onToggle(r)} aria-pressed={on} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left disabled:opacity-60">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-forest bg-forest text-white' : 'border-line'}`}>{on && <Check size={14} strokeWidth={3} />}</span>
            <span className={`text-[15px] ${on ? 'text-muted' : ''}`}>{r}</span>
          </button>
        )
      })}
      {!items.length && <p className="px-2 py-3 text-sm text-muted">Add the few habits that make a good day.</p>}
      <button onClick={() => setEdit(items)} className="btn-ghost w-full text-sm"><Pencil size={14} />Edit routine</button>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={`${who === 'Me' ? 'My' : `${who}'s`} routine`}>
        <div className="space-y-5">
          {edit && <ListEditor label="routine item" placeholder="Add an item, e.g. Read for 20 minutes" items={edit} onChange={setEdit} />}
          <button onClick={() => { onEdit((edit ?? []).map((x) => x.trim()).filter(Boolean)); setEdit(null) }} className="btn-primary w-full">Save routine</button>
        </div>
      </Sheet>
    </div>
  )
}
