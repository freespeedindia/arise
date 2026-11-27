// The daily operating system: one place that turns what you logged into
// plain answers. Everything here is computed from real entries only.
import { MEAL_SLOTS, type Goal, type GoalStatus, type HealthDay, type Person, type Task, type Transaction } from './db'
import { addDays, daysBetween, fromKey, monthKey, prevMonthKey } from './dates'
import { isDueToday } from './tasks'
import { goalPace, goalPercent } from './goals'
import type { AllData } from './report'
import type { Settings } from './settings'

// ---------- To-do (Red, Amber, Green) ----------
export type Rag = 1 | 2 | 3
export const RAG: Record<Rag, { name: string; sub: string; by?: string; dot: string; text: string; soft: string }> = {
  1: { name: 'Red', sub: 'Critical, before noon', by: '12:00', dot: 'bg-crimson', text: 'text-crimson', soft: 'bg-crimson-soft' },
  2: { name: 'Amber', sub: 'Important, before 5 PM', by: '17:00', dot: 'bg-saffron', text: 'text-saffron-deep', soft: 'bg-saffron-soft' },
  3: { name: 'Green', sub: 'Flexible, can carry forward', dot: 'bg-forest', text: 'text-forest', soft: 'bg-forest-soft' },
}

export interface DayTask { task: Task; done: boolean; carried: boolean }

/** The to-do list for a date: what was (or is) due that day and whether it got done. */
export function tasksOn(tasks: Task[], date: string, today: string): DayTask[] {
  const out: DayTask[] = []
  for (const k of tasks) {
    if (k.repeat !== 'none') {
      if (k.createdAt.slice(0, 10) > date && (!k.dueDate || k.dueDate > date)) continue
      if (!isDueToday(k, date)) continue
      out.push({ task: k, done: k.completions.includes(date) || periodDone(k, date), carried: false })
      continue
    }
    if (date < today) {
      // Looking back: due that day, or finished that day
      if (k.doneAt === date || (k.dueDate === date)) out.push({ task: k, done: !!k.doneAt && k.doneAt <= date, carried: false })
    } else if (date === today) {
      if (k.doneAt === today) out.push({ task: k, done: true, carried: !!k.dueDate && k.dueDate < today })
      else if (!k.doneAt && (!k.dueDate || k.dueDate <= today)) out.push({ task: k, done: false, carried: !!k.dueDate && k.dueDate < today })
    } else if (k.dueDate === date && !k.doneAt) out.push({ task: k, done: false, carried: false })
  }
  return out
}
function periodDone(k: Task, date: string): boolean {
  if (k.repeat === 'daily') return k.completions.includes(date)
  const sameWeek = (a: string, b: string) => Math.floor((daysBetween('2024-01-01', a)) / 7) === Math.floor((daysBetween('2024-01-01', b)) / 7)
  if (k.repeat === 'weekly') return k.completions.some((c) => sameWeek(c, date) && c <= date)
  return k.completions.some((c) => monthKey(c) === monthKey(date) && c <= date)
}

export function ragCounts(list: DayTask[]) {
  const c = { 1: { done: 0, total: 0 }, 2: { done: 0, total: 0 }, 3: { done: 0, total: 0 } } as Record<Rag, { done: number; total: number }>
  list.forEach(({ task, done }) => { const r = (task.priority || 2) as Rag; c[r].total++; if (done) c[r].done++ })
  const done = list.filter((x) => x.done).length
  return { ...c, done, total: list.length }
}

