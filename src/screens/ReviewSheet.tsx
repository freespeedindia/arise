import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react'
import Sheet from '../components/Sheet'
import { db, type Review } from '../lib/db'
import { addDays, fromKey, monthKey, prevMonthKey, weekStart } from '../lib/dates'
import { loadAll, rangeFor, saveReview } from '../lib/report'
import { dayReport, healthVerdict, periodPattern } from '../lib/day'
import { nowHHMM } from '../lib/reminders'
import { money } from '../lib/money'
import type { Settings } from '../lib/settings'
import { celebrate } from '../lib/celebrate'
import { openExport } from './ExportSheet'

type Kind = Review['kind']
const TITLES: Record<Kind, string> = { daily: 'Day', weekly: 'Week', monthly: 'Month' }
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

export default function ReviewSheet({ open, onClose, s, today, date: viewDate, kind: initialKind }: { open: boolean; onClose: () => void; s: Settings; today: string; date: string; kind: Kind }) {
  const start = (k: Kind) => (k === 'daily' ? (viewDate <= today ? viewDate : today) : defaultDate(k, today))
  const [kind, setKind] = useState<Kind>(initialKind)
  const [date, setDate] = useState(start(initialKind))
  const data = useLiveQuery(loadAll)
  const existing = useLiveQuery(() => db.reviews.where('[kind+date]').equals([kind, date]).first(), [kind, date])
  const [wins, setWins] = useState('')
  const [improve, setImprove] = useState('')
  const [next, setNext] = useState(['', '', ''])
  const [energy, setEnergy] = useState<number | undefined>()

  useEffect(() => { if (open) { setKind(initialKind); setDate(start(initialKind)) } }, [open, initialKind, today, viewDate]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setWins(existing?.wins ?? ''); setImprove(existing?.improve ?? '')
    setNext([0, 1, 2].map((i) => existing?.tomorrow[i] ?? '')); setEnergy(existing?.energy)
  }, [existing, kind, date])

  const pick = (k: Kind) => { setKind(k); setDate(start(k)) }
  const [from, to] = rangeFor(kind, date)
  const day = data && kind === 'daily' ? dayReport(data, s, date, today, nowHHMM()) : null
  const pat = data && kind !== 'daily' ? periodPattern(data, s, from, to, today) : null
  const canNext = shift(kind, date, 1) <= today
  const cur = s.currency
  const label = kind === 'daily' ? (date === today ? 'Today' : fmt(date)) : kind === 'weekly' ? `${fmt(from)} – ${fmt(to)}` : fromKey(from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const save = async () => {
    const n = await saveReview({ kind, date, wins: wins.trim(), improve: improve.trim(), tomorrow: next.map((x) => x.trim()).filter(Boolean), energy }, existing)
    celebrate(true, n ? `Review saved. ${n} Red task${n === 1 ? '' : 's'} added.` : 'Review saved')
    onClose()
  }
  const share = () => { onClose(); setTimeout(() => openExport({ from, to, title: `${TITLES[kind]} report` }), 250) }
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

        {day && <DayQuestions r={day} />}
        {pat && <Pattern p={pat} kind={kind} />}

        <div>
          <label className="label" htmlFor="rv-wins">What went well (optional)</label>
          <textarea id="rv-wins" rows={2} className="input resize-none" placeholder={kind === 'daily' ? 'One or two wins, however small' : 'Wins this period'} value={wins} onChange={(e) => setWins(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="rv-improve">What to change (optional)</label>
          <textarea id="rv-improve" rows={2} className="input resize-none" placeholder="One honest lesson" value={improve} onChange={(e) => setImprove(e.target.value)} />
        </div>
        <div>
          <span className="label">{kind === 'daily' ? "Tomorrow's critical tasks" : kind === 'weekly' ? 'Critical tasks for next week' : 'Critical tasks for next month'}</span>
          <div className="space-y-2">
            {next.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="num w-5 text-center text-sm font-semibold text-saffron">{i + 1}</span>
                <input className="input py-2.5" aria-label={`Priority ${i + 1}`} placeholder={i === 0 ? 'The most important thing' : 'Optional'} value={v} onChange={(e) => setNext(next.map((x, k) => (k === i ? e.target.value : x)))} />
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">These become Red tasks{kind === 'daily' ? ' for tomorrow' : ''}.</p>
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

const ANS = { yes: { t: 'Yes', c: 'bg-forest-soft text-forest' }, partly: { t: 'Partly', c: 'bg-saffron-soft text-saffron-deep' }, no: { t: 'No', c: 'bg-crimson-soft text-crimson' }, na: { t: 'No data', c: 'bg-sunken text-muted' } } as const
type Ans = keyof typeof ANS

function DayQuestions({ r }: { r: ReturnType<typeof dayReport> }) {
  const hv = healthVerdict(r.me.pct)
  const m = r.money
  const qs: [string, Ans, string][] = [
    ['Did I follow my planned health routine?', hv === 'good' ? 'yes' : hv === 'mixed' ? 'partly' : hv === 'off' ? 'no' : 'na',
      [r.me.planned ? `${r.me.followed} of ${r.me.planned} meals as planned` : 'no meal plan', r.me.exercised ? `${r.me.exerciseMin} min exercise` : 'no exercise', r.me.routineTotal ? `routine ${r.me.routineDone}/${r.me.routineTotal}` : ''].filter(Boolean).join(', ')],
    ['Did I stay within my spending discipline?', m.verdict === 'good' ? 'yes' : m.verdict === 'mixed' ? 'partly' : m.verdict === 'off' ? 'no' : 'na',
      m.month.budget ? `${money(m.spentToday)} today${m.wantsToday ? ` (${money(m.wantsToday)} wants)` : ''}. ${money(m.month.spent)} of ${money(m.month.budget)} this month.` : `${money(m.spentToday)} today. Set a monthly budget to judge this.`],
    ['Did I complete my critical tasks?', !r.rag[1].total ? 'na' : r.rag[1].done === r.rag[1].total ? 'yes' : r.rag[1].done ? 'partly' : 'no',
      r.rag[1].total ? `${r.rag[1].done} of ${r.rag[1].total} Red tasks done. ${r.rag.done} of ${r.rag.total} overall.` : 'No Red tasks were planned.'],
    ['Did I take a meaningful step towards my goals?', !r.goals.length ? 'na' : r.forward.length ? 'yes' : 'no',
      r.forward.length ? r.forward.map((g) => `${g.goal.title}: ${g.why.toLowerCase()}`).join('. ') : r.goals.length ? 'No linked to-do, milestone, meal plan or budget step recorded.' : 'No active goals yet.'],
  ]
  return (
    <div className="space-y-2">
      {qs.map(([q, a, why], i) => (
        <div key={i} className="rounded-2xl bg-sunken px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[15px] font-medium">{q}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ANS[a].c}`}>{ANS[a].t}</span>
          </div>
          <p className="mt-1 text-sm text-muted">{why}</p>
        </div>
      ))}
    </div>
  )
}

function Pattern({ p, kind }: { p: ReturnType<typeof periodPattern>; kind: Kind }) {
  const pc = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
  const top = Object.entries(p.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3)
  const cells: [string, string][] = [
    ['Moving forward', `${p.forward} days`], ['On track', `${p.onTrack} days`], ['Drifting', `${p.drifting} days`],
    ['Health average', p.healthAvg != null ? `${p.healthAvg}%` : '—'], ['Meals followed', p.mealsPlanned ? `${p.mealsFollowed}/${p.mealsPlanned}` : '—'], ['Exercise', `${p.exDays} of ${p.n} days`],
    ['Red tasks done', pc(p.red.done, p.red.total)], ['All tasks done', pc(p.all.done, p.all.total)], ['Goal steps', `${p.goalSteps} of ${p.n} days`],
    ['Money in', money(p.income, '₹', { compact: true })], ['Needs', money(p.needs, '₹', { compact: true })], ['Wants', money(p.wants, '₹', { compact: true })],
  ]
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-line">
        {cells.map(([k, v]) => (
          <div key={k} className="bg-surface px-3 py-2.5">
            <p className="text-2xs uppercase tracking-[0.08em] text-muted">{k}</p>
            <p className="num mt-0.5 text-sm font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-sunken px-4 py-3 text-sm">
        <p><span className="font-semibold">Spent {money(p.spent)}</span>{kind === 'monthly' && p.month?.budget ? ` of ${money(p.month.budget)} budget` : ''}.</p>
        {top.length > 0 && <p className="mt-0.5 text-muted">Most spent on {top.map(([c, v]) => `${c} (${money(v, '₹', { compact: true })})`).join(', ')}.</p>}
        {kind === 'monthly' && p.month && p.month.over > 0 && <p className="mt-1 text-crimson">Overspent by {money(p.month.over)}, mostly {p.month.culprits.join(', ')}. Carry {money(p.month.over)} forward as a cut to next month's wants.</p>}
        {kind === 'monthly' && p.month && p.month.budget > 0 && !p.month.over && <p className="mt-1 text-forest">Within budget, {money(p.month.budget - p.month.spent)} to spare.</p>}
      </div>
      {p.missedRed.length > 0 && (
        <div className="rounded-2xl bg-crimson-soft px-4 py-3 text-sm text-crimson">
          <p className="font-semibold">Missed critical tasks</p>
          <p className="mt-0.5">{p.missedRed.slice(0, 5).join(', ')}{p.missedRed.length > 5 ? ` and ${p.missedRed.length - 5} more` : ''}</p>
        </div>
      )}
    </div>
  )
}
