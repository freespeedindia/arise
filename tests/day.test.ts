import { describe, expect, it } from 'vitest'
import { dayReport, goalStatus, healthScore, monthBudget, tasksOn } from '../src/lib/day'
import { defaultSettings, type Settings } from '../src/lib/settings'
import type { AllData } from '../src/lib/report'
import type { Goal, Task, Transaction } from '../src/lib/db'

const s: Settings = { ...defaultSettings, monthlyBudget: 50000 }
const empty = (): AllData => ({ tasks: [], goals: [], weights: [], water: [], food: [], activities: [], supplements: [], doses: [], transactions: [], holdings: [], liabilities: [], netWorth: [], reviews: [], focus: [], docs: [], healthDays: [], wishes: [] })
const out = (date: string, amount: number, category: string, need?: 'need' | 'want'): Transaction => ({ date, type: 'expense', amount, category, need, createdAt: date })
const task = (id: number, title: string, priority: 1 | 2 | 3, dueDate: string, doneAt?: string, goalId?: number): Task => ({ id, title, priority, repeat: 'none', dueDate, doneAt, goalId, checklist: [], completions: [], createdAt: dueDate })
const goal = (id: number, area: Goal['area'], extra: Partial<Goal> = {}): Goal => ({ id, title: `G${id}`, area, term: 'short', startDate: '2026-11-01', deadline: '2026-12-31', milestones: [], focus: false, createdAt: '', ...extra })

describe('budget and carry-forward', () => {
  it('splits needs and wants, using category defaults', () => {
    const b = monthBudget([out('2026-11-02', 2400, 'Household & groceries'), out('2026-11-03', 1800, 'Food & dining out'), out('2026-11-04', 1000, 'Household & groceries', 'want')], s, '2026-11')
    expect(b.spent).toBe(5200); expect(b.wants).toBe(2800); expect(b.needs).toBe(2400); expect(b.remaining).toBe(44800)
  })
  it('carries an overspend into the next month as a suggestion only', () => {
    const b = monthBudget([out('2026-10-10', 55000, 'Travel'), out('2026-11-02', 1000, 'Travel')], s, '2026-11')
    expect(b.carry).toBe(5000); expect(b.target).toBe(45000); expect(b.remaining).toBe(49000)
  })
  it('names the categories that caused an overspend', () => {
    const b = monthBudget([out('2026-11-02', 30000, 'Household & groceries'), out('2026-11-05', 25000, 'Travel')], s, '2026-11')
    expect(b.over).toBe(5000); expect(b.culprits[0]).toBe('Travel')
  })
})

describe('to-do by day', () => {
  it('carries unfinished one-offs into today and keeps history for past days', () => {
    const t = [task(1, 'old', 3, '2026-11-25'), task(2, 'done yesterday', 1, '2026-11-26', '2026-11-26')]
    const today = tasksOn(t, '2026-11-27', '2026-11-27')
    expect(today.map((x) => x.task.title)).toEqual(['old'])
    expect(today[0].carried).toBe(true)
    expect(tasksOn(t, '2026-11-26', '2026-11-27')[0].done).toBe(true)
  })
})

describe('health and alignment', () => {
  it('scores meals, exercise and routine without inventing data', () => {
    const d = empty()
    expect(healthScore(d, s, 'me', '2026-11-27', '2026-11-27').pct).toBeNull()
    d.healthDays.push({ person: 'me', date: '2026-11-27', meals: { breakfast: 'Idli', lunch: 'Dal', snacks: 'Fruit', dinner: 'Soup' }, followed: { breakfast: true, lunch: true, dinner: true }, routine: [s.routineMe[0], s.routineMe[1]] })
    d.activities.push({ date: '2026-11-27', type: 'Walk', minutes: 30 })
    expect(healthScore(d, s, 'me', '2026-11-27', '2026-11-27').pct).toBe(75)
    expect(healthScore(d, s, 'devi', '2026-11-27', '2026-11-27').pct).toBeNull()
  })
  it('a linked task done moves its goal forward; empty days are not judged', () => {
    const d = empty()
    expect(dayReport(d, s, '2026-11-27', '2026-11-27').alignment).toBe('empty')
    d.goals.push(goal(1, 'Work'))
    d.tasks.push(task(1, 'Proposal', 1, '2026-11-27', '2026-11-27', 1))
    const r = dayReport(d, s, '2026-11-27', '2026-11-27', '09:00')
    expect(r.forward.length).toBe(1); expect(r.alignment).toBe('forward')
  })
  it('two problems mean drifting', () => {
    const d = empty()
    d.transactions.push(out('2026-11-27', 60000, 'Travel'))
    d.tasks.push(task(1, 'Missed', 1, '2026-11-27'))
    expect(dayReport(d, s, '2026-11-27', '2026-11-27', '15:00').alignment).toBe('drifting')
  })
  it('goal status: chosen status wins, otherwise from progress', () => {
    expect(goalStatus(goal(1, 'Work'), [], '2026-11-27')).toBe('not-started')
    expect(goalStatus(goal(1, 'Work', { status: 'at-risk' }), [], '2026-11-27')).toBe('at-risk')
    expect(goalStatus(goal(1, 'Work'), [task(1, 'x', 1, '2026-11-20', '2026-11-20', 1)], '2026-11-27')).toBe('in-progress')
    expect(goalStatus(goal(1, 'Work', { completedAt: '2026-11-20' }), [], '2026-11-27')).toBe('completed')
  })
})
