import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { Flame, Trash2 } from 'lucide-react'
import Sheet from '../Sheet'
import { db, type Meal } from '../../lib/db'
import type { Settings } from '../../lib/settings'

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const defaultMeal = (): Meal => { const h = new Date().getHours(); return h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 18 ? 'Snack' : 'Dinner' }

export default function FoodCard({ s, today, openAdd, setOpenAdd }: { s: Settings; today: string; openAdd: boolean; setOpenAdd: (v: boolean) => void }) {
  const entries = useLiveQuery(() => db.food.where('date').equals(today).toArray(), [today]) ?? []
  const total = entries.reduce((a, f) => a + f.kcal, 0)
  const pct = Math.min(100, (total / s.calorieTarget) * 100)
  const over = total > s.calorieTarget
  return (
    <div className="card p-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Flame size={13} />Calories</p>
          <p className="num mt-1 font-serif text-[26px] font-semibold leading-none">{total.toLocaleString()}<span className="ml-1 font-sans text-sm font-medium text-muted">of {s.calorieTarget.toLocaleString()} kcal</span></p>
        </div>
        <p className={`num text-sm font-semibold ${over ? 'text-crimson' : 'text-forest'}`}>{over ? `${(total - s.calorieTarget).toLocaleString()} over` : `${(s.calorieTarget - total).toLocaleString()} left`}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
        <div className={`h-full rounded-full ${over ? 'bg-crimson' : 'bg-forest'}`} style={{ width: `${pct}%` }} />
      </div>
      {entries.length > 0 && (
        <div className="mt-3 divide-y divide-line">
          {MEALS.filter((m) => entries.some((e) => e.meal === m)).map((m) => (
            <div key={m} className="py-2">
              <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">{m}</p>
              {entries.filter((e) => e.meal === m).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-1 text-sm">
                  <span>{e.name}</span>
                  <span className="flex items-center gap-2"><span className="num text-muted">{e.kcal}</span>
                    <button onClick={() => db.food.delete(e.id!)} aria-label={`Delete ${e.name}`} className="p-1 text-faint"><Trash2 size={14} /></button></span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={() => setOpenAdd(true)} className="btn-secondary mt-3 w-full">Add food</button>
      <AddFood open={openAdd} onClose={() => setOpenAdd(false)} today={today} />
    </div>
  )
}

function AddFood({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const [name, setName] = useState('')
  const [kcal, setKcal] = useState('')
  const [meal, setMeal] = useState<Meal>(defaultMeal)
  const all = useLiveQuery(() => db.food.orderBy('id').reverse().limit(200).toArray()) ?? []
  const recent = useMemo(() => {
    const seen = new Map<string, number>()
    all.forEach((f) => { if (!seen.has(f.name)) seen.set(f.name, f.kcal) })
    return [...seen.entries()].slice(0, 10)
  }, [all])
  useEffect(() => { if (open) { setName(''); setKcal(''); setMeal(defaultMeal()) } }, [open])
  const save = async (n = name, k = kcal) => {
    if (!n.trim() || !Number(k)) return
    await db.food.add({ date: today, name: n.trim(), kcal: Math.round(Number(k)), meal, at: new Date().toISOString() })
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Add food">
      <div className="space-y-5">
        <div className="seg grid-cols-4">
          {MEALS.map((m) => <button key={m} onClick={() => setMeal(m)} className={`seg-item ${meal === m ? 'seg-item-on' : ''}`}>{m}</button>)}
        </div>
        {recent.length > 0 && (
          <div>
            <span className="label">Recent — tap to add</span>
            <div className="flex flex-wrap gap-2">
              {recent.map(([n, k]) => <button key={n} onClick={() => save(n, String(k))} className="chip">{n} <span className="num text-faint">{k}</span></button>)}
            </div>
          </div>
        )}
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <div><label className="label" htmlFor="f-n">Food</label><input id="f-n" autoFocus className="input" placeholder="e.g. 2 idli with sambar" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label" htmlFor="f-k">kcal</label><input id="f-k" className="input num" inputMode="numeric" placeholder="250" value={kcal} onChange={(e) => setKcal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></div>
        </div>
        <button onClick={() => save()} disabled={!name.trim() || !Number(kcal)} className="btn-primary w-full">Add</button>
      </div>
    </Sheet>
  )
}
