import { describe, expect, it } from 'vitest'
import { gainPct, money, monthSummary, moneyLinkedValue, savedSince, totals } from '../src/lib/money'
import { periodSummary, rangeFor, type AllData } from '../src/lib/report'
import { goalPercent } from '../src/lib/goals'
import type { Goal, Holding, Liability, Transaction } from '../src/lib/db'

const tx = (date: string, type: 'income' | 'expense', amount: number, category = 'Other'): Transaction => ({ date, type, amount, category, createdAt: date })
const H = (name: string, invested: number, current: number, kind = 'Stocks', id = 1): Holding => ({ id, name, kind, invested, current, updatedAt: '' })
const L = (outstanding: number): Liability => ({ name: 'Loan', kind: 'Home loan', outstanding, updatedAt: '' })

describe('money', () => {
  it('formats Indian style', () => {
    expect(money(150000)).toBe('₹1,50,000')
    expect(money(-2500)).toBe('−₹2,500')
    expect(money(2500, '₹', { sign: true })).toBe('+₹2,500')
    expect(money(1250000, '₹', { compact: true })).toBe('₹12.50 L')
    expect(money(23000000, '₹', { compact: true })).toBe('₹2.30 Cr')
  })
  it('net worth = assets − loans, with gain', () => {
    const t = totals([H('A', 100000, 120000), H('B', 50000, 45000, 'Gold', 2)], [L(30000)])
    expect(t).toEqual({ assets: 165000, invested: 150000, debt: 30000, net: 135000, gain: 15000 })
    expect(gainPct(H('A', 100000, 120000))).toBe(20)
    expect(gainPct(H('Bank', 0, 5000))).toBe(0)
  })
  it('month summary and savings rate', () => {
    const txs = [tx('2026-11-01', 'income', 100000, 'Salary'), tx('2026-11-03', 'expense', 20000, 'Rent & home'), tx('2026-11-20', 'expense', 5000, 'Food & groceries'), tx('2026-10-30', 'expense', 9999)]
    const m = monthSummary(txs, '2026-11')
    expect(m).toMatchObject({ income: 100000, expense: 25000, savings: 75000, rate: 75 })
    expect(m.byCat['Rent & home']).toBe(20000)
    expect(savedSince(txs, '2026-11-02')).toBe(-25000)
  })
  it('wealth goals follow net worth, portfolio, savings and a single holding', () => {
    const hs = [H('Index fund', 100000, 130000, 'Mutual funds', 7)]
    const ls = [L(30000)]
    const txs = [tx('2026-11-01', 'income', 50000), tx('2026-11-02', 'expense', 10000)]
    const g = (link: Goal['link'], extra: Partial<Goal> = {}): Goal => ({ title: 'x', area: 'Wealth', term: 'long', startDate: '2026-11-01', deadline: '2027-11-01', milestones: [], focus: false, createdAt: '', link, ...extra })
    expect(moneyLinkedValue(g('netWorth'), hs, ls, txs)).toBe(100000)
    expect(moneyLinkedValue(g('portfolio'), hs, ls, txs)).toBe(130000)
    expect(moneyLinkedValue(g('savings'), hs, ls, txs)).toBe(40000)
    expect(moneyLinkedValue(g('holding', { linkId: 7 }), hs, ls, txs)).toBe(130000)
    expect(moneyLinkedValue(g('weight'), hs, ls, txs)).toBeUndefined()
    // progress measured from where you started: 50k → 1 L net worth, now at 1 L
    expect(goalPercent(g('netWorth', { start: 50000, target: 150000, current: 100000 }))).toBe(50)
  })
})

describe('reports', () => {
  const base: AllData = { tasks: [], goals: [], weights: [], water: [], food: [], activities: [], supplements: [], doses: [], transactions: [], holdings: [], liabilities: [], netWorth: [], reviews: [], focus: [], docs: [] }
  it('ranges for day, week and month', () => {
    expect(rangeFor('daily', '2026-11-25')).toEqual(['2026-11-25', '2026-11-25'])
    expect(rangeFor('weekly', '2026-11-23')).toEqual(['2026-11-23', '2026-11-29'])
    expect(rangeFor('monthly', '2026-02-10')).toEqual(['2026-02-01', '2026-02-28'])
    expect(rangeFor('monthly', '2028-02-10')).toEqual(['2028-02-01', '2028-02-29'])
  })
  it('summarises a week across every module', () => {
    const d: AllData = {
      ...base,
      tasks: [
        { title: 'One-off', priority: 1, repeat: 'none', checklist: [], completions: [], doneAt: '2026-11-24', createdAt: '' },
        { title: 'Meditate', priority: 2, repeat: 'daily', checklist: [], completions: ['2026-11-23', '2026-11-24', '2026-11-30'], createdAt: '' },
      ],
      water: [{ date: '2026-11-23', ml: 7000, at: '' }, { date: '2026-11-24', ml: 7000, at: '' }],
      activities: [{ date: '2026-11-23', type: 'Run', minutes: 30, km: 5 }, { date: '2026-11-25', type: 'Gym', minutes: 45 }],
      weights: [{ date: '2026-11-23', kg: 80 }, { date: '2026-11-29', kg: 79.4 }],
      transactions: [tx('2026-11-23', 'income', 10000), tx('2026-11-24', 'expense', 2500, 'Food & groceries')],
      focus: [{ date: '2026-11-24', minutes: 25, at: '' }, { date: '2026-11-25', minutes: 50, at: '' }],
      netWorth: [{ date: '2026-11-20', assets: 100, liabilities: 0, net: 100 }, { date: '2026-11-28', assets: 180, liabilities: 0, net: 180 }],
      holdings: [H('x', 0, 180)],
    }
    const s = periodSummary(d, '2026-11-23', '2026-11-29', '2026-12-31')
    // Mid-week, averages count only the days so far
    expect(periodSummary(d, '2026-11-23', '2026-11-29', '2026-11-24').days).toBe(2)
    expect(s).toMatchObject({ days: 7, tasksDone: 3, waterAvgL: 7, workouts: 2, activeMin: 75, runKm: 5, weightStart: 80, weightEnd: 79.4, income: 10000, spent: 2500, saved: 7500, rate: 75, focusMin: 75, netWorthChange: 80, netWorth: 180 })
  })
})