// ---------- Health ----------
export const MEAL_LABEL: Record<(typeof MEAL_SLOTS)[number], string> = { breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Evening snacks', dinner: 'Dinner' }
export const personOf = (p?: Person): Person => p ?? 'me'
export const emptyDay = (person: Person, date: string): HealthDay => ({ person, date, meals: {}, followed: {}, routine: [] })

export interface HealthScore {
  planned: number; followed: number
  exerciseMin: number; exercised: boolean
  routineDone: number; routineTotal: number
  supTaken: number; supTotal: number
  waterMl: number
  pct: number | null
}
export function healthScore(d: AllData, s: Settings, person: Person, date: string, today: string): HealthScore {
  const hd = d.healthDays.find((h) => h.person === person && h.date === date) ?? emptyDay(person, date)
  const planned = MEAL_SLOTS.filter((m) => hd.meals[m]?.trim()).length
  const followed = MEAL_SLOTS.filter((m) => hd.meals[m]?.trim() && hd.followed[m]).length
  const acts = d.activities.filter((a) => a.date === date && personOf(a.person) === person)
  const exerciseMin = acts.reduce((a, x) => a + x.minutes, 0)
  const list = person === 'me' ? s.routineMe : s.routineDevi
  const routineDone = hd.routine.filter((r) => list.includes(r)).length
  const sups = d.supplements.filter((x) => x.active && personOf(x.person) === person && x.createdAt.slice(0, 10) <= date)
  const slots = sups.flatMap((x) => x.times.map((t) => ({ id: x.id, t })))
  const supTaken = slots.filter(({ id, t }) => d.doses.some((z) => z.suppId === id && z.date === date && z.time === t)).length
  const waterMl = person === 'me' ? d.water.filter((w) => w.date === date).reduce((a, w) => a + w.ml, 0) : 0
  const parts: number[] = []
  if (planned) parts.push(followed / planned)
  parts.push(acts.length ? 1 : 0)
  if (list.length) parts.push(routineDone / list.length)
  if (slots.length) parts.push(supTaken / slots.length)
  const anything = planned || acts.length || routineDone || supTaken
  // No entries at all means no judgement, not a zero
  const pct = date > today || !anything ? null : Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
  return { planned, followed, exerciseMin, exercised: acts.length > 0, routineDone, routineTotal: list.length, supTaken, supTotal: slots.length, waterMl, pct }
}

export type Verdict = 'good' | 'mixed' | 'off' | 'none'
export const healthVerdict = (pct: number | null): Verdict => (pct == null ? 'none' : pct >= 75 ? 'good' : pct >= 40 ? 'mixed' : 'off')

// ---------- Money ----------
const daysIn = (mk: string) => new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate()
const spentIn = (tx: Transaction[], mk: string, upTo?: string) => tx.filter((t) => t.type === 'expense' && monthKey(t.date) === mk && (!upTo || t.date <= upTo))

/** A month's budget picture, including the carry-forward from an overspent previous month. */
export function monthBudget(txs: Transaction[], s: Settings, mk: string, upTo?: string) {
  const out = spentIn(txs, mk, upTo)
  const spent = out.reduce((a, t) => a + t.amount, 0)
  const isWant = (t: Transaction) => (t.need ?? (s.wantCategories.includes(t.category) ? 'want' : 'need')) === 'want'
  const wants = out.filter(isWant).reduce((a, t) => a + t.amount, 0)
  const income = txs.filter((t) => t.type === 'income' && monthKey(t.date) === mk && (!upTo || t.date <= upTo)).reduce((a, t) => a + t.amount, 0)
  const byCat: Record<string, number> = {}
  out.forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount))
  const budget = s.monthlyBudget || 0
  const prev = prevMonthKey(mk)
  const prevSpent = spentIn(txs, prev).reduce((a, t) => a + t.amount, 0)
  const carry = budget && prevSpent > budget ? prevSpent - budget : 0
  const over = budget && spent > budget ? spent - budget : 0
  // Categories responsible: over their own limit, else the biggest Want categories
  const catOver = Object.entries(byCat).filter(([c, v]) => s.budgets[c] && v > s.budgets[c]).map(([c, v]) => ({ c, by: v - s.budgets[c] }))
  const wantCats: Record<string, number> = {}
  out.filter(isWant).forEach((t) => (wantCats[t.category] = (wantCats[t.category] || 0) + t.amount))
  const culprits = catOver.length ? catOver.sort((a, b) => b.by - a.by).map((x) => x.c) : Object.entries(wantCats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
  return { spent, wants, needs: spent - wants, income, byCat, budget, carry, target: Math.max(0, budget - carry), over, remaining: budget - spent, pct: budget ? Math.round((spent / budget) * 100) : 0, culprits, isWant, prev }
}
export type MonthBudget = ReturnType<typeof monthBudget>

export interface MoneyDay {
  spentToday: number; wantsToday: number; needsToday: number; incomeToday: number
  month: MonthBudget
  /** Spending you could have done by this date if spread evenly */
  paceLimit: number
  verdict: Verdict
}
export function moneyDay(d: AllData, s: Settings, date: string): MoneyDay {
  const mk = monthKey(date)
  const month = monthBudget(d.transactions, s, mk, date)
  const today = d.transactions.filter((t) => t.date === date)
  const out = today.filter((t) => t.type === 'expense')
  const spentToday = out.reduce((a, t) => a + t.amount, 0)
  const wantsToday = out.filter(month.isWant).reduce((a, t) => a + t.amount, 0)
  const paceLimit = month.budget ? Math.round((month.budget * Number(date.slice(8, 10))) / daysIn(mk)) : 0
  let verdict: Verdict = 'none'
  if (month.budget) {
    if (month.spent > month.budget) verdict = 'off'
    else if (month.spent > paceLimit && wantsToday > 0) verdict = 'mixed'
    else verdict = 'good'
  }
  return { spentToday, wantsToday, needsToday: spentToday - wantsToday, incomeToday: today.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0), month, paceLimit, verdict }
}

