import { db, type Activity, type Goal, type Supplement, type WeightEntry } from './db'
import { addDays, daysBetween, todayKey } from './dates'
import type { Settings } from './settings'

/** Planned weight on a given date: a straight line from start to target. */
export function plannedWeight(s: Pick<Settings, 'startWeight' | 'targetWeight' | 'planStart' | 'planEnd'>, date: string): number | undefined {
  if (s.startWeight == null || s.targetWeight == null || !s.planStart || !s.planEnd) return undefined
  const total = Math.max(1, daysBetween(s.planStart, s.planEnd))
  const t = Math.min(Math.max(daysBetween(s.planStart, date), 0), total)
  return +(s.startWeight + ((s.targetWeight - s.startWeight) * t) / total).toFixed(2)
}
export function weeklyChange(s: Pick<Settings, 'startWeight' | 'targetWeight' | 'planStart' | 'planEnd'>): number | undefined {
  if (s.startWeight == null || s.targetWeight == null || !s.planStart || !s.planEnd) return undefined
  const weeks = Math.max(1, daysBetween(s.planStart, s.planEnd) / 7)
  return +((s.targetWeight - s.startWeight) / weeks).toFixed(2)
}
export const latestWeight = (w: WeightEntry[]) => [...w].sort((a, b) => b.date.localeCompare(a.date))[0]

/** Status of today's weight against the plan, allowing 0.3 kg of daily noise. */
export function weightStatus(s: Settings, latest?: WeightEntry): 'ahead' | 'on' | 'behind' | undefined {
  if (!latest) return undefined
  const plan = plannedWeight(s, latest.date)
  if (plan == null || s.startWeight == null || s.targetWeight == null) return undefined
  const losing = s.targetWeight < s.startWeight
  const diff = losing ? plan - latest.kg : latest.kg - plan
  if (diff > 0.3) return 'ahead'
  if (diff >= -0.3) return 'on'
  return 'behind'
}

/** BMI, if height known */
export const bmi = (kg?: number, cm?: number) => (kg && cm ? +(kg / (cm / 100) ** 2).toFixed(1) : undefined)

export function daysOfStock(s: Supplement): number {
  const perDay = s.perDose * Math.max(1, s.times.length)
  return perDay > 0 ? Math.floor(s.stock / perDay) : Infinity
}
export const LOW_STOCK_DAYS = 7

/** Value a linked goal should show, computed from logged data. */
export function linkedValue(g: Goal, weights: WeightEntry[], acts: Activity[]): number | undefined {
  switch (g.link) {
    case 'weight': return latestWeight(weights)?.kg
    case 'runKm': return +acts.filter((a) => a.type === 'Run' && a.date >= g.startDate).reduce((s, a) => s + (a.km || 0), 0).toFixed(1)
    case 'activeMinutes': return acts.filter((a) => a.date >= g.startDate).reduce((s, a) => s + a.minutes, 0)
    case 'workouts': return acts.filter((a) => a.date >= g.startDate).length
    default: return undefined
  }
}

/** Keep every linked goal up to date. Call after any health log changes. */
export async function syncLinkedGoals(): Promise<void> {
  const goals = (await db.goals.toArray()).filter((g) => g.link)
  if (!goals.length) return
  const [weights, acts] = await Promise.all([db.weights.toArray(), db.activities.toArray()])
  const { goalPercent } = await import('./goals')
  for (const g of goals) {
    const v = linkedValue(g, weights, acts)
    if (v == null || v === g.current) continue
    const next = { ...g, current: v }
    const done = goalPercent({ ...next, completedAt: undefined }) >= 100
    await db.goals.update(g.id!, { current: v, completedAt: done ? g.completedAt ?? todayKey() : undefined })
  }
}

/** Creates or updates the Health goal that mirrors the weight plan. */
export async function upsertWeightGoal(s: Pick<Settings, 'startWeight' | 'targetWeight' | 'planStart' | 'planEnd'>) {
  if (s.startWeight == null || s.targetWeight == null || !s.planStart || !s.planEnd) return
  const existing = (await db.goals.toArray()).find((g) => g.link === 'weight' && !g.completedAt)
  const losing = s.targetWeight < s.startWeight
  const data: Partial<Goal> = {
    title: `${losing ? 'Reach' : 'Build up to'} ${s.targetWeight} kg`,
    area: 'Health', start: s.startWeight, target: s.targetWeight, unit: 'kg', link: 'weight',
    startDate: s.planStart, deadline: s.planEnd,
    term: daysBetween(s.planStart, s.planEnd) > 120 ? 'long' : 'short',
  }
  if (existing) await db.goals.update(existing.id!, data)
  else await db.goals.add({ ...(data as Goal), current: s.startWeight, milestones: [], focus: false, createdAt: new Date().toISOString() })
  await syncLinkedGoals()
}

export const waterToday = async (date = todayKey()) => (await db.water.where('date').equals(date).toArray()).reduce((s, w) => s + w.ml, 0)

/** Last 7 days of keys, oldest first */
export const lastDays = (n: number, end = todayKey()) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1))
