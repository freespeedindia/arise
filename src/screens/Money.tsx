import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Plus, Settings2, ShoppingBag, Trash2 } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { db, type NeedWant, type Transaction, type TxType, type Wish } from '../lib/db'
import { fromKey, monthKey, prevMonthKey } from '../lib/dates'
import { afterMoneyChange, money } from '../lib/money'
import { monthBudget } from '../lib/day'
import { setSetting, type Settings } from '../lib/settings'
import { toast } from '../lib/celebrate'
import TxSheet from '../components/money/TxSheet'
import MoneySetup from '../components/money/MoneySetup'

const nextMonthKey = (mk: string) => { const [y, m] = mk.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}` }
const monthName = (mk: string) => fromKey(`${mk}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
const monthOnly = (mk: string) => fromKey(`${mk}-01`).toLocaleDateString('en-IN', { month: 'long' })
const fmtShort = (k: string) => fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
export const PALETTE = ['rgb(var(--gold))', 'rgb(var(--saffron))', 'rgb(var(--forest))', 'rgb(var(--water))', 'rgb(var(--crimson))', 'rgb(var(--saffron-deep))', 'rgb(var(--muted))', 'rgb(var(--faint))', 'rgb(var(--ink))']

export type MoneyAction = 'expense' | 'income' | null