// ---------- Goals ----------
export type GoalDay = 'forward' | 'steady' | 'drifting'
export interface GoalAlign { goal: Goal; state: GoalDay; why: string }

export function activeGoalsOn(goals: Goal[], date: string) {
  return goals.filter((g) => g.startDate <= date && (!g.completedAt || g.completedAt >= date))
}

export function goalsDay(d: AllData, s: Settings, date: string, today: string, health = healthScore(d, s, 'me', date, today), money = moneyDay(d, s, date), list = tasksOn(d.tasks, date, today)): GoalAlign[] {
  return activeGoalsOn(d.goals, date).map((g) => {
    const linked = list.filter((x) => x.task.goalId === g.id)
    const doneLinked = linked.filter((x) => x.done)
    const ms = g.milestones.filter((m) => m.doneOn === date)
    if (doneLinked.length) return { goal: g, state: 'forward', why: `${doneLinked.length} linked task${doneLinked.length > 1 ? 's' : ''} done` }
    if (ms.length) return { goal: g, state: 'forward', why: `Milestone reached: ${ms[0].text}` }
    if (g.area === 'Health' && healthVerdict(health.pct) === 'good') return { goal: g, state: 'forward', why: 'Meals and exercise on plan' }
    if (g.area === 'Wealth' && money.verdict === 'good' && money.spentToday >= 0 && money.month.budget) return { goal: g, state: money.wantsToday ? 'steady' : 'forward', why: money.wantsToday ? 'Within budget, with some wants' : 'Within budget, no wants' }
    if (g.area === 'Health' && healthVerdict(health.pct) === 'off' && date <= today) return { goal: g, state: 'drifting', why: 'Meal plan or exercise missed' }
    if (g.area === 'Wealth' && (money.verdict === 'off' || money.verdict === 'mixed')) return { goal: g, state: 'drifting', why: money.verdict === 'off' ? 'Over the monthly budget' : 'Spending ahead of plan' }
    const missed = linked.filter((x) => !x.done && (date < today))
    if (missed.length) return { goal: g, state: 'drifting', why: `${missed.length} linked task${missed.length > 1 ? 's' : ''} not done` }
    return { goal: g, state: 'steady', why: linked.length ? `${linked.length} linked task${linked.length > 1 ? 's' : ''} to do` : 'No action recorded yet' }
  })
}

// ---------- Goal status ----------
export const STATUS_LABEL: Record<GoalStatus, string> = {
  'not-started': 'Not started', 'in-progress': 'In progress', 'on-track': 'On track', 'at-risk': 'At risk', completed: 'Completed',
}
export const STATUS_TONE: Record<GoalStatus, string> = {
  'not-started': 'bg-sunken text-muted', 'in-progress': 'bg-water-soft text-water', 'on-track': 'bg-forest-soft text-forest', 'at-risk': 'bg-crimson-soft text-crimson', completed: 'bg-gold-soft text-gold',
}
/** The status you chose, or one worked out from real progress and linked activity. */
export function goalStatus(g: Goal, tasks: Task[], today: string, movedToday = false): GoalStatus {
  if (g.completedAt) return 'completed'
  if (g.status && g.status !== 'completed') return g.status
  const pct = goalPercent(g)
  const acted = movedToday || tasks.some((t) => t.goalId === g.id && (t.doneAt || t.completions.length)) || g.milestones.some((m) => m.done)
  if (pct === 0 && !acted) return today > g.deadline ? 'at-risk' : 'not-started'
  // Nothing measurable to pace against: acting on it is progress
  if (g.target == null && !g.milestones.length) return today > g.deadline ? 'at-risk' : 'in-progress'
  const pace = goalPace(g, today)
  if (pace === 'behind' || pace === 'overdue') return 'at-risk'
  if (pct === 0) return 'in-progress'
  return 'on-track'
}

// ---------- The whole day ----------
export type Alignment = 'forward' | 'on-track' | 'drifting' | 'empty'
export const ALIGN_LABEL: Record<Alignment, string> = { forward: 'Moving forward', 'on-track': 'On track', drifting: 'Drifting', empty: 'Not planned yet' }
export const ALIGN_SUB: Record<Alignment, string> = {
  forward: 'Your day is moving you towards your goals.',
  'on-track': 'Your day is keeping you on track.',
  drifting: 'Today is taking you away from your goals.',
  empty: 'Plan meals, tasks and a budget to see how the day lines up.',
}

