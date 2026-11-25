import { BarChart3, Landmark, PiggyBank, Receipt, Target, Wallet } from 'lucide-react'

const ITEMS = [
  { I: Receipt, t: 'Expenses', d: 'Quick entry with categories and a monthly budget' },
  { I: Wallet, t: 'Income', d: 'Salary and other income, month by month' },
  { I: Landmark, t: 'Investments', d: 'Stocks, mutual funds, FDs and gold with gain or loss' },
  { I: BarChart3, t: 'Monthly report', d: 'Where the money went, and savings rate' },
  { I: Target, t: 'Linked to Goals', d: 'Savings and investments update your Wealth goals' },
  { I: PiggyBank, t: 'Net worth', d: 'One number that grows with your discipline' },
]
export default function Money() {
  return (
    <div className="px-5 safe-top">
      <p className="eyebrow mt-2">Arriving in Phase 3</p>
      <h1 className="h1 mt-1">Money</h1>
      <div className="card mt-5 divide-y divide-line">
        {ITEMS.map(({ I, t, d }) => (
          <div key={t} className="flex items-start gap-3 p-4">
            <I size={20} strokeWidth={1.6} className="mt-0.5 shrink-0 text-gold" />
            <div><p className="font-medium">{t}</p><p className="text-sm text-muted">{d}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">Until then, track savings targets as Wealth goals in the Goals tab.</p>
    </div>
  )
}
