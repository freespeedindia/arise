import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Scale, Settings2 } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Sheet from '../Sheet'
import { db } from '../../lib/db'
import { addDays, daysBetween, friendlyDate, fromKey } from '../../lib/dates'
import { bmi, latestWeight, plannedWeight, syncLinkedGoals, upsertWeightGoal, weeklyChange, weightStatus } from '../../lib/health'
import { setSettings, type Settings } from '../../lib/settings'
import { celebrate } from '../../lib/celebrate'

const fmtDate = (k: string) => fromKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export default function WeightCard({ s, today, openLog, setOpenLog }: { s: Settings; today: string; openLog: boolean; setOpenLog: (v: boolean) => void }) {
  const weights = useLiveQuery(() => db.weights.orderBy('date').toArray()) ?? []
  const [planOpen, setPlanOpen] = useState(false)
  const latest = latestWeight(weights)
  const status = weightStatus(s, latest)
  const plan = plannedWeight(s, today)
  const weekly = weeklyChange(s)
  const hasPlan = plan != null

  // Chart: from plan start (or first entry) to today, with the plan line to the end date
  const from = s.planStart ?? weights[0]?.date ?? addDays(today, -30)
  const to = hasPlan && s.planEnd ? s.planEnd : today
  const span = Math.max(1, daysBetween(from, to))
  const step = Math.max(1, Math.ceil(span / 60))
  const byDate = new Map(weights.map((w) => [w.date, w.kg]))
  const data: { date: string; actual?: number; plan?: number }[] = []
  for (let i = 0; i <= span; i += step) {
    const d = addDays(from, i)
    // include the nearest logged weight inside this step
    let actual: number | undefined
    for (let j = 0; j < step; j++) { const v = byDate.get(addDays(d, j)); if (v != null) actual = v }
    data.push({ date: d, actual, plan: plannedWeight(s, d) })
  }
  const statusText = { ahead: 'Ahead of plan', on: 'On plan', behind: 'Behind plan' } as const
  const statusTone = { ahead: 'text-forest', on: 'text-gold', behind: 'text-crimson' } as const

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Scale size={13} />Weight</p>
          <p className="num mt-1 font-serif text-[32px] font-semibold leading-none">{latest ? latest.kg.toFixed(1) : '—'}<span className="ml-1 font-sans text-base font-medium text-muted">kg</span></p>
          <p className="mt-1.5 text-xs text-muted">
            {latest ? `Logged ${friendlyDate(latest.date).toLowerCase()}` : 'No entries yet'}
            {bmi(latest?.kg, s.heightCm) ? ` · BMI ${bmi(latest?.kg, s.heightCm)}` : ''}
          </p>
        </div>
        <div className="text-right">
          {hasPlan ? (
            <>
              <p className="eyebrow">Plan today</p>
              <p className="num mt-1 text-lg font-semibold">{plan!.toFixed(1)} kg</p>
              {status && <p className={`text-xs font-semibold ${statusTone[status]}`}>{statusText[status]}</p>}
            </>
          ) : <button onClick={() => setPlanOpen(true)} className="btn-secondary py-2 text-sm">Set a plan</button>}
        </div>
      </div>

      {hasPlan && (
        <p className="num mt-3 rounded-lg bg-sunken px-3 py-2 text-xs text-muted">
          {s.startWeight} → <b className="text-ink">{s.targetWeight} kg</b> by {fmtDate(s.planEnd!)} · {weekly! > 0 ? '+' : ''}{weekly} kg per week
        </p>
      )}

      {(weights.length > 0 || hasPlan) && (
        <div className="-ml-3 mt-3 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => Math.round(v).toString()} />
              <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v: number, n) => [`${v} kg`, n === 'plan' ? 'Plan' : 'Actual']}
                contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 10, fontSize: 12 }} />
              <Line dataKey="plan" stroke="rgb(var(--gold))" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line dataKey="actual" stroke="rgb(var(--forest))" strokeWidth={2} dot={{ r: 2.5, fill: 'rgb(var(--forest))' }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button onClick={() => setOpenLog(true)} className="btn-primary">Log weight</button>
        <button onClick={() => setPlanOpen(true)} aria-label="Weight plan settings" className="btn-secondary px-3.5"><Settings2 size={18} /></button>
      </div>

      <LogWeight open={openLog} onClose={() => setOpenLog(false)} today={today} last={latest?.kg} />
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} s={s} today={today} last={latest?.kg} />
    </div>
  )
}

