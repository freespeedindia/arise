import { useState } from 'react'
import { AlertTriangle, ArrowRight, Bell, HeartPulse, ListChecks, NotebookPen, RefreshCw, Settings as Cog, Target, Timer, Wallet, Check } from 'lucide-react'
import { MEAL_SLOTS } from '../lib/db'
import { greeting } from '../lib/dates'
import { daysOfStock, LOW_STOCK_DAYS } from '../lib/health'
import { nowHHMM, type ScheduledReminder } from '../lib/reminders'
import type { Settings } from '../lib/settings'
import { QUOTES, quoteOfTheDay } from '../data/quotes'
import type { Tab } from '../components/BottomNav'
import type { HealthAction } from './Health'
import type { MoneyAction } from './Money'
import { mmss, type FocusState } from '../lib/focus'
import { money } from '../lib/money'
import { docStatus, expiryText } from '../lib/documents'
import { ALIGN_LABEL, ALIGN_SUB, dayReport, dayTitle, goalStatus, healthVerdict, MEAL_LABEL, RAG, STATUS_LABEL, STATUS_TONE, type Alignment } from '../lib/day'
import { goalPercent } from '../lib/goals'
import { useAllData } from '../lib/useData'
import DateBar from '../components/DateBar'

interface Props {
  s: Settings; today: string; date: string; setDate: (d: string) => void; schedule: ScheduledReminder[]
  onNavigate: (t: Tab, action?: HealthAction | MoneyAction) => void; onOpenSettings: () => void; onOpenReminders: () => void
  onOpenFocus: () => void; onOpenReview: (kind: 'daily' | 'weekly' | 'monthly') => void; focus: { state: FocusState | null; left: number }
}

const ALIGN_TONE: Record<Alignment, string> = { forward: 'text-[#9BC2A5]', 'on-track': 'text-[#E3C27A]', drifting: 'text-[#E39B8F]', empty: 'text-[#F1EEE8]/70' }

