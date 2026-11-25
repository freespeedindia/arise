import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'
import { useState } from 'react'

/** Edit a list of names: add, rename, reorder, remove. */
export default function ListEditor({ items, onChange, placeholder, label }: {
  items: string[]; onChange: (v: string[]) => void; placeholder: string; label: string
}) {
  const [add, setAdd] = useState('')
  const push = () => {
    const v = add.trim()
    if (!v || items.some((i) => i.toLowerCase() === v.toLowerCase())) return
    onChange([...items, v]); setAdd('')
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const n = [...items];[n[i], n[j]] = [n[j], n[i]]; onChange(n)
  }
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1 rounded-xl bg-sunken pl-3">
          <input className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none" aria-label={`${label} ${i + 1}`} value={it}
            onChange={(e) => onChange(items.map((x, k) => (k === i ? e.target.value : x)))}
            onBlur={(e) => { if (!e.target.value.trim()) onChange(items.filter((_, k) => k !== i)) }} />
          <button onClick={() => move(i, -1)} aria-label="Move up" className="p-2 text-faint"><ChevronUp size={16} /></button>
          <button onClick={() => move(i, 1)} aria-label="Move down" className="p-2 text-faint"><ChevronDown size={16} /></button>
          <button onClick={() => onChange(items.filter((_, k) => k !== i))} aria-label={`Remove ${it}`} className="p-2 pr-3 text-faint"><X size={16} /></button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input className="input py-2.5" placeholder={placeholder} aria-label={placeholder} value={add} onChange={(e) => setAdd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && push()} />
        <button onClick={push} aria-label={`Add ${label}`} className="btn-secondary px-4"><Plus size={18} /></button>
      </div>
    </div>
  )
}