function LogWeight({ open, onClose, today, last }: { open: boolean; onClose: () => void; today: string; last?: number }) {
  const [kg, setKg] = useState('')
  const [date, setDate] = useState(today)
  const save = async () => {
    const v = Number(kg)
    if (!v || v < 20 || v > 400) return
    await db.weights.put({ date, kg: +v.toFixed(2) })
    await syncLinkedGoals()
    celebrate(false, 'Weight saved')
    setKg('')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Log weight">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="w-kg">Weight (kg)</label>
            <input id="w-kg" autoFocus className="input num text-xl" inputMode="decimal" placeholder={last ? last.toFixed(1) : '75.0'} value={kg} onChange={(e) => setKg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </div>
          <div>
            <label className="label" htmlFor="w-date">Date</label>
            <input id="w-date" type="date" className="input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted">Weigh at the same time each day, ideally in the morning. One entry per day; a new entry replaces that day's value.</p>
        <button onClick={save} className="btn-primary w-full">Save</button>
      </div>
    </Sheet>
  )
}

function PlanSheet({ open, onClose, s, today, last }: { open: boolean; onClose: () => void; s: Settings; today: string; last?: number }) {
  const [start, setStart] = useState('')
  const [target, setTarget] = useState('')
  const [end, setEnd] = useState('')
  const [height, setHeight] = useState('')
  const [cal, setCal] = useState('')
  const [water, setWater] = useState('')
  const init = () => {
    setStart(String(s.startWeight ?? last ?? ''))
    setTarget(String(s.targetWeight ?? ''))
    setEnd(s.planEnd ?? addDays(today, 84))
    setHeight(String(s.heightCm ?? ''))
    setCal(String(s.calorieTarget))
    setWater(String(s.waterTargetMl / 1000))
  }
  useEffect(() => { if (open) init() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const weeks = start && target && end ? Math.max(1, daysBetween(today, end) / 7) : 0
  const perWeek = weeks ? (Number(target) - Number(start)) / weeks : 0
  const save = async () => {
    const values: Partial<Settings> = {
      heightCm: height ? Number(height) : undefined,
      calorieTarget: Number(cal) || 2000,
      waterTargetMl: Math.round((Number(water) || 3) * 1000),
    }
    if (start && target && end) Object.assign(values, { startWeight: Number(start), targetWeight: Number(target), planStart: s.planStart && s.startWeight === Number(start) ? s.planStart : today, planEnd: end })
    await setSettings(values)
    if (values.startWeight != null) await upsertWeightGoal({ ...s, ...values })
    celebrate(false, 'Health plan saved')
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Health plan">
      <div className="space-y-5">
        <div>
          <span className="label">Weight plan</span>
          <div className="grid grid-cols-3 gap-2">
            <input className="input num" inputMode="decimal" placeholder="Now" aria-label="Starting weight" value={start} onChange={(e) => setStart(e.target.value)} />
            <input className="input num" inputMode="decimal" placeholder="Target" aria-label="Target weight" value={target} onChange={(e) => setTarget(e.target.value)} />
            <input className="input" type="date" aria-label="Target date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          {weeks > 0 && Number.isFinite(perWeek) && (
            <p className={`num mt-1.5 text-xs ${Math.abs(perWeek) > 1 ? 'font-semibold text-crimson' : 'text-muted'}`}>
              {perWeek > 0 ? '+' : ''}{perWeek.toFixed(2)} kg per week over {Math.round(weeks)} weeks.{Math.abs(perWeek) > 1 ? ' That is faster than the usual safe pace of about 0.5–1 kg a week.' : ''}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">Creates a Health goal that updates each time you log your weight.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="label" htmlFor="p-h">Height cm</label><input id="p-h" className="input num" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
          <div><label className="label" htmlFor="p-c">Calories / day</label><input id="p-c" className="input num" inputMode="numeric" value={cal} onChange={(e) => setCal(e.target.value)} /></div>
          <div><label className="label" htmlFor="p-w">Water L / day</label><input id="p-w" className="input num" inputMode="decimal" value={water} onChange={(e) => setWater(e.target.value)} /></div>
        </div>
        <button onClick={save} className="btn-primary w-full">Save plan</button>
      </div>
    </Sheet>
  )
}
