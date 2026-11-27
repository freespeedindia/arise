import { db, type Activity, type DoseLog, type FocusSession, type FoodEntry, type Goal, type HealthDay, type Wish, type Holding, type Liability, type NetWorthPoint, type Review, type DocRecord, type Supplement, type Task, type Transaction, type WaterEntry, type WeightEntry } from './db'
import { addDays, daysBetween, monthKey, todayKey } from './dates'
import { totals } from './money'

export interface AllData {
  tasks: Task[]; goals: Goal[]; weights: WeightEntry[]; water: WaterEntry[]; food: FoodEntry[]; activities: Activity[]
  supplements: Supplement[]; doses: DoseLog[]; transactions: Transaction[]; holdings: Holding[]; liabilities: Liability[]
  netWorth: NetWorthPoint[]; reviews: Review[]; focus: FocusSession[]; docs: DocRecord[]
  healthDays: HealthDay[]; wishes: Wish[]
}
export async function loadAll(): Promise<AllData> {
  const [tasks, goals, weights, water, food, activities, supplements, doses, transactions, holdings, liabilities, netWorth, reviews, focus, docs, healthDays, wishes] = await Promise.all([
    db.tasks.toArray(), db.goals.toArray(), db.weights.orderBy('date').toArray(), db.water.toArray(), db.food.toArray(), db.activities.toArray(),
    db.supplements.toArray(), db.doses.toArray(), db.transactions.toArray(), db.holdings.toArray(), db.liabilities.toArray(),
    db.netWorth.orderBy('date').toArray(), db.reviews.toArray(), db.focus.toArray(), db.docs.toArray(),
    db.healthDays.toArray(), db.wishes.toArray(),
  ])
  return { tasks, goals, weights, water, food, activities, supplements, doses, transactions, holdings, liabilities, netWorth, reviews, focus, docs, healthDays, wishes }
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to

/** Everything that happened between two dates (inclusive), in plain numbers. */
export function periodSummary(d: AllData, from: string, to: string, today = todayKey()) {
  // Averages only count days that have happened so far
  const end = to < today ? to : today
  const days = Math.max(1, daysBetween(from, end) + 1)
  const tasksDone =
    d.tasks.filter((t) => t.repeat === 'none' && t.doneAt && inRange(t.doneAt, from, to)).length +
    d.tasks.reduce((n, t) => n + (t.repeat === 'none' ? 0 : t.completions.filter((c) => inRange(c, from, to)).length), 0)
  const waterIn = d.water.filter((w) => inRange(w.date, from, to))
  const water = waterIn.reduce((a, w) => a + w.ml, 0)
  const waterDays = new Set(waterIn.map((w) => w.date)).size
  const food = d.food.filter((f) => inRange(f.date, from, to))
  const foodDays = new Set(food.map((f) => f.date)).size
  const acts = d.activities.filter((a) => inRange(a.date, from, to))
  const w = d.weights.filter((x) => inRange(x.date, from, to))
  const tx = d.transactions.filter((t) => inRange(t.date, from, to))
  const income = tx.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const spent = tx.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const byCat: Record<string, number> = {}
  tx.filter((t) => t.type === 'expense').forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount))
  const focusMin = d.focus.filter((f) => inRange(f.date, from, to)).reduce((a, f) => a + f.minutes, 0)
  // supplement adherence: taken / scheduled
  const active = d.supplements.filter((s) => s.active)
  const scheduled = active.reduce((a, s) => {
    const start = s.createdAt.slice(0, 10) > from ? s.createdAt.slice(0, 10) : from
    return a + s.times.length * Math.max(0, daysBetween(start, end) + 1)
  }, 0)
  const taken = d.doses.filter((x) => inRange(x.date, from, to) && active.some((s) => s.id === x.suppId)).length
  const nwBefore = [...d.netWorth].filter((p) => p.date < from).slice(-1)[0] ?? d.netWorth.find((p) => inRange(p.date, from, to))
  const nwEnd = [...d.netWorth].filter((p) => p.date <= to).slice(-1)[0]
  return {
    from, to, days, tasksDone,
    // per day you logged water (days before you started using the app are not counted)
    waterAvgL: waterDays ? +(water / waterDays / 1000).toFixed(1) : 0,
    kcalAvg: foodDays ? Math.round(food.reduce((a, f) => a + f.kcal, 0) / foodDays) : 0,
    workouts: acts.length,
    activeMin: acts.reduce((a, x) => a + x.minutes, 0),
    runKm: +acts.filter((a) => a.type === 'Run').reduce((s, a) => s + (a.km || 0), 0).toFixed(1),
    weightStart: w[0]?.kg, weightEnd: w[w.length - 1]?.kg,
    income, spent, saved: income - spent, rate: income ? Math.round(((income - spent) / income) * 100) : 0, byCat,
    focusMin, adherence: scheduled ? Math.round((taken / scheduled) * 100) : null,
    netWorthChange: nwBefore && nwEnd && nwBefore.date !== nwEnd.date ? nwEnd.net - nwBefore.net : null,
    netWorth: totals(d.holdings, d.liabilities).net,
  }
}
export type PeriodSummary = ReturnType<typeof periodSummary>

export function rangeFor(kind: Review['kind'], date: string): [string, string] {
  if (kind === 'daily') return [date, date]
  if (kind === 'weekly') return [date, addDays(date, 6)]
  const [y, m] = date.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${monthKey(date)}-01`, `${monthKey(date)}-${String(last).padStart(2, '0')}`]
}

/** Save a review; for the daily review, tomorrow's priorities become high priority tasks. */
export async function saveReview(r: Omit<Review, 'id' | 'createdAt'>, existing?: Review | null) {
  const data = { ...r, createdAt: existing?.createdAt ?? new Date().toISOString() }
  if (existing?.id != null) await db.reviews.update(existing.id, data)
  else await db.reviews.add(data)
  const prevPlanned = new Set(existing?.tomorrow ?? [])
  const due = r.kind === 'daily' ? addDays(r.date, 1) : r.kind === 'weekly' ? addDays(r.date, 7) : undefined
  const fresh = r.tomorrow.map((x) => x.trim()).filter((x) => x && !prevPlanned.has(x))
  for (const title of fresh) {
    await db.tasks.add({ title, priority: 1, repeat: 'none', dueDate: due ?? addDays(todayKey(), 1), checklist: [], completions: [], createdAt: new Date().toISOString() })
  }
  return fresh.length
}
