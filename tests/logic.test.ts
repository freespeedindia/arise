import { describe, expect, it } from 'vitest'
import type { Goal, Task } from '../src/lib/db'
import { addDays, daysBetween, fromKey, toKey, weekStart } from '../src/lib/dates'
import { isDoneNow, isDueToday, isOverdue, streak } from '../src/lib/tasks'
import { goalPace, goalPercent } from '../src/lib/goals'
import { QUOTES, quoteOfTheDay } from '../src/data/quotes'

const task = (p: Partial<Task>): Task => ({ title: 't', priority: 2, repeat: 'none', checklist: [], completions: [], createdAt: '2026-01-01T00:00:00Z', ...p })
const goal = (p: Partial<Goal>): Goal => ({ title: 'g', area: 'Health', term: 'long', startDate: '2026-11-25', deadline: '2027-11-25', milestones: [], focus: false, createdAt: '', ...p })
const range = (from: string, days: number, step = 1) => Array.from({ length: Math.ceil(days / step) }, (_, i) => addDays(from, i * step))

describe('dates', () => {
  it('handles leap years and month ends', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(daysBetween('2026-11-25', '2027-11-25')).toBe(365)
    expect(daysBetween('2026-11-25', '2028-11-25')).toBe(731) // 2028 is a leap year
  })
  it('walks 2 years day by day without skipping or repeating a date', () => {
    const days = range('2026-11-25', 731)
    expect(new Set(days).size).toBe(731)
    days.forEach((d, i) => i && expect(daysBetween(days[i - 1], d)).toBe(1))
  })
  it('week starts on Monday', () => {
    expect(weekStart('2026-11-25')).toBe('2026-11-23') // Wed -> Mon
    expect(weekStart('2026-11-29')).toBe('2026-11-23') // Sun -> Mon
    expect(toKey(fromKey('2027-01-01'))).toBe('2027-01-01')
  })
})

describe('repeating tasks over 1 and 2 years', () => {
  it('daily task is due every day for 2 years and builds a 731-day streak', () => {
    const t = task({ repeat: 'daily', dueDate: '2026-11-25' })
    const days = range('2026-11-25', 731)
    days.forEach((d) => expect(isDueToday(t, d)).toBe(true))
    t.completions = days
    expect(streak(t, days[730])).toBe(731)
  })
  it('daily streak breaks after a missed day, and survives until today is ticked', () => {
    const t = task({ repeat: 'daily', completions: ['2027-03-01', '2027-03-02', '2027-03-04', '2027-03-05'] })
    expect(streak(t, '2027-03-05')).toBe(2)
    expect(streak(t, '2027-03-06')).toBe(2) // today not yet done, streak still shown
    expect(streak(t, '2027-03-07')).toBe(0)
  })
  it('weekly task: due from its weekday each week, 104-week streak over 2 years', () => {
    const t = task({ repeat: 'weekly', dueDate: '2026-11-25' }) // Wednesday
    expect(isDueToday(t, '2026-11-30')).toBe(false) // Monday
    expect(isDueToday(t, '2026-12-02')).toBe(true) // Wednesday
    expect(isDueToday(t, '2026-12-06')).toBe(true) // Sunday, still this week
    t.completions = range('2026-11-25', 728, 7)
    expect(t.completions.length).toBe(104)
    expect(streak(t, '2028-11-15')).toBe(104)
    expect(isDoneNow(t, '2028-11-17')).toBe(true)
  })
  it('monthly task on the 31st works in short months and leap February', () => {
    const t = task({ repeat: 'monthly', dueDate: '2026-12-31' })
    expect(isDueToday(t, '2027-02-27')).toBe(false)
    expect(isDueToday(t, '2027-02-28')).toBe(true)
    expect(isDueToday(t, '2028-02-29')).toBe(true)
    expect(isDueToday(t, '2027-04-30')).toBe(true)
    const months: string[] = []
    for (let y = 2027; y <= 2028; y++) for (let m = 1; m <= 12; m++) months.push(`${y}-${String(m).padStart(2, '0')}-28`)
    t.completions = ['2026-12-31', ...months]
    expect(streak(t, '2028-12-31')).toBe(25)
  })
  it('repeating task with a future start date is not due yet', () => {
    expect(isDueToday(task({ repeat: 'daily', dueDate: '2027-01-01' }), '2026-12-31')).toBe(false)
  })
  it('one-off tasks: due, overdue and done', () => {
    const t = task({ dueDate: '2027-11-25' })
    expect(isDueToday(t, '2027-11-24')).toBe(false)
    expect(isDueToday(t, '2027-11-25')).toBe(true)
    expect(isOverdue(t, '2028-11-25')).toBe(true)
    expect(isOverdue({ ...t, doneAt: '2027-11-25' }, '2028-11-25')).toBe(false)
  })
})

