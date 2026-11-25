import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import Sheet from '../components/Sheet'
import { db, type Review } from '../lib/db'
import { addDays, fromKey, monthKey, prevMonthKey, weekStart } from '../lib/dates'
import { loadAll, periodSummary, rangeFor, saveReview } from '../lib/report'
import { money } from '../lib/money'
import type { Settings } from '../lib/settings'
import { celebrate } from '../lib/celebrate'
import { openExport } from './ExportSheet'

type Kind = Review['kind']
const TITLES: Record<Kind, string> = { daily: 'Evening', weekly: 'Week', monthly: 'Month' }
const ENERGY = ['Drained', 'Low', 'Steady', 'Good', 'Excellent']
const fmt = (k: string) => fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export function defaultDate(kind: Kind, today: string) {
  if (kind === 'daily') return today
  if (kind === 'weekly') return weekStart(today)
  return Number(today.slice(8, 10)) <= 5 ? `${prevMonthKey(monthKey(today))}-01` : `${monthKey(today)}-01`
}
const shift = (kind: Kind, date: string, dir: number) =>
  kind === 'daily' ? addDays(date, dir) : kind === 'weekly' ? addDays(date, 7 * dir)
    : dir < 0 ? `${prevMonthKey(monthKey(date))}-01` : `${monthKey(addDays(`${monthKey(date)}-28`, 7))}-01`

