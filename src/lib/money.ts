import { db, type Goal, type Holding, type Liability, type NetWorthPoint, type Transaction } from './db'
import { monthKey, todayKey } from './dates'

/** Indian-style number formatting, e.g. ₹1,50,000 */
export const money = (n: number, cur = '₹', opts: { sign?: boolean; compact?: boolean } = {}) => {
  const abs = Math.abs(n)
  let body: string
  if (opts.compact && abs >= 1e7) body = `${(abs / 1e7).toFixed(abs >= 1e9 ? 0 : 2)} Cr`
  else if (opts.compact && abs >= 1e5) body = `${(abs / 1e5).toFixed(abs >= 1e7 ? 0 : 2)} L`
  else body = Math.round(abs).toLocaleString('en-IN')
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : ''
  return `${sign}${cur}${body}`
}

export const totals = (holdings: Holding[], liabilities: Liability[]) => {
  const assets = holdings.reduce((s, h) => s + (h.current || 0), 0)
  const invested = holdings.reduce((s, h) => s + (h.invested || 0), 0)
  const debt = liabilities.reduce((s, l) => s + (l.outstanding || 0), 0)
  return { assets, invested, debt, net: assets - debt, gain: assets - invested }
}
export const gainPct = (h: Pick<Holding, 'invested' | 'current'>) => (h.invested > 0 ? ((h.current - h.invested) / h.invested) * 100 : 0)

export function monthSummary(txs: Transaction[], mk: string) {
  const m = txs.filter((t) => monthKey(t.date) === mk)
  const income = m.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = m.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const byCat: Record<string, number> = {}
  m.filter((t) => t.type === 'expense').forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount))
  const savings = income - expense
  return { income, expense, savings, rate: income > 0 ? Math.round((savings / income) * 100) : 0, byCat }
}

/** Money saved (income − expenses) from a date onward */
export const savedSince = (txs: Transaction[], from: string) =>
  txs.filter((t) => t.date >= from).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)

export function moneyLinkedValue(g: Goal, holdings: Holding[], liabilities: Liability[], txs: Transaction[]): number | undefined {
  switch (g.link) {
    case 'netWorth': return totals(holdings, liabilities).net
    case 'portfolio': return totals(holdings, []).assets
    case 'savings': return savedSince(txs, g.startDate)
    case 'holding': return holdings.find((h) => h.id === g.linkId)?.current
    default: return undefined
  }
}

/** Record today's net worth so the trend chart can show history. */
export async function snapshotNetWorth(date = todayKey()) {
  const [h, l] = await Promise.all([db.holdings.toArray(), db.liabilities.toArray()])
  const t = totals(h, l)
  const point: NetWorthPoint = { date, assets: t.assets, liabilities: t.debt, net: t.net }
  await db.netWorth.put(point)
}

/** After any money change: update net worth history and linked Wealth goals. */
export async function afterMoneyChange() {
  await snapshotNetWorth()
  const { syncLinkedGoals } = await import('./health')
  await syncLinkedGoals()
}
