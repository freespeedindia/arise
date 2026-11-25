import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Pill, Plus, X } from 'lucide-react'
import Sheet from '../Sheet'
import { db, type Supplement } from '../../lib/db'
import { daysOfStock, LOW_STOCK_DAYS } from '../../lib/health'
import { celebrate } from '../../lib/celebrate'

export async function toggleDose(s: Supplement, date: string, time: string) {
  const existing = await db.doses.where('[suppId+date+time]').equals([s.id!, date, time]).first()
  if (existing) {
    await db.doses.delete(existing.id!)
    await db.supplements.update(s.id!, { stock: s.stock + s.perDose })
  } else {
    await db.doses.add({ suppId: s.id!, date, time, takenAt: new Date().toISOString() })
    await db.supplements.update(s.id!, { stock: Math.max(0, s.stock - s.perDose) })
    celebrate(false)
  }
}

export default function SupplementsCard({ today }: { today: string }) {
  const sups = useLiveQuery(() => db.supplements.toArray()) ?? []
  const doses = useLiveQuery(() => db.doses.where('date').equals(today).toArray(), [today]) ?? []
  const [edit, setEdit] = useState<Supplement | null | 'new'>(null)
  const active = sups.filter((s) => s.active)
  const slots = active.flatMap((s) => s.times.map((t) => ({ s, t }))).sort((a, b) => a.t.localeCompare(b.t))
  const taken = slots.filter(({ s, t }) => doses.some((d) => d.suppId === s.id && d.time === t)).length
  const low = active.filter((s) => daysOfStock(s) <= LOW_STOCK_DAYS)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5"><Pill size={13} />Supplements</p>
        {slots.length > 0 && <p className="num text-sm font-semibold text-muted">{taken} of {slots.length} taken</p>}
      </div>
      {low.map((s) => (
        <div key={s.id} className="mt-3 flex items-center gap-2 rounded-lg bg-crimson-soft px-3 py-2 text-sm text-crimson">
          <AlertTriangle size={15} /> {s.name}: {s.stock} left, about {daysOfStock(s)} days. Reorder soon.
        </div>
      ))}
      <div className="mt-2 divide-y divide-line">
        {slots.map(({ s, t }) => {
          const done = doses.some((d) => d.suppId === s.id && d.time === t)
          return (
            <div key={`${s.id}-${t}`} className="flex items-center gap-3 py-2.5">
              <button onClick={() => toggleDose(s, today, t)} aria-label={`${done ? 'Undo' : 'Take'} ${s.name} at ${t}`}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] ${done ? 'border-forest bg-forest text-white' : 'border-line text-transparent'}`}><Check size={16} strokeWidth={2.5} /></button>
              <button onClick={() => setEdit(s)} className="flex-1 text-left">
                <p className={`text-[15px] font-medium ${done ? 'text-faint line-through' : ''}`}>{s.name}</p>
                <p className="text-xs text-muted">{s.dose} · {s.stock} left</p>
              </button>
              <span className="num text-sm text-muted">{t}</span>
            </div>
          )
        })}
      </div>
      {slots.length === 0 && <p className="mt-2 text-sm text-muted">Add your supplements and tablets to get reminders and stock alerts.</p>}
      <button onClick={() => setEdit('new')} className="btn-secondary mt-3 w-full"><Plus size={16} />Add supplement</button>
      <EditSupplement value={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function EditSupplement({ value, onClose }: { value: Supplement | null | 'new'; onClose: () => void }) {
  const s = value && value !== 'new' ? value : null
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [stock, setStock] = useState('')
  const [perDose, setPerDose] = useState('1')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!value) return
    setName(s?.name ?? ''); setDose(s?.dose ?? '1 tablet'); setTimes(s?.times ?? ['08:00'])
    setStock(s ? String(s.stock) : '30'); setPerDose(String(s?.perDose ?? 1)); setConfirm(false)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!name.trim() || !times.length) return
    const data = { name: name.trim(), dose: dose.trim() || '1 tablet', times: [...new Set(times)].sort(), stock: Number(stock) || 0, perDose: Number(perDose) || 1 }
    if (s?.id) await db.supplements.update(s.id, data)
    else await db.supplements.add({ ...data, active: true, createdAt: new Date().toISOString() })
    onClose()
  }
  const remove = async () => {
    if (!confirm) { setConfirm(true); return }
    if (s?.id) await db.supplements.update(s.id, { active: false })
    onClose()
  }
  return (
    <Sheet open={!!value} onClose={onClose} title={s ? 'Edit supplement' : 'Add supplement'}>
      <div className="space-y-5">
        <div className="grid grid-cols-[1fr_130px] gap-2">
          <div><label className="label" htmlFor="s-n">Name</label><input id="s-n" autoFocus className="input" placeholder="e.g. Vitamin D3" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label" htmlFor="s-d">Dose</label><input id="s-d" className="input" value={dose} onChange={(e) => setDose(e.target.value)} /></div>
        </div>
        <div>
          <span className="label">Times of day</span>
          <div className="flex flex-wrap gap-2">
            {times.map((t, i) => (
              <div key={i} className="flex items-center gap-1 rounded-xl border border-line pl-2">
                <input type="time" aria-label={`Time ${i + 1}`} className="bg-transparent py-2 text-base outline-none" value={t} onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))} />
                {times.length > 1 && <button onClick={() => setTimes(times.filter((_, j) => j !== i))} aria-label="Remove time" className="p-2 text-faint"><X size={14} /></button>}
              </div>
            ))}
            <button onClick={() => setTimes([...times, '20:00'])} className="chip"><Plus size={14} />Add time</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="s-s">Units in stock</label><input id="s-s" className="input num" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></div>
          <div><label className="label" htmlFor="s-p">Units per dose</label><input id="s-p" className="input num" inputMode="decimal" value={perDose} onChange={(e) => setPerDose(e.target.value)} /></div>
        </div>
        <p className="text-xs text-muted">Stock goes down each time you tick a dose. You get a warning when {LOW_STOCK_DAYS} days or less remain.</p>
        <button onClick={save} disabled={!name.trim()} className="btn-primary w-full">Save</button>
        {s && <button onClick={remove} className="btn-ghost w-full text-crimson">{confirm ? 'Tap again to remove' : 'Stop taking (remove)'}</button>}
      </div>
    </Sheet>
  )
}