describe('goals with 1-year and 2-year deadlines', () => {
  it('on-pace math across the whole year', () => {
    const g = goal({ target: 24, current: 0, startDate: '2027-01-01', deadline: '2027-12-31' })
    expect(goalPace({ ...g, current: 12 }, '2027-07-01')).toBe('on')
    expect(goalPace({ ...g, current: 6 }, '2027-07-01')).toBe('behind')
    expect(goalPace({ ...g, current: 20 }, '2027-07-01')).toBe('ahead')
    expect(goalPace({ ...g, current: 23 }, '2028-01-01')).toBe('overdue')
    expect(goalPace({ ...g, current: 24 }, '2028-01-01')).toBe('done')
  })
  it('2-year savings goal', () => {
    const g = goal({ area: 'Wealth', target: 500000, current: 250000, startDate: '2026-11-25', deadline: '2028-11-25' })
    expect(goalPercent(g)).toBe(50)
    expect(goalPace(g, '2027-11-25')).toBe('on')
    expect(goalPace(g, '2028-06-01')).toBe('behind')
  })
  it('goal that goes DOWN (weight 80 kg to 72 kg) is measured from the start value', () => {
    const g = goal({ start: 80, current: 76, target: 72, unit: 'kg' })
    expect(goalPercent(g)).toBe(50)
    expect(goalPercent({ ...g, current: 72 })).toBe(100)
    expect(goalPercent({ ...g, current: 82 })).toBe(0)
  })
  it('milestone-only goal', () => {
    const g = goal({ milestones: [{ id: '1', text: 'a', done: true }, { id: '2', text: 'b', done: false }, { id: '3', text: 'c', done: false }, { id: '4', text: 'd', done: true }] })
    expect(goalPercent(g)).toBe(50)
  })
})

describe('quotes', () => {
  it('has at least 100 unique quotes', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(100)
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length)
  })
  it('quote of the day is stable within a day and changes daily for 2 years', () => {
    expect(quoteOfTheDay(new Date(2027, 4, 1, 6)).index).toBe(quoteOfTheDay(new Date(2027, 4, 1, 23)).index)
    let same = 0
    for (let i = 1; i < 731; i++) {
      const a = quoteOfTheDay(new Date(2026, 10, 25 + i - 1, 12)).index
      const b = quoteOfTheDay(new Date(2026, 10, 25 + i, 12)).index
      if (a === b) same++
    }
    expect(same).toBe(0)
  })
})

import { buildSchedule, nextReminder } from '../src/lib/reminders'
import { dueNow } from '../src/lib/notifier'
import { defaultSettings } from '../src/lib/settings'
import { daysOfStock, plannedWeight, weeklyChange, linkedValue } from '../src/lib/health'