export default function Money({ s, today, date, initial }: { s: Settings; today: string; date: string; initial?: MoneyAction }) {
  const txs = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray()) ?? []
  const wishes = useLiveQuery(() => db.wishes.toArray()) ?? []
  const [mk, setMk] = useState(monthKey(date))
  const [side, setSide] = useState<TxType>(initial === 'income' ? 'income' : 'expense')
  const [txEdit, setTxEdit] = useState<Transaction | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  const f = (n: number, o?: { sign?: boolean; compact?: boolean }) => money(n, '₹', o)
  const b = monthBudget(txs, s, mk)
  const isCurrent = mk === monthKey(today)
  const daysInMonth = new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate()
  const dayOfMonth = isCurrent ? Number(today.slice(8, 10)) : daysInMonth
  const monthTx = txs.filter((x) => monthKey(x.date) === mk && x.type === side)
  const pie = Object.entries(b.byCat).sort((a, c) => c[1] - a[1])
  const entryDate = isCurrent ? (monthKey(date) === mk ? date : today) : `${mk}-01`

  return (
    <div className="px-5 safe-top">
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Money in · Money out · Budget</p>
          <h1 className="h1 mt-1">Expenses</h1>
        </div>
        <button onClick={() => setSetupOpen(true)} className="btn-secondary mt-1 px-3.5 py-2 text-sm"><Settings2 size={16} />Setup</button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface p-1">
        <button onClick={() => setMk(prevMonthKey(mk))} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center text-muted"><ChevronLeft size={18} /></button>
        <span className="text-sm font-semibold">{monthName(mk)}</span>
        <button onClick={() => setMk(nextMonthKey(mk))} disabled={isCurrent} aria-label="Next month" className="flex h-10 w-10 items-center justify-center text-muted disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>

      {/* Budget dashboard */}
      <div className="card mt-3 p-5">
        {b.budget ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Spent</p>
                <p className={`num mt-1 font-display text-[32px] font-medium leading-none ${b.over ? 'text-crimson' : ''}`}>{f(b.spent)}</p>
                <p className="num mt-1.5 text-xs text-muted">of {f(b.budget)} budget</p>
              </div>
              <div className="text-right">
                <p className="eyebrow">{b.over ? 'Over by' : 'Remaining'}</p>
                <p className={`num mt-1 text-xl font-semibold ${b.over ? 'text-crimson' : 'text-forest'}`}>{f(Math.abs(b.remaining))}</p>
                <p className="num mt-0.5 text-xs text-muted">{b.pct}% used</p>
              </div>
            </div>
            <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-sunken">
              <div className={`h-full rounded-full ${b.over ? 'bg-crimson' : 'bg-gold'}`} style={{ width: `${Math.min(100, b.pct)}%` }} />
              {isCurrent && <span className="absolute inset-y-0 w-px bg-ink/50" style={{ left: `${(dayOfMonth / daysInMonth) * 100}%` }} title="Today" />}
            </div>
            {isCurrent && !b.over && <p className="num mt-1.5 text-2xs text-muted">About {f(b.remaining / (daysInMonth - dayOfMonth + 1))} a day for the {daysInMonth - dayOfMonth + 1} days left</p>}
          </>
        ) : (
          <div>
            <p className="font-display text-lg font-medium">Set a monthly budget</p>
            <p className="mt-1 text-sm text-muted">One number for everything you plan to spend in a month.</p>
            <div className="mt-3 flex gap-2">
              <input className="input num" inputMode="numeric" placeholder="e.g. 50000" aria-label="Monthly budget" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
              <button onClick={() => { const v = Number(budgetInput.replace(/,/g, '')); if (v > 0) setSetting('monthlyBudget', v) }} className="btn-primary shrink-0">Save</button>
            </div>
            <p className="num mt-3 text-sm">Spent so far: <span className="font-semibold">{f(b.spent)}</span></p>
          </div>
        )}

        {/* Need vs Want */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-sunken px-4 py-3">
            <p className="eyebrow">Needs</p>
            <p className="num mt-0.5 text-lg font-semibold">{f(b.needs)}</p>
          </div>
          <div className="rounded-2xl bg-sunken px-4 py-3">
            <p className="eyebrow">Wants</p>
            <p className="num mt-0.5 text-lg font-semibold text-saffron-deep">{f(b.wants)}</p>
          </div>
        </div>
        {b.spent > 0 && (
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full bg-forest" style={{ width: `${(b.needs / b.spent) * 100}%` }} />
            <div className="h-full bg-saffron" style={{ width: `${(b.wants / b.spent) * 100}%` }} />
          </div>
        )}

        {/* Carry forward from last month */}
        {b.carry > 0 && (
          <div className="mt-4 rounded-2xl bg-saffron-soft px-4 py-3 text-sm text-saffron-deep">
            <p className="font-semibold">Carry-forward from {monthOnly(b.prev)}: {f(b.carry)}</p>
            <p className="mt-0.5">{monthOnly(b.prev)} went over budget. Aim to spend {f(b.carry)} less on wants in {monthOnly(mk)}, a plan of {f(b.target)}.</p>
          </div>
        )}
        {b.over > 0 && (
          <div className="mt-4 rounded-2xl bg-crimson-soft px-4 py-3 text-sm text-crimson">
            <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={15} />Over budget by {f(b.over)}</p>
            {b.culprits.length > 0 && <p className="mt-0.5">Mostly from {b.culprits.join(', ')}.</p>}
            <p className="mt-0.5">Reduce {monthOnly(nextMonthKey(mk))}'s discretionary spending by {f(b.over)} to make up for it.</p>
          </div>
        )}
      </div>

      {/* Where the money went */}
      {pie.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-2.5">Where it went</h2>
          <div className="card p-4">
            <div className="mx-auto h-36 w-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie.map(([name, value]) => ({ name, value }))} dataKey="value" innerRadius="58%" outerRadius="100%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
                    {pie.map(([c], i) => <Cell key={c} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pie.slice(0, 6).map(([c, v], i) => {
                const limit = s.budgets[c]
                return (
                  <div key={c} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="min-w-0 flex-1 truncate">{c}</span>
                    <span className={`num shrink-0 ${limit && v > limit ? 'font-semibold text-crimson' : 'text-muted'}`}>{f(v, { compact: true })}{limit ? ` / ${f(limit, { compact: true })}` : ` · ${Math.round((v / b.spent) * 100)}%`}</span>
                  </div>
                )
              })}
              {pie.length > 6 && <p className="text-2xs text-faint">and {pie.length - 6} more</p>}
            </div>
          </div>
        </section>
      )}

      {/* IN / OUT */}
      <section className="mt-6">
        <div className="seg grid-cols-2">
          {(['income', 'expense'] as const).map((k) => (
            <button key={k} onClick={() => { setSide(k); setShowAll(false) }} className={`seg-item ${side === k ? 'seg-item-on' : ''}`}>
              {k === 'income' ? 'IN' : 'OUT'} <span className="num font-medium text-muted">{f(k === 'income' ? b.income : b.spent, { compact: true })}</span>
            </button>
          ))}
        </div>
        <QuickAdd key={`${side}-${entryDate}`} s={s} type={side} date={entryDate} />
        {monthTx.length > 0 && (
          <div className="card mt-3 divide-y divide-line">
            {(showAll ? monthTx : monthTx.slice(0, 8)).map((x) => {
              const want = x.type === 'expense' && b.isWant(x)
              return (
                <button key={x.id} onClick={() => setTxEdit(x)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{x.note || x.category}</p>
                    <p className="truncate text-xs text-muted">{fmtShort(x.date)} · {x.category}{x.type === 'expense' ? <span className={want ? 'text-saffron-deep' : ''}> · {want ? 'Want' : 'Need'}</span> : null}</p>
                  </div>
                  <span className={`num text-[15px] font-semibold ${x.type === 'income' ? 'text-forest' : ''}`}>{x.type === 'income' ? '+' : ''}{f(x.amount)}</span>
                </button>
              )
            })}
            {monthTx.length > 8 && <button onClick={() => setShowAll(!showAll)} className="w-full py-3 text-sm font-semibold text-saffron">{showAll ? 'Show less' : `Show all ${monthTx.length}`}</button>}
          </div>
        )}
        {!monthTx.length && <p className="mt-3 px-1 text-sm text-muted">{side === 'income' ? 'No money in recorded' : 'No spending recorded'} for {monthOnly(mk)}.</p>}
      </section>

      <WantList s={s} wishes={wishes} today={today} />

      <TxSheet open={!!txEdit} onClose={() => setTxEdit(null)} s={s} today={today} type={txEdit?.type ?? 'expense'} tx={txEdit} />
      <MoneySetup open={setupOpen} onClose={() => setSetupOpen(false)} s={s} />
    </div>
  )
}

