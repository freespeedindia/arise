import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Activity as ActivityIcon, Trash2 } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis } from 'recharts'
import Sheet from '../Sheet'
import { db, type ActivityType } from '../../lib/db'
import { friendlyDate, fromKey, weekStart } from '../../lib/dates'
import { lastDays, syncLinkedGoals } from '../../lib/health'
import { celebrate } from '../../lib/celebrate'

const TYPES: ActivityType[] = ['Run', 'Walk', 'Cycle', 'Gym', 'Yoga', 'Swim', 'Sport', 'Other']
export const pace = (min: number, km?: number) => {
  if (!km) return ''
  const p = min / km
  return `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, '0')} /km`
}

export default function ActivityCard({ today, openLog, setOpenLog }: { today: string; openLog: boolean; setOpenLog: (v: boolean) => void }) {
  const acts = useLiveQuery(() => db.activities.orderBy('date').reverse().limit(400).toArray()) ?? []
  const wk = weekStart(today)
  const week = acts.filter((a) => a.date >= wk && a.date <= today)
  const km = week.reduce((s, a) => s + (a.type === 'Run' ? a.km || 0 : 0), 0)
  const minutes = week.reduce((s, a) => s + a.minutes, 0)
  const days = lastDays(7, today).map((d) => ({ d: fromKey(d).toLocaleDateString(undefined, { weekday: 'narrow' }), min: acts.filter((a) => a.date === d).reduce((s, a) => s + a.minutes, 0) }))
  return (
    <div className="card p-4">
      <p className="eyebrow flex items-center gap-1.5"><ActivityIcon size={13} />Activity this week</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat label="Sessions" value={String(week.length)} />
        <Stat label="Minutes" value={String(minutes)} />
        <Stat label="Run km" value={km.toFixed(1)} />
      </div>
      <div className="mt-3 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
            <Bar dataKey="min" fill="rgb(var(--forest))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {acts.length > 0 && (
        <div className="mt-2 divide-y divide-line">
          {acts.slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span><span className="font-medium">{a.type}</span> <span className="text-muted">· {friendlyDate(a.date)}</span></span>
              <span className="num flex items-center gap-2 text-muted">{a.km ? `${a.km} km · ` : ''}{a.minutes} min{a.km ? ` · ${pace(a.minutes, a.km)}` : ''}
                <button onClick={async () => { await db.activities.delete(a.id!); await syncLinkedGoals() }} aria-label={`Delete ${a.type}`} className="p-1 text-faint"><Trash2 size={14} /></button></span>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpenLog(true)} className="btn-secondary mt-3 w-full">Log activity</button>
      <LogActivity open={openLog} onClose={() => setOpenLog(false)} today={today} />
    </div>
  )
}
const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl bg-sunken px-3 py-2"><p className="num font-serif text-xl font-semibold">{value}</p><p className="text-2xs text-muted">{label}</p></div>
)

function LogActivity({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const [type, setType] = useState<ActivityType>('Run')
  const [minutes, setMinutes] = useState('')
  const [km, setKm] = useState('')
  const [date, setDate] = useState(today)
  useEffect(() => { if (open) { setMinutes(''); setKm(''); setDate(today) } }, [open, today])
  const distance = type === 'Run' || type === 'Walk' || type === 'Cycle' || type === 'Swim'
  const save = async () => {
    if (!Number(minutes)) return
    await db.activities.add({ date, type, minutes: Math.round(Number(minutes)), km: distance && Number(km) ? +Number(km).toFixed(2) : undefined })
    await syncLinkedGoals()
    celebrate(false, `${type} logged`)
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Log activity">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => <button key={t} onClick={() => setType(t)} className={`chip ${type === t ? 'chip-on' : ''}`}>{t}</button>)}
        </div>
        <div className={`grid gap-2 ${distance ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div><label className="label" htmlFor="a-m">Minutes</label><input id="a-m" autoFocus className="input num" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></div>
          {distance && <div><label className="label" htmlFor="a-k">Distance km</label><input id="a-k" className="input num" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} /></div>}
          <div><label className="label" htmlFor="a-d">Date</label><input id="a-d" type="date" className="input" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        {distance && Number(km) > 0 && Number(minutes) > 0 && <p className="num text-sm text-muted">Pace {pace(Number(minutes), Number(km))}</p>}
        <button onClick={save} disabled={!Number(minutes)} className="btn-primary w-full">Save</button>
      </div>
    </Sheet>
  )
}