export default function Today({ s, today: t, date, setDate, onNavigate, onOpenSettings, onOpenReminders, onOpenFocus, onOpenReview, focus }: Props) {
  const data = useAllData()
  const [qIndex, setQIndex] = useState(() => quoteOfTheDay().index)
  if (!data) return null
  const now = nowHHMM()
  const r = dayReport(data, s, date, t, now)
  const isToday = date === t
  const goals = data.goals.filter((g) => !g.completedAt)
  const quote = QUOTES[qIndex]
  const mb = r.money.month
  const reviewed = data.reviews.some((x) => x.kind === 'daily' && x.date === date)
  const eveningDue = isToday && !!s.eveningReviewTime && now >= s.eveningReviewTime && !reviewed
  const hv = healthVerdict(r.me.pct)

  // Alerts that need attention today
  const lowStock = data.supplements.filter((x) => x.active && daysOfStock(x) <= LOW_STOCK_DAYS)
  const docAlerts = data.docs.map((d) => ({ d, st: docStatus(d, t) })).filter((x) => x.st.status === 'expired' || x.st.status === 'soon').sort((a, b) => (a.st.days ?? 0) - (b.st.days ?? 0))
  const healthWord = hv === 'good' ? 'On track' : hv === 'mixed' ? 'Partly on track' : hv === 'off' ? 'Off track' : 'Not started'
  const spendWord = !mb.budget ? 'No budget set' : r.money.verdict === 'off' ? 'Over budget' : r.money.verdict === 'mixed' ? 'Ahead of plan' : 'Within plan'

  return (
    <div className="px-5 safe-top">
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{greeting()}{s.name ? `, ${s.name}` : ''}</p>
          <h1 className="h1 mt-1">My day</h1>
        </div>
        <div className="flex shrink-0 gap-1">
          {focus.state && (
            <button onClick={onOpenFocus} aria-label="Focus timer" className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-saffron"><Timer size={18} /><span className="num">{mmss(focus.left)}</span></button>
          )}
          <button onClick={onOpenReminders} aria-label="Reminders" className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted">
            <Bell size={21} strokeWidth={1.75} />
            {!s.notifications && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-saffron" />}
          </button>
          <button onClick={onOpenSettings} aria-label="Settings" className="flex h-11 w-11 items-center justify-center rounded-full text-muted"><Cog size={21} strokeWidth={1.75} /></button>
        </div>
      </div>
      <DateBar date={date} today={t} onChange={setDate} className="mt-4" />

      {/* Daily alignment score */}
      <div className="mt-3 rounded-[22px] bg-hero p-5 text-[#F1EEE8] dark:bg-surface dark:text-ink">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-[#C9B58A]">My day · {dayTitle(date)}</p>
        <p className={`mt-1.5 font-display text-[28px] font-medium leading-tight ${ALIGN_TONE[r.alignment]}`}>{ALIGN_LABEL[r.alignment]}</p>
        <p className="mt-0.5 text-sm opacity-70">{ALIGN_SUB[r.alignment]}</p>
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-4">
          <Score label="Health" value={r.me.pct != null ? `${r.me.pct}%` : '—'} sub="Meals and exercise" />
          <Score label="Expenses" value={money(r.money.spentToday, '₹', { compact: true })} sub={isToday || date < t ? 'Spent today' : 'Planned'} />
          <Score label="Tasks" value={`${r.rag.done}/${r.rag.total}`} sub="Completed" />
          <Score label="Goals" value={`${r.forward.length}/${r.goals.length}`} sub="Actions taken" />
        </div>
        {(r.headline || r.alignment !== 'empty') && (
          <div className="mt-4 rounded-2xl bg-white/[0.06] px-4 py-3">
            {r.headline && <p className="text-sm font-semibold">{r.headline}</p>}
            <p className="text-sm opacity-80">{r.sentence}</p>
          </div>
        )}
      </div>

      {/* The four areas */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Area Icon={Target} title="Goals" onClick={() => onNavigate('goals')}
          main={goals.length ? `${r.forward.length} of ${r.goals.length} moved` : 'Set a goal'}
          sub={goals.length ? `${goals.length} active · ${Math.round(goals.reduce((a, g) => a + goalPercent(g), 0) / goals.length)}% average` : 'The reason for the rest'}
          pct={goals.length ? (r.forward.length / Math.max(1, r.goals.length)) * 100 : 0} bar="bg-gold" />
        <Area Icon={HeartPulse} title="Health" onClick={() => onNavigate('health')}
          main={healthWord} sub={`Meals ${r.me.planned ? `${r.me.followed}/${r.me.planned}` : 'not planned'} · ${r.me.exercised ? `${r.me.exerciseMin} min active` : 'no exercise yet'}`}
          pct={r.me.pct ?? 0} bar="bg-forest" />
        <Area Icon={Wallet} title="Expenses" onClick={() => onNavigate('money')}
          main={mb.budget ? `${money(mb.spent, '₹', { compact: true })} of ${money(mb.budget, '₹', { compact: true })}` : money(mb.spent, '₹', { compact: true })}
          sub={spendWord} pct={mb.budget ? mb.pct : 0} bar={mb.over ? 'bg-crimson' : 'bg-gold'} />
        <Area Icon={ListChecks} title="To-do" onClick={() => onNavigate('tasks')}
          main={`${r.rag.done} of ${r.rag.total} done`} sub={`Red ${r.rag[1].done}/${r.rag[1].total} · Amber ${r.rag[2].done}/${r.rag[2].total} · Green ${r.rag[3].done}/${r.rag[3].total}`}
          pct={r.rag.total ? (r.rag.done / r.rag.total) * 100 : 0} bar="bg-saffron" />
      </div>

      {(docAlerts.length > 0 || lowStock.length > 0 || mb.over > 0 || mb.carry > 0) && isToday && (
        <div className="mt-3 space-y-2">
          {mb.over > 0 && <Alert text={`Over this month's budget by ${money(mb.over)}.`} onClick={() => onNavigate('money')} />}
          {mb.carry > 0 && !mb.over && <Alert soft text={`Carry-forward: spend ${money(mb.carry)} less on wants this month.`} onClick={() => onNavigate('money')} />}
          {docAlerts.slice(0, 2).map(({ d }) => <Alert key={`d${d.id}`} text={`${d.title}: ${expiryText(d, t).toLowerCase()}.`} onClick={() => onNavigate('docs')} />)}
          {lowStock.map((x) => <Alert key={`s${x.id}`} text={`${x.name} runs out in about ${daysOfStock(x)} days. Reorder.`} onClick={() => onNavigate('health')} />)}
        </div>
      )}

      {/* Daily overview */}
      {r.goals.length > 0 && (
        <Block title="Goal progress" action="Goals" onAction={() => onNavigate('goals')}>
          <div className="card divide-y divide-line">
            {r.goals.slice(0, 5).map((a) => {
              const st = goalStatus(a.goal, data.tasks, t, isToday && a.state === 'forward')
              return (
                <button key={a.goal.id} onClick={() => onNavigate('goals')} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${a.state === 'forward' ? 'bg-forest' : a.state === 'drifting' ? 'bg-crimson' : 'bg-faint'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{a.goal.title}</p>
                    <p className="truncate text-xs text-muted">{a.why}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold ${STATUS_TONE[st]}`}>{STATUS_LABEL[st]}</span>
                </button>
              )
            })}
          </div>
        </Block>
      )}

      <Block title="Meal plans" action="Plan meals" onAction={() => onNavigate('health', 'meals')}>
        <div className="card grid grid-cols-2 divide-x divide-line">
          {(['me', 'devi'] as const).map((p) => {
            const hd = data.healthDays.find((h) => h.person === p && h.date === date)
            return (
              <div key={p} className="p-4">
                <p className="eyebrow">{p === 'me' ? 'Me' : s.childName || 'Devi'}</p>
                <div className="mt-2 space-y-2">
                  {MEAL_SLOTS.map((m) => (
                    <div key={m}>
                      <p className="text-2xs text-faint">{MEAL_LABEL[m]}</p>
                      <p className={`flex items-start gap-1 text-sm leading-snug ${hd?.meals[m] ? '' : 'text-faint'}`}>
                        {hd?.followed[m] && <Check size={13} strokeWidth={3} className="mt-0.5 shrink-0 text-forest" />}{hd?.meals[m] || 'Not planned'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Block>

      <Block title="Money" action="Expenses" onAction={() => onNavigate('money')}>
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-3">
            <Fig label={isToday ? 'Today' : 'This day'} value={money(r.money.spentToday)} sub={r.money.wantsToday ? `${money(r.money.wantsToday, '₹', { compact: true })} wants` : 'no wants'} />
            <Fig label="Month in" value={money(mb.income, '₹', { compact: true })} tone="text-forest" />
            <Fig label="Month out" value={money(mb.spent, '₹', { compact: true })} sub={mb.budget ? `${mb.pct}% of budget` : undefined} />
          </div>
          {mb.budget > 0 && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken"><div className={`h-full rounded-full ${mb.over ? 'bg-crimson' : 'bg-gold'}`} style={{ width: `${Math.min(100, mb.pct)}%` }} /></div>
          )}
          <button onClick={() => onNavigate('money', 'expense')} className="btn-secondary mt-3 w-full text-sm">Add an expense</button>
        </div>
      </Block>

      <Block title="To-do" action="Open" onAction={() => onNavigate('tasks')}>
        <div className="card space-y-3 p-4">
          {([1, 2, 3] as const).map((p) => {
            const c = r.rag[p]
            return (
              <div key={p}>
                <div className="flex justify-between text-sm">
                  <span className={`flex items-center gap-2 font-semibold ${RAG[p].text}`}><span className={`h-2 w-2 rounded-full ${RAG[p].dot}`} />{RAG[p].name}<span className="font-normal text-muted">{RAG[p].sub}</span></span>
                  <span className="num text-muted">{c.done}/{c.total}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"><div className={`h-full rounded-full ${RAG[p].dot}`} style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }} /></div>
              </div>
            )
          })}
          {r.list.filter((x) => !x.done && x.task.priority === 1).slice(0, 3).map((x) => (
            <p key={x.task.id} className="truncate text-sm"><span className="text-crimson">Next: </span>{x.task.title}</p>
          ))}
        </div>
      </Block>

      {/* Review */}
      <div className="mt-6 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <button onClick={() => onOpenReview('daily')} className={`card flex items-center gap-2.5 p-3.5 text-left ${eveningDue ? 'ring-1 ring-saffron' : ''}`}>
          {reviewed ? <Check size={19} className="shrink-0 text-forest" /> : <NotebookPen size={19} strokeWidth={1.7} className="shrink-0 text-gold" />}
          <span className="min-w-0"><span className="block text-sm font-semibold">Daily review</span><span className="block truncate text-xs text-muted">{reviewed ? 'Done' : eveningDue ? 'Due now' : 'Four questions'}</span></span>
        </button>
        <button onClick={() => onOpenReview('weekly')} className="card p-3.5 text-left text-sm font-semibold">Week<span className="block text-xs font-normal text-muted">Patterns</span></button>
        <button onClick={() => onOpenReview('monthly')} className="card p-3.5 text-left text-sm font-semibold">Month<span className="block text-xs font-normal text-muted">Overview</span></button>
      </div>

      <div className="mt-6 px-1">
        <p className="font-serif text-[16px] italic leading-relaxed text-muted">{quote.text}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-faint">Swami Vivekananda</p>
          <button onClick={() => setQIndex((i) => (i + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length)}
            className="inline-flex items-center gap-1.5 py-2.5 pl-4 text-xs font-semibold text-faint"><RefreshCw size={12} />Another</button>
        </div>
      </div>
      <p className="my-8 text-center text-xs text-faint">The score is a guide, not a judgement.</p>
    </div>
  )
}

const Score = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="min-w-0">
    <p className="text-2xs uppercase tracking-[0.1em] opacity-60">{label}</p>
    <p className="num mt-0.5 font-display text-[19px] font-medium leading-tight">{value}</p>
    <p className="text-2xs leading-tight opacity-60">{sub}</p>
  </div>
)

function Area({ Icon, title, main, sub, pct, bar, onClick }: { Icon: typeof Target; title: string; main: string; sub: string; pct: number; bar: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex min-h-[128px] flex-col p-4 text-left active:scale-[0.99]">
      <p className="eyebrow flex items-center gap-1.5"><Icon size={14} strokeWidth={1.8} />{title}</p>
      <p className="mt-2 font-display text-[17px] font-medium leading-snug">{main}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted">{sub}</p>
      <div className="mt-auto h-1 overflow-hidden rounded-full bg-sunken pt-0"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>
    </button>
  )
}

function Block({ title, action, onAction, children }: { title: string; action: string; onAction: () => void; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="eyebrow">{title}</h2>
        <button onClick={onAction} className="-my-2 inline-flex items-center gap-1 py-2.5 pl-4 text-sm font-semibold text-saffron">{action}<ArrowRight size={14} /></button>
      </div>
      {children}
    </section>
  )
}

const Fig = ({ label, value, sub, tone = '' }: { label: string; value: string; sub?: string; tone?: string }) => (
  <div className="min-w-0">
    <p className="eyebrow">{label}</p>
    <p className={`num mt-1 truncate text-[17px] font-semibold ${tone}`}>{value}</p>
    {sub && <p className="truncate text-2xs text-muted">{sub}</p>}
  </div>
)

function Alert({ text, onClick, soft }: { text: string; onClick: () => void; soft?: boolean }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm ${soft ? 'bg-saffron-soft text-saffron-deep' : 'bg-crimson-soft text-crimson'}`}>
      <AlertTriangle size={16} className="shrink-0" />{text}
    </button>
  )
}