export const defaultNeed = (s: Settings, category: string): NeedWant => (s.wantCategories.includes(category) ? 'want' : 'need')

function QuickAdd({ s, type, date }: { s: Settings; type: TxType; date: string }) {
  const cats = type === 'expense' ? s.expenseCategories : s.incomeCategories
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [category, setCategory] = useState(type === 'expense' ? cats[0] : '')
  const [need, setNeed] = useState<NeedWant>(defaultNeed(s, cats[0] ?? ''))
  const [day, setDay] = useState(date)
  const value = Number(amount.replace(/,/g, ''))
  const pickCat = (c: string) => { setCategory(c); if (type === 'expense') setNeed(defaultNeed(s, c)) }
  const save = async () => {
    if (!value || value <= 0) return
    await db.transactions.add({
      type, amount: value, date: day, note: note.trim() || undefined, createdAt: new Date().toISOString(),
      category: category || (type === 'income' ? 'Other' : 'Other'), ...(type === 'expense' ? { need } : {}),
    })
    await afterMoneyChange()
    toast(type === 'expense' ? `${money(value)} spent, saved as a ${need}` : `${money(value)} received`)
    setAmount(''); setNote('')
  }
  return (
    <div className="card mt-3 space-y-3 p-4">
      <div className="grid grid-cols-[1fr_1.4fr] gap-2">
        <input className="input num text-lg" inputMode="decimal" placeholder="₹ 0" aria-label="Amount in rupees" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <input className="input" placeholder={type === 'expense' ? 'What for' : 'Source'} aria-label={type === 'expense' ? 'Description' : 'Source'} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <select className="input text-sm" aria-label="Category" value={category} onChange={(e) => pickCat(e.target.value)}>
          {type === 'income' && <option value="">Category</option>}
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" className="input text-sm" aria-label="Date" value={day} onChange={(e) => setDay(e.target.value)} />
      </div>
      {type === 'expense' && (
        <div className="seg grid-cols-2">
          {(['need', 'want'] as const).map((k) => (
            <button key={k} onClick={() => setNeed(k)} aria-pressed={need === k} className={`seg-item ${need === k ? 'seg-item-on' : ''}`}>{k === 'need' ? 'Need' : 'Want'}</button>
          ))}
        </div>
      )}
      <button onClick={save} disabled={!value || value <= 0} className="btn-primary w-full"><Plus size={18} />{type === 'expense' ? 'Add money out' : 'Add money in'}</button>
    </div>
  )
}

