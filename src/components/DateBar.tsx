import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, fromKey } from '../lib/dates'

/** Move between days: plan tomorrow, or look back at earlier days. */
export default function DateBar({ date, today, onChange, className = '' }: { date: string; today: string; onChange: (d: string) => void; className?: string }) {
  const diff = Math.round((fromKey(date).getTime() - fromKey(today).getTime()) / 86400000)
  const rel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : fromKey(date).toLocaleDateString('en-IN', { weekday: 'long' })
  const full = fromKey(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
  return (
    <div className={`flex items-center gap-1 rounded-2xl bg-surface p-1 ${className}`}>
      <button onClick={() => onChange(addDays(date, -1))} aria-label="Previous day" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted"><ChevronLeft size={18} /></button>
      <label className="relative flex min-h-[40px] flex-1 cursor-pointer flex-col items-center justify-center text-center">
        <span className="text-sm font-semibold">{rel}</span>
        <span className="text-2xs text-muted">{full}</span>
        <input type="date" aria-label="Pick a date" value={date} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 opacity-0" />
      </label>
      {diff !== 0 && <button onClick={() => onChange(today)} className="rounded-xl px-3 py-2 text-xs font-semibold text-saffron">Today</button>}
      <button onClick={() => onChange(addDays(date, 1))} aria-label="Next day" className="flex h-10 w-10 items-center justify-center rounded-xl text-muted"><ChevronRight size={18} /></button>
    </div>
  )
}
