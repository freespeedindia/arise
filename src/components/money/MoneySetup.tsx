import { useEffect, useState } from 'react'
import Sheet from '../Sheet'
import ListEditor from './ListEditor'
import { setSettings, type Settings } from '../../lib/settings'
import { celebrate } from '../../lib/celebrate'

export default function MoneySetup({ open, onClose, s }: { open: boolean; onClose: () => void; s: Settings }) {
  const [monthly, setMonthly] = useState('')
  const [exp, setExp] = useState<string[]>([])
  const [inc, setInc] = useState<string[]>([])
  const [wants, setWants] = useState<string[]>([])
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'budget' | 'expense' | 'income'>('budget')
  useEffect(() => {
    if (!open) return
    setMonthly(s.monthlyBudget ? String(s.monthlyBudget) : '')
    setExp(s.expenseCategories); setInc(s.incomeCategories); setWants(s.wantCategories)
    setBudgets(Object.fromEntries(Object.entries(s.budgets).map(([k, v]) => [k, String(v)])))
  }, [open, s])
  const save = async () => {
    const clean = (l: string[]) => [...new Set(l.map((x) => x.trim()).filter(Boolean))]
    const e = clean(exp)
    const b: Record<string, number> = {}
    e.forEach((c) => { const v = Number((budgets[c] ?? '').replace(/,/g, '')); if (v > 0) b[c] = v })
    await setSettings({
      currency: '₹', monthlyBudget: Number(monthly.replace(/,/g, '')) || 0,
      expenseCategories: e.length ? e : ['Other'], incomeCategories: clean(inc).length ? clean(inc) : ['Other'],
      wantCategories: wants.filter((w) => e.includes(w)), budgets: b,
    })
    celebrate(false, 'Expenses setup saved')
    onClose()
  }
  const catSum = exp.reduce((t, c) => t + (Number((budgets[c] ?? '').replace(/,/g, '')) || 0), 0)
  return (
    <Sheet open={open} onClose={onClose} title="Expenses setup">
      <div className="space-y-5">
        <div className="seg grid-cols-3">
          {([['budget', 'Budget'], ['expense', 'Money out'], ['income', 'Money in']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`seg-item text-xs ${tab === k ? 'seg-item-on' : ''}`}>{l}</button>
          ))}
        </div>
        {tab === 'budget' && (
          <>
            <div>
              <label className="label" htmlFor="ms-monthly">Monthly budget (₹)</label>
              <input id="ms-monthly" className="input num" inputMode="decimal" placeholder="e.g. 50000" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
              <p className="mt-1.5 text-xs text-muted">Everything you plan to spend in a month. If a month goes over, Arise shows how much to make up the next month.</p>
            </div>
            <div>
              <span className="label">Limit per category (optional)</span>
              <div className="space-y-1.5">
                {exp.filter(Boolean).map((c) => (
                  <div key={c} className="grid grid-cols-[1fr_8rem] items-center gap-2">
                    <span className="truncate text-sm">{c}</span>
                    <input className="input num py-2 text-right text-sm" inputMode="decimal" placeholder="—" aria-label={`Budget for ${c}`} value={budgets[c] ?? ''} onChange={(e) => setBudgets({ ...budgets, [c]: e.target.value })} />
                  </div>
                ))}
              </div>
              {catSum > 0 && <p className="num mt-2 text-xs text-muted">Category limits add up to ₹{catSum.toLocaleString('en-IN')}</p>}
            </div>
          </>
        )}
        {tab === 'expense' && (
          <>
            <ListEditor label="spending category" placeholder="New spending category" items={exp} onChange={setExp} />
            <div>
              <span className="label">Usually a want</span>
              <div className="flex flex-wrap gap-2">
                {exp.filter(Boolean).map((c) => (
                  <button key={c} onClick={() => setWants(wants.includes(c) ? wants.filter((w) => w !== c) : [...wants, c])} aria-pressed={wants.includes(c)} className={`chip ${wants.includes(c) ? 'chip-on' : ''}`}>{c}</button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">New expenses in these categories start as Want. You can switch any single expense.</p>
            </div>
          </>
        )}
        {tab === 'income' && <ListEditor label="income category" placeholder="New income source" items={inc} onChange={setInc} />}
        <p className="text-xs text-muted">Renaming a category keeps old entries under the old name. Everything here is yours to change at any time.</p>
        <button onClick={save} className="btn-primary w-full">Save setup</button>
      </div>
    </Sheet>
  )
}
