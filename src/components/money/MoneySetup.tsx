import { useEffect, useState } from 'react'
import Sheet from '../Sheet'
import ListEditor from './ListEditor'
import { setSettings, type Settings } from '../../lib/settings'
import { celebrate } from '../../lib/celebrate'

export default function MoneySetup({ open, onClose, s }: { open: boolean; onClose: () => void; s: Settings }) {
  const [currency, setCurrency] = useState(s.currency)
  const [monthly, setMonthly] = useState('')
  const [exp, setExp] = useState<string[]>([])
  const [inc, setInc] = useState<string[]>([])
  const [kinds, setKinds] = useState<string[]>([])
  const [budgets, setBudgets] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'budget' | 'expense' | 'income' | 'assets'>('budget')
  useEffect(() => {
    if (!open) return
    setCurrency(s.currency); setMonthly(s.monthlyBudget ? String(s.monthlyBudget) : '')
    setExp(s.expenseCategories); setInc(s.incomeCategories); setKinds(s.assetKinds)
    setBudgets(Object.fromEntries(Object.entries(s.budgets).map(([k, v]) => [k, String(v)])))
  }, [open, s])
  const save = async () => {
    const clean = (l: string[]) => [...new Set(l.map((x) => x.trim()).filter(Boolean))]
    const e = clean(exp)
    const b: Record<string, number> = {}
    e.forEach((c) => { const v = Number((budgets[c] ?? '').replace(/,/g, '')); if (v > 0) b[c] = v })
    await setSettings({
      currency: currency.trim() || '₹', monthlyBudget: Number(monthly.replace(/,/g, '')) || 0,
      expenseCategories: e.length ? e : ['Other'], incomeCategories: clean(inc).length ? clean(inc) : ['Other'],
      assetKinds: clean(kinds).length ? clean(kinds) : ['Other'], budgets: b,
    })
    celebrate(false, 'Money setup saved')
    onClose()
  }
  const catSum = exp.reduce((t, c) => t + (Number((budgets[c] ?? '').replace(/,/g, '')) || 0), 0)
  return (
    <Sheet open={open} onClose={onClose} title="Money setup">
      <div className="space-y-5">
        <div className="seg grid-cols-4">
          {([['budget', 'Budgets'], ['expense', 'Spending'], ['income', 'Income'], ['assets', 'Assets']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`seg-item text-xs ${tab === k ? 'seg-item-on' : ''}`}>{l}</button>
          ))}
        </div>
        {tab === 'budget' && (
          <>
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <div>
                <label className="label" htmlFor="ms-cur">Currency</label>
                <input id="ms-cur" className="input" value={currency} maxLength={4} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="ms-monthly">Monthly spending limit</label>
                <input id="ms-monthly" className="input num" inputMode="decimal" placeholder="No limit" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
              </div>
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
              {catSum > 0 && <p className="num mt-2 text-xs text-muted">Category limits add up to {currency}{catSum.toLocaleString('en-IN')}</p>}
            </div>
          </>
        )}
        {tab === 'expense' && <ListEditor label="spending category" placeholder="New spending category" items={exp} onChange={setExp} />}
        {tab === 'income' && <ListEditor label="income category" placeholder="New income source" items={inc} onChange={setInc} />}
        {tab === 'assets' && (
          <>
            <ListEditor label="asset type" placeholder="New asset type, e.g. Crypto" items={kinds} onChange={setKinds} />
            <p className="text-xs text-muted">These are the types you can pick when adding an investment or account.</p>
          </>
        )}
        <p className="text-xs text-muted">Renaming a category keeps old entries under the old name. Everything here is yours to change at any time.</p>
        <button onClick={save} className="btn-primary w-full">Save setup</button>
      </div>
    </Sheet>
  )
}