describe('reminders', () => {
  const base = { settings: defaultSettings, tasks: [], supplements: [], doses: [], reminders: [], goals: [], waterMl: 0 }
  it('water every 90 min between 06:00 and 22:00, stops once target reached', () => {
    const list = buildSchedule({ ...base, date: '2026-11-25' }).filter((r) => r.kind === 'water')
    expect(list[0].time).toBe('07:30')
    expect(list.at(-1)!.time).toBe('21:00')
    expect(list.length).toBe(10)
    expect(buildSchedule({ ...base, date: '2026-11-25', waterMl: 3000 }).filter((r) => r.kind === 'water').every((r) => r.done)).toBe(true)
  })
  it('run only on chosen days (Mon, Wed, Fri)', () => {
    expect(buildSchedule({ ...base, date: '2026-11-25' }).some((r) => r.kind === 'run')).toBe(true) // Wednesday
    expect(buildSchedule({ ...base, date: '2026-11-26' }).some((r) => r.kind === 'run')).toBe(false) // Thursday
  })
  it('supplement doses, marked done when taken', () => {
    const supplements = [{ id: 1, name: 'Vitamin D3', dose: '1 tablet', times: ['08:00', '20:00'], perDose: 1, stock: 10, active: true, createdAt: '' }]
    const doses = [{ suppId: 1, date: '2026-11-25', time: '08:00', takenAt: '' }]
    const list = buildSchedule({ ...base, date: '2026-11-25', supplements, doses }).filter((r) => r.kind === 'supplement')
    expect(list.map((r) => [r.time, !!r.done])).toEqual([['08:00', true], ['20:00', false]])
    expect(daysOfStock(supplements[0])).toBe(5)
  })
  it('weekly goal review on Sunday, custom once/weekday reminders', () => {
    const goals = [goal({})]
    const reminders = [
      { id: 1, title: 'Pay rent', time: '10:00', repeat: 'once' as const, date: '2026-12-01', enabled: true, createdAt: '' },
      { id: 2, title: 'Stand-up', time: '09:30', repeat: 'weekdays' as const, enabled: true, createdAt: '' },
    ]
    expect(buildSchedule({ ...base, goals, date: '2026-11-29' }).some((r) => r.kind === 'goal-review')).toBe(true)
    expect(buildSchedule({ ...base, goals, reminders, date: '2026-11-29' }).some((r) => r.title === 'Stand-up')).toBe(false) // Sunday
    expect(buildSchedule({ ...base, reminders, date: '2026-12-01' }).filter((r) => r.kind === 'custom').length).toBe(2)
  })
  it('next reminder and due-now window', () => {
    const list = buildSchedule({ ...base, date: '2026-11-25' })
    expect(nextReminder(list, '07:00')!.time).toBe('07:30')
    expect(dueNow(list, '07:40', new Set()).map((r) => r.key)).toEqual(['water-07:30'])
    expect(dueNow(list, '07:40', new Set(['water-07:30']))).toEqual([])
    expect(dueNow(list, '08:00', new Set())).toEqual([]) // more than 15 min late: skipped
  })
  it('a 2-year schedule always produces a sorted, valid list', () => {
    for (let i = 0; i < 731; i++) {
      const list = buildSchedule({ ...base, goals: [goal({})], date: addDays('2026-11-25', i) })
      const times = list.map((r) => r.time)
      expect([...times].sort()).toEqual(times)
      times.forEach((t) => expect(t).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/))
    }
  })
})

describe('health plan and linked goals', () => {
  const plan = { startWeight: 80, targetWeight: 72, planStart: '2026-11-25', planEnd: '2027-03-25' }
  it('straight-line weight plan', () => {
    expect(plannedWeight(plan, '2026-11-25')).toBe(80)
    expect(plannedWeight(plan, '2027-03-25')).toBe(72)
    expect(plannedWeight(plan, '2028-01-01')).toBe(72)
    expect(weeklyChange(plan)).toBeCloseTo(-0.47, 2)
  })
  it('linked goals read from logs', () => {
    const acts = [
      { date: '2026-11-20', type: 'Run' as const, minutes: 30, km: 5 },
      { date: '2026-11-26', type: 'Run' as const, minutes: 35, km: 6 },
      { date: '2026-11-27', type: 'Gym' as const, minutes: 45 },
    ]
    const weights = [{ date: '2026-11-25', kg: 80 }, { date: '2026-11-27', kg: 79.2 }]
    expect(linkedValue(goal({ link: 'runKm', startDate: '2026-11-25' }), weights, acts)).toBe(6)
    expect(linkedValue(goal({ link: 'activeMinutes', startDate: '2026-11-25' }), weights, acts)).toBe(80)
    expect(linkedValue(goal({ link: 'workouts', startDate: '2026-11-25' }), weights, acts)).toBe(2)
    expect(linkedValue(goal({ link: 'weight' }), weights, acts)).toBe(79.2)
  })
})