export function dayReport(d: AllData, s: Settings, date: string, today: string, now = '23:59') {
  const list = tasksOn(d.tasks, date, today)
  const rag = ragCounts(list)
  const me = healthScore(d, s, 'me', date, today)
  const devi = healthScore(d, s, 'devi', date, today)
  const money = moneyDay(d, s, date)
  const goals = goalsDay(d, s, date, today, me, money, list)
  const forward = goals.filter((g) => g.state === 'forward')
  const clock = date < today ? '23:59' : date > today ? '00:00' : now
  const redOpen = list.filter((x) => x.task.priority === 1 && !x.done)
  const redLate = clock >= '12:00' ? redOpen.length : 0

  const good: string[] = []
  const bad: string[] = []
  if (me.planned && me.followed === me.planned) good.push('followed the planned meals')
  if (me.exercised) good.push('exercised')
  if (healthVerdict(me.pct) === 'off' && clock >= '18:00') bad.push('the health routine slipped')
  if (rag[1].total && rag[1].done === rag[1].total) good.push(rag[1].total === 1 ? 'completed the critical task' : 'completed the critical tasks')
  if (redLate) bad.push(`${redLate} critical task${redLate > 1 ? 's' : ''} still open`)
  if (money.verdict === 'good' && money.month.budget) good.push('stayed within the spending plan')
  if (money.verdict === 'off') bad.push('the month is over budget')
  if (money.verdict === 'mixed') bad.push('spending is ahead of plan')

  const planned = list.length > 0 || me.planned > 0 || money.spentToday > 0 || me.exercised
  let alignment: Alignment
  if (!planned && date >= today) alignment = 'empty'
  else if (bad.length >= 2 || (bad.length >= 1 && good.length === 0)) alignment = 'drifting'
  else if (forward.length && bad.length === 0) alignment = 'forward'
  else alignment = 'on-track'

  const sentence = good.length ? cap(joinAnd(good)) + '.' : bad.length ? cap(joinAnd(bad)) + '.' : date > today ? 'Planning ahead.' : 'Nothing recorded yet.'
  return { date, list, rag, me, devi, money, goals, forward, alignment, good, bad, sentence, headline: forward.length ? (forward.length === 1 ? 'One step forward today' : `${forward.length} steps forward today`) : '' }
}
export type DayReport = ReturnType<typeof dayReport>
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

// ---------- Week and month patterns ----------
export function periodPattern(d: AllData, s: Settings, from: string, to: string, today: string) {
  const end = to < today ? to : today
  const days: DayReport[] = []
  for (let k = from; k <= end; k = addDays(k, 1)) days.push(dayReport(d, s, k, today))
  const count = (a: Alignment) => days.filter((x) => x.alignment === a).length
  const hs = days.map((x) => x.me.pct).filter((x): x is number => x != null)
  const red = days.reduce((a, x) => ({ done: a.done + x.rag[1].done, total: a.total + x.rag[1].total }), { done: 0, total: 0 })
  const all = days.reduce((a, x) => ({ done: a.done + x.rag.done, total: a.total + x.rag.total }), { done: 0, total: 0 })
  const tx = d.transactions.filter((t) => t.date >= from && t.date <= to)
  const mb = monthBudget(d.transactions, s, monthKey(from))
  const spent = tx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const wants = tx.filter((t) => t.type === 'expense' && mb.isWant(t)).reduce((a, t) => a + t.amount, 0)
  const income = tx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const byCat: Record<string, number> = {}
  tx.filter((t) => t.type === 'expense').forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount))
  const missedRed = days.flatMap((x) => (x.date < today ? x.list.filter((y) => y.task.priority === 1 && !y.done).map((y) => y.task.title) : []))
  const goalSteps = days.filter((x) => x.forward.length).length
  const mealsPlanned = days.reduce((a, x) => a + x.me.planned, 0)
  const mealsFollowed = days.reduce((a, x) => a + x.me.followed, 0)
  const exDays = days.filter((x) => x.me.exercised).length
  return {
    days, n: days.length, forward: count('forward'), onTrack: count('on-track'), drifting: count('drifting'),
    healthAvg: hs.length ? Math.round(hs.reduce((a, b) => a + b, 0) / hs.length) : null,
    red, all, spent, wants, needs: spent - wants, income, byCat, missedRed: [...new Set(missedRed)], goalSteps, mealsPlanned, mealsFollowed, exDays,
    month: monthKey(from) === monthKey(to) ? mb : null,
  }
}

export const dayTitle = (key: string) => fromKey(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