export default function ReviewSheet({ open, onClose, s, today, kind: initialKind }: { open: boolean; onClose: () => void; s: Settings; today: string; kind: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind)
  const [date, setDate] = useState(defaultDate(initialKind, today))
  const data = useLiveQuery(loadAll)
  const existing = useLiveQuery(() => db.reviews.where('[kind+date]').equals([kind, date]).first(), [kind, date])
  const [wins, setWins] = useState('')
  const [improve, setImprove] = useState('')
  const [next, setNext] = useState(['', '', ''])
  const [energy, setEnergy] = useState<number | undefined>()

  useEffect(() => { if (open) { setKind(initialKind); setDate(defaultDate(initialKind, today)) } }, [open, initialKind, today])
  useEffect(() => {
    setWins(existing?.wins ?? ''); setImprove(existing?.improve ?? '')
    setNext([0, 1, 2].map((i) => existing?.tomorrow[i] ?? '')); setEnergy(existing?.energy)
  }, [existing, kind, date])

  const pick = (k: Kind) => { setKind(k); setDate(defaultDate(k, today)) }
  const [from, to] = rangeFor(kind, date)
  const sum = data ? periodSummary(data, from, to) : null
  const canNext = shift(kind, date, 1) <= today
  const cur = s.currency
  const label = kind === 'daily' ? (date === today ? 'Today' : fmt(date)) : kind === 'weekly' ? `${fmt(from)} – ${fmt(to)}` : fromKey(from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const save = async () => {
    const n = await saveReview({ kind, date, wins: wins.trim(), improve: improve.trim(), tomorrow: next.map((x) => x.trim()).filter(Boolean), energy }, existing)
    celebrate(true, n ? `Review saved. ${n} priorit${n === 1 ? 'y' : 'ies'} added to your tasks.` : 'Review saved')
    onClose()
  }
  const share = () => { onClose(); setTimeout(() => openExport({ from, to, title: `${TITLES[kind]} report` }), 250) }
  const stats: [string, string][] = sum ? [
    ['Tasks done', String(sum.tasksDone)],
    ['Focus', sum.focusMin >= 60 ? `${Math.floor(sum.focusMin / 60)}h ${sum.focusMin % 60}m` : `${sum.focusMin}m`],
    ['Workouts', String(sum.workouts)],
    [kind === 'daily' ? 'Water' : 'Water / day', `${sum.waterAvgL} L`],
    [kind === 'daily' ? 'Calories' : 'Calories / day', sum.kcalAvg ? sum.kcalAvg.toLocaleString('en-IN') : '—'],
    ['Supplements', sum.adherence != null ? `${sum.adherence}%` : '—'],
    ['Spent', money(sum.spent, cur, { compact: true })],
    [kind === 'daily' ? 'Earned' : 'Saved', kind === 'daily' ? money(sum.income, cur, { compact: true }) : `${money(sum.saved, cur, { compact: true })}${sum.income ? ` · ${sum.rate}%` : ''}`],
    ['Weight', sum.weightEnd != null ? `${sum.weightEnd.toFixed(1)} kg${sum.weightStart != null && kind !== 'daily' ? ` (${sum.weightEnd - sum.weightStart > 0 ? '+' : ''}${(sum.weightEnd - sum.weightStart).toFixed(1)})` : ''}` : '—'],
  ] : []
  if (sum && kind !== 'daily' && sum.netWorthChange != null) stats.push(['Net worth', money(sum.netWorthChange, cur, { sign: true, compact: true })])
  if (sum && kind !== 'daily' && sum.runKm) stats.push(['Run distance', `${sum.runKm} km`])
  while (stats.length % 3) stats.push(['', ''])

  return (
    <Sheet open={open} onClose={onClose} title="Review">
      <div className="space-y-5">
        <div className="seg grid-cols-3">
          {(['daily', 'weekly', 'monthly'] as const).map((k) => (
            <button key={k} onClick={() => pick(k)} className={`seg-item ${kind === k ? 'seg-item-on' : ''}`}>{TITLES[k]}</button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setDate(shift(kind, date, -1))} aria-label="Earlier" className="p-2 text-muted"><ChevronLeft size={18} /></button>
          <p className="text-sm font-semibold">{label}{existing ? <span className="ml-2 text-xs font-medium text-forest">Saved</span> : null}</p>
          <button onClick={() => canNext && setDate(shift(kind, date, 1))} disabled={!canNext} aria-label="Later" className="p-2 text-muted disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-surface px-3 py-2.5">
              <p className="text-2xs uppercase tracking-[0.08em] text-muted">{k}</p>
              <p className="num mt-0.5 text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
        {sum && kind !== 'daily' && Object.keys(sum.byCat).length > 0 && (
          <p className="text-xs text-muted">Most spent on {Object.entries(sum.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${c} (${money(v, cur, { compact: true })})`).join(', ')}.</p>
        )}

        {kind === 'daily' && (
          <div>
            <span className="label">Energy today</span>
            <div className="grid grid-cols-5 gap-1.5">
              {ENERGY.map((e, i) => (
                <button key={e} onClick={() => setEnergy(energy === i + 1 ? undefined : i + 1)} className={`rounded-lg border py-2 text-2xs font-semibold ${energy === i + 1 ? 'border-saffron bg-saffron-soft text-saffron-deep' : 'border-line text-muted'}`}>{e}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="rv-wins">What went well</label>
          <textarea id="rv-wins" rows={2} className="input resize-none" placeholder={kind === 'daily' ? 'One or two wins, however small' : 'Wins this period'} value={wins} onChange={(e) => setWins(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="rv-improve">What to do better</label>
          <textarea id="rv-improve" rows={2} className="input resize-none" placeholder="One honest lesson" value={improve} onChange={(e) => setImprove(e.target.value)} />
        </div>
        <div>
          <span className="label">{kind === 'daily' ? "Tomorrow's top three" : kind === 'weekly' ? 'Top three for next week' : 'Top three for next month'}</span>
          <div className="space-y-2">
            {next.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="num w-5 text-center text-sm font-semibold text-saffron">{i + 1}</span>
                <input className="input py-2.5" aria-label={`Priority ${i + 1}`} placeholder={i === 0 ? 'The most important thing' : 'Optional'} value={v} onChange={(e) => setNext(next.map((x, k) => (k === i ? e.target.value : x)))} />
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">These become high priority tasks{kind === 'daily' ? ' for tomorrow' : ''}.</p>
        </div>
        <button onClick={save} className="btn-primary w-full">{existing ? 'Update review' : 'Save review'}</button>
        {kind !== 'daily' && (
          <button onClick={share} className="btn-secondary w-full"><Share2 size={16} />Share {TITLES[kind].toLowerCase()} report</button>
        )}
        <PastReviews kind={kind} onPick={(d) => setDate(d)} current={date} />
      </div>
    </Sheet>
  )
}

function PastReviews({ kind, onPick, current }: { kind: Kind; onPick: (d: string) => void; current: string }) {
  const list = useLiveQuery(() => db.reviews.where('kind').equals(kind).reverse().sortBy('date'), [kind]) ?? []
  if (!list.length) return null
  return (
    <div>
      <span className="label">Past reviews</span>
      <div className="divide-y divide-line rounded-xl border border-line">
        {list.slice(0, 8).map((r) => (
          <button key={r.id} onClick={() => onPick(r.date)} className={`block w-full px-4 py-2.5 text-left ${r.date === current ? 'bg-sunken' : ''}`}>
            <p className="text-xs font-semibold">{fmt(r.date)}{r.energy ? ` · ${ENERGY[r.energy - 1]}` : ''}</p>
            {r.wins && <p className="truncate text-sm text-muted">{r.wins}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}
