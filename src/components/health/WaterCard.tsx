import { useLiveQuery } from 'dexie-react-hooks'
import { Droplet, Undo2 } from 'lucide-react'
import { db } from '../../lib/db'
import Ring from '../Ring'
import type { Settings } from '../../lib/settings'
import { celebrate } from '../../lib/celebrate'

export async function addWater(date: string, ml: number, target: number) {
  const before = (await db.water.where('date').equals(date).toArray()).reduce((s, w) => s + w.ml, 0)
  await db.water.add({ date, ml, at: new Date().toISOString() })
  if (before < target && before + ml >= target) celebrate(true, 'Water target reached')
}

export default function WaterCard({ s, today }: { s: Settings; today: string }) {
  const entries = useLiveQuery(() => db.water.where('date').equals(today).toArray(), [today]) ?? []
  const total = entries.reduce((a, w) => a + w.ml, 0)
  const pct = Math.round((total / s.waterTargetMl) * 100)
  const undo = async () => {
    const last = [...entries].sort((a, b) => b.at.localeCompare(a.at))[0]
    if (last?.id) await db.water.delete(last.id)
  }
  return (
    <div className="card p-4">
      <div className="flex items-center gap-4">
        <Ring pct={pct} size={76} stroke={6} color="rgb(var(--water))">
          <Droplet size={20} strokeWidth={1.75} className="text-water" />
        </Ring>
        <div className="flex-1">
          <p className="eyebrow">Water</p>
          <p className="num mt-1 font-display text-[26px] font-medium leading-none">{(total / 1000).toFixed(2)}<span className="ml-1 font-sans text-sm font-medium text-muted">of {(s.waterTargetMl / 1000).toFixed(1)} L</span></p>
          <p className="mt-1 text-xs text-muted">{total >= s.waterTargetMl ? 'Target reached' : `${Math.ceil((s.waterTargetMl - total) / 250)} glasses to go`}</p>
        </div>
        {entries.length > 0 && <button onClick={undo} aria-label="Undo last water entry" className="flex h-10 w-10 items-center justify-center rounded-full text-faint"><Undo2 size={18} /></button>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[250, 500, 1000].map((ml) => (
          <button key={ml} onClick={() => addWater(today, ml, s.waterTargetMl)} className="btn whitespace-nowrap px-2 bg-water-soft text-water">
            + {ml >= 1000 ? `${ml / 1000} L` : `${ml} ml`}
          </button>
        ))}
      </div>
    </div>
  )
}