function WantList({ s, wishes, today }: { s: Settings; wishes: Wish[]; today: string }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [buying, setBuying] = useState<{ id: number; amount: string } | null>(null)
  const open = wishes.filter((w) => !w.boughtAt).sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  const bought = wishes.filter((w) => w.boughtAt).sort((a, b) => b.boughtAt!.localeCompare(a.boughtAt!)).slice(0, 3)
  const total = open.reduce((a, w) => a + (w.amount || 0), 0)
  const add = async () => {
    if (!title.trim()) return
    await db.wishes.add({ title: title.trim(), amount: Number(amount.replace(/,/g, '')) || undefined, addedAt: new Date().toISOString() })
    setTitle(''); setAmount('')
  }
  const buy = async (w: Wish, value: number) => {
    const category = w.category ?? (s.expenseCategories.find((c) => /clothing|personal/i.test(c)) ?? (s.expenseCategories.includes('Other') ? 'Other' : s.expenseCategories[0]))
    const txId = await db.transactions.add({ type: 'expense', amount: value, date: today, category, note: w.title, need: 'want', wishId: w.id, createdAt: new Date().toISOString() })
    await db.wishes.update(w.id!, { boughtAt: today, txId, amount: value })
    await afterMoneyChange()
    setBuying(null)
    toast(`${w.title} added to spending as a want`)
  }
  return (
    <section className="mt-8">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="eyebrow flex items-center gap-1.5"><ShoppingBag size={13} />Want list</h2>
        {total > 0 && <span className="num text-xs text-muted">{money(total)} if bought</span>}
      </div>
      <div className="card p-4">
        <p className="text-sm text-muted">Note things you would like before buying them. Waiting a few days often shows what was only a want.</p>
        <div className="mt-3 grid grid-cols-[1.6fr_1fr_auto] gap-2">
          <input className="input" placeholder="e.g. New dress" aria-label="Wanted item" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <input className="input num" inputMode="decimal" placeholder="₹" aria-label="Expected price" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button onClick={add} disabled={!title.trim()} aria-label="Add to want list" className="btn-secondary px-4"><Plus size={18} /></button>
        </div>
        {open.length > 0 && (
          <div className="mt-3 divide-y divide-line">
            {open.map((w) => (
              <div key={w.id} className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{w.title}</p>
                    <p className="num text-xs text-muted">{w.amount ? money(w.amount) : 'No price yet'} · added {fmtShort(w.addedAt.slice(0, 10))}</p>
                  </div>
                  <button onClick={() => (w.amount ? buy(w, w.amount) : setBuying({ id: w.id!, amount: '' }))} className="chip"><Check size={14} />Bought</button>
                  <button onClick={() => db.wishes.delete(w.id!)} aria-label={`Remove ${w.title}`} className="flex h-10 w-10 items-center justify-center text-faint"><Trash2 size={15} /></button>
                </div>
                {buying?.id === w.id && (
                  <div className="mt-2 flex gap-2">
                    <input autoFocus className="input num" inputMode="decimal" placeholder="Price paid" aria-label="Price paid" value={buying?.amount ?? ''} onChange={(e) => setBuying({ id: w.id!, amount: e.target.value })} />
                    <button onClick={() => { const v = Number((buying?.amount ?? '').replace(/,/g, '')); if (v > 0) buy(w, v) }} className="btn-primary shrink-0">Save</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {bought.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-line pt-2">
            {bought.map((w) => <p key={w.id} className="num text-xs text-faint line-through">{w.title} · {money(w.amount || 0)} · {fmtShort(w.boughtAt!)}</p>)}
          </div>
        )}
      </div>
    </section>
  )
}
