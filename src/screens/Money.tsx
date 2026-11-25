import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, CreditCard, Landmark, Link2, Plus, Settings2, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, type Holding, type Liability, type Transaction, type TxType } from '../lib/db'
import { addDays, fromKey, monthKey, prevMonthKey } from '../lib/dates'
import { gainPct, money, monthSummary, snapshotNetWorth, totals } from '../lib/money'
import { goalPercent } from '../lib/goals'
import type { Settings } from '../lib/settings'
import TxSheet from '../components/money/TxSheet'
import { HoldingSheet, LiabilitySheet } from '../components/money/HoldingSheet'
import MoneySetup from '../components/money/MoneySetup'
import Ring from '../components/Ring'

const nextMonthKey = (mk: string) => { const [y, m] = mk.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}` }
const monthName = (mk: string) => fromKey(`${mk}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
const fmtShort = (k: string) => fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const PALETTE = ['rgb(var(--gold))', 'rgb(var(--saffron))', 'rgb(var(--forest))', 'rgb(var(--water))', 'rgb(var(--crimson))', 'rgb(var(--saffron-deep))', 'rgb(var(--muted))', 'rgb(var(--faint))']

export type MoneyAction = 'expense' | 'income' | null

export default function Money({ s, today, initial, onOpenGoals }: { s: Settings; today: string; initial?: MoneyAction; onOpenGoals: () => void }) {
  const txs = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) ?? []
  const holdings = useLiveQuery(() => db.holdings.toArray()) ?? []
  const liabilities = useLiveQuery(() => db.liabilities.toArray()) ?? []
  const history = useLiveQuery(() => db.netWorth.orderBy('date').toArray()) ?? []
  const wealthGoals = (useLiveQuery(() => db.goals.where('area').equals('Wealth').toArray()) ?? []).filter((g) => !g.completedAt)

  const [mk, setMk] = useState(monthKey(today))
  const [txOpen, setTxOpen] = useState<TxType | null>(initial ?? null)
  const [txEdit, setTxEdit] = useState<Transaction | null>(null)
  const [hOpen, setHOpen] = useState(false)
  const [hEdit, setHEdit] = useState<Holding | null>(null)
  const [lOpen, setLOpen] = useState(false)
  const [lEdit, setLEdit] = useState<Liability | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [showAllTx, setShowAllTx] = useState(false)

  // Keep a daily point of net worth so the trend fills in over time
  useEffect(() => { if (holdings.length || liabilities.length) snapshotNetWorth(today) }, [today, holdings.length, liabilities.length])

  const cur = s.currency
  const f = (n: number, o?: { sign?: boolean; compact?: boolean }) => money(n, cur, o)
  const t = totals(holdings, liabilities)
  const m = monthSummary(txs, mk)
  const prev = monthSummary(txs, prevMonthKey(mk))
  const monthTx = txs.filter((x) => monthKey(x.date) === mk)
  const month30 = history.filter((h) => h.date <= addDays(today, -30)).slice(-1)[0]
  const change30 = month30 ? t.net - month30.net : null

  // allocation by kind
  const byKind: Record<string, number> = {}
  holdings.forEach((h) => (byKind[h.kind] = (byKind[h.kind] || 0) + h.current))
  const alloc = Object.entries(byKind).sort((a, b) => b[1] - a[1])

  // budgets
  const budgetRows = s.expenseCategories
    .map((c) => ({ c, spent: m.byCat[c] || 0, limit: s.budgets[c] || 0 }))
    .filter((r) => r.spent > 0 || r.limit > 0)
    .sort((a, b) => b.spent - a.spent)
  const otherCats = Object.keys(m.byCat).filter((c) => !s.expenseCategories.includes(c)).map((c) => ({ c, spent: m.byCat[c], limit: 0 }))
  const rows = [...budgetRows, ...otherCats]
  const maxSpent = Math.max(1, ...rows.map((r) => Math.max(r.spent, r.limit)))
  const isCurrent = mk === monthKey(today)
  const dayOfMonth = Number(today.slice(8, 10))
  const daysInMonth = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate()

  const empty = !txs.length && !holdings.length && !liabilities.length

  return (
    <div className="px-5 safe-top">
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Net worth · Cash flow · Investments</p>
          <h1 className="h1 mt-1">Money</h1>
        </div>
        <button onClick={() => setSetupOpen(true)} className="btn-secondary mt-1 px-3.5 py-2 text-sm"><Settings2 size={16} />Setup</button>
      </div>

      {empty && (
        <div className="card mt-5 p-5">
          <p className="font-serif text-lg font-semibold">Start with where you stand</p>
          <ol className="mt-2 space-y-1.5 text-sm text-muted">
            <li>1. Add your bank balances, investments and gold under Assets.</li>
            <li>2. Add any loans or card balances.</li>
            <li>3. Log income and expenses as they happen.</li>
            <li>4. Create a Wealth goal and link it to your net worth or savings.</li>
          </ol>
          <p className="mt-2 text-xs text-faint">Categories, budgets and asset types are all editable in Setup.</p>
        </div>
      )}

      {/* Net worth */}
      <div className="card mt-5 p-4">
        <p className="eyebrow flex items-center gap-1.5"><Landmark size={13} />Net worth</p>
        <p className={`num mt-1 font-serif text-[34px] font-semibold leading-none ${t.net < 0 ? 'text-crimson' : ''}`}>{f(t.net)}</p>
        <p className="num mt-1.5 text-xs text-muted">
          {change30 != null ? <span className={change30 >= 0 ? 'text-forest' : 'text-crimson'}>{f(change30, { sign: true })} in 30 days · </span> : null}
          Assets {f(t.assets, { compact: true })} · Owed {f(t.debt, { compact: true })}
        </p>
        {history.length > 1 && (
          <div className="-ml-3 mt-3 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--gold))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="rgb(var(--gold))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={40} />
                <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => money(v, '', { compact: true })} domain={['auto', 'auto']} />
                <Tooltip labelFormatter={(l) => fmtShort(String(l))} formatter={(v: number) => [f(v), 'Net worth']}
                  contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 10, fontSize: 12 }} />
                <Area dataKey="net" stroke="rgb(var(--gold))" strokeWidth={2} fill="url(#nw)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {history.length <= 1 && !empty && <p className="mt-3 rounded-lg bg-sunken px-3 py-2 text-xs text-muted">The trend line fills in as you update values over the coming days.</p>}
      </div>

      {/* Wealth goals */}
      {wealthGoals.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="eyebrow">Wealth goals</h2>
            <button onClick={onOpenGoals} className="-my-2 py-2.5 pl-4 text-sm font-semibold text-saffron">All goals</button>
          </div>
          <div className="card divide-y divide-line">
            {wealthGoals.map((g) => {
              const p = goalPercent(g)
              return (
                <button key={g.id} onClick={onOpenGoals} className="flex w-full items-center gap-3 p-3.5 text-left">
                  <Ring pct={p} size={44} stroke={4} color="rgb(var(--gold))"><span className="num text-[11px] font-semibold">{p}%</span></Ring>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{g.title}</p>
                    <p className="num text-xs text-muted">
                      {g.target != null ? `${g.unit === '₹' ? f(g.current ?? 0, { compact: true }) : g.current} of ${g.unit === '₹' ? f(g.target, { compact: true }) : `${g.target} ${g.unit ?? ''}`}` : 'Milestones'}
                      {g.link && <Link2 size={11} className="ml-1 inline" aria-label="Updates automatically" />}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* This month */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Cash flow</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setMk(prevMonthKey(mk))} aria-label="Previous month" className="p-2 text-muted"><ChevronLeft size={18} /></button>
            <span className="min-w-[8.5rem] text-center text-sm font-semibold">{monthName(mk)}</span>
            <button onClick={() => setMk(nextMonthKey(mk))} disabled={isCurrent} aria-label="Next month" className="p-2 text-muted disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="card p-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="eyebrow flex items-center gap-1"><TrendingUp size={12} />In</p>
              <p className="num mt-1 text-lg font-semibold text-forest">{f(m.income, { compact: true })}</p>
            </div>
            <div>
              <p className="eyebrow flex items-center gap-1"><TrendingDown size={12} />Out</p>
              <p className="num mt-1 text-lg font-semibold text-crimson">{f(m.expense, { compact: true })}</p>
            </div>
            <div>
              <p className="eyebrow">Saved</p>
              <p className="num mt-1 text-lg font-semibold">{f(m.savings, { compact: true })}</p>
              {m.income > 0 && <p className="num text-2xs text-muted">{m.rate}% of income</p>}
            </div>
          </div>
          {s.monthlyBudget > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Spending limit</span>
                <span className={`num font-semibold ${m.expense > s.monthlyBudget ? 'text-crimson' : ''}`}>{f(m.expense, { compact: true })} of {f(s.monthlyBudget, { compact: true })}</span>
              </div>
              <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-sunken">
                <div className={`h-full rounded-full ${m.expense > s.monthlyBudget ? 'bg-crimson' : 'bg-gold'}`} style={{ width: `${Math.min(100, (m.expense / s.monthlyBudget) * 100)}%` }} />
                {isCurrent && <span className="absolute inset-y-0 w-px bg-ink/40" style={{ left: `${(dayOfMonth / daysInMonth) * 100}%` }} title="Today" />}
              </div>
              {isCurrent && m.expense <= s.monthlyBudget && <p className="num mt-1 text-2xs text-muted">{f(s.monthlyBudget - m.expense, { compact: true })} left for {daysInMonth - dayOfMonth + 1} days · about {f((s.monthlyBudget - m.expense) / (daysInMonth - dayOfMonth + 1))} a day</p>}
            </div>
          )}
          {prev.expense > 0 && <p className="num mt-3 text-xs text-muted">Last month you spent {f(prev.expense, { compact: true })}{prev.income ? ` and saved ${prev.rate}%` : ''}.</p>}

          {rows.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {rows.map((r) => {
                const over = r.limit > 0 && r.spent > r.limit
                return (
                  <div key={r.c}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate">{r.c}</span>
                      <span className={`num shrink-0 ${over ? 'font-semibold text-crimson' : 'text-muted'}`}>{f(r.spent)}{r.limit ? ` / ${f(r.limit, { compact: true })}` : ''}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                      <div className={`h-full rounded-full ${over ? 'bg-crimson' : 'bg-saffron'}`} style={{ width: `${Math.min(100, (r.spent / (r.limit || maxSpent)) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => { setTxEdit(null); setTxOpen('expense') }} className="btn-primary"><Plus size={18} />Expense</button>
            <button onClick={() => { setTxEdit(null); setTxOpen('income') }} className="btn-secondary"><Plus size={18} />Income</button>
          </div>
        </div>

        {monthTx.length > 0 && (
          <div className="card mt-3 divide-y divide-line">
            {(showAllTx ? monthTx : monthTx.slice(0, 6)).map((x) => (
              <button key={x.id} onClick={() => { setTxEdit(x); setTxOpen(x.type) }} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{x.note || x.category}</p>
                  <p className="text-xs text-muted">{x.note ? `${x.category} · ` : ''}{fmtShort(x.date)}</p>
                </div>
                <span className={`num text-sm font-semibold ${x.type === 'income' ? 'text-forest' : ''}`}>{x.type === 'income' ? '+' : '−'}{f(x.amount)}</span>
              </button>
            ))}
            {monthTx.length > 6 && (
              <button onClick={() => setShowAllTx(!showAllTx)} className="w-full py-3 text-sm font-semibold text-saffron">{showAllTx ? 'Show less' : `Show all ${monthTx.length}`}</button>
            )}
          </div>
        )}
      </section>

      {/* Assets */}
      <section className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="eyebrow">Assets and investments</h2>
          <button onClick={() => { setHEdit(null); setHOpen(true) }} className="-my-2 py-2.5 pl-4 text-sm font-semibold text-saffron">Add</button>
        </div>
        <div className="card p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow flex items-center gap-1.5"><Wallet size={13} />Total value</p>
              <p className="num mt-1 font-serif text-2xl font-semibold">{f(t.assets)}</p>
            </div>
            {t.invested > 0 && (
              <div className="text-right">
                <p className="eyebrow">Gain</p>
                <p className={`num mt-1 font-semibold ${t.gain >= 0 ? 'text-forest' : 'text-crimson'}`}>{f(t.gain, { sign: true, compact: true })} <span className="text-xs">({((t.gain / t.invested) * 100).toFixed(1)}%)</span></p>
              </div>
            )}
          </div>
          {alloc.length > 0 && t.assets > 0 && (
            <>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-sunken" aria-label="Allocation">
                {alloc.map(([k, v], i) => <div key={k} style={{ width: `${(v / t.assets) * 100}%`, background: PALETTE[i % PALETTE.length] }} />)}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {alloc.map(([k, v], i) => (
                  <span key={k} className="num flex items-center gap-1.5 text-xs text-muted">
                    <span className="h-2 w-2 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />{k} {Math.round((v / t.assets) * 100)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        {holdings.length > 0 ? (
          <div className="card mt-3 divide-y divide-line">
            {[...holdings].sort((a, b) => b.current - a.current).map((h) => {
              const g = h.current - h.invested
              return (
                <button key={h.id} onClick={() => { setHEdit(h); setHOpen(true) }} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted">{h.kind}{h.maturity ? ` · matures ${fmtShort(h.maturity)}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-semibold">{f(h.current)}</p>
                    {h.invested > 0 && g !== 0 && <p className={`num text-xs ${g >= 0 ? 'text-forest' : 'text-crimson'}`}>{g >= 0 ? '+' : ''}{gainPct(h).toFixed(1)}%</p>}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <button onClick={() => { setHEdit(null); setHOpen(true) }} className="card mt-3 flex w-full items-center gap-3 p-4 text-left text-sm text-muted">
            <Plus size={18} className="text-gold" />Add a bank account, fund, FD, gold or property
          </button>
        )}
      </section>

      {/* Liabilities */}
      <section className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="eyebrow">Loans and cards</h2>
          <button onClick={() => { setLEdit(null); setLOpen(true) }} className="-my-2 py-2.5 pl-4 text-sm font-semibold text-saffron">Add</button>
        </div>
        {liabilities.length > 0 ? (
          <div className="card divide-y divide-line">
            {liabilities.map((l) => (
              <button key={l.id} onClick={() => { setLEdit(l); setLOpen(true) }} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <CreditCard size={18} strokeWidth={1.6} className="shrink-0 text-crimson" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="num text-xs text-muted">{l.kind}{l.emi ? ` · EMI ${f(l.emi)}` : ''}</p>
                </div>
                <span className="num text-sm font-semibold text-crimson">{f(l.outstanding)}</span>
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No loans recorded.</p>}
      </section>

      <TxSheet open={txOpen != null} onClose={() => { setTxOpen(null); setTxEdit(null) }} s={s} today={today} type={txOpen ?? 'expense'} tx={txEdit} />
      <HoldingSheet open={hOpen} onClose={() => setHOpen(false)} s={s} holding={hEdit} />
      <LiabilitySheet open={lOpen} onClose={() => setLOpen(false)} s={s} item={lEdit} />
      <MoneySetup open={setupOpen} onClose={() => setSetupOpen(false)} s={s} />
    </div>
  )
}
