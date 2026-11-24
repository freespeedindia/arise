import type { Area, Goal } from './db'
import { daysBetween, todayKey } from './dates'

export function goalPercent(g: Goal): number {
  if (g.completedAt) return 100
  if (g.target && g.target > 0) return Math.max(0, Math.min(100, Math.round(((g.current || 0) / g.target) * 100)))
  if (g.milestones.length) return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100)
  return 0
}

export type Pace = 'done' | 'ahead' | 'on' | 'behind' | 'overdue'
export function goalPace(g: Goal, today = todayKey()): Pace {
  const pct = goalPercent(g)
  if (pct >= 100) return 'done'
  if (today > g.deadline) return 'overdue'
  const total = Math.max(1, daysBetween(g.startDate, g.deadline))
  const elapsed = Math.max(0, daysBetween(g.startDate, today))
  const expected = (elapsed / total) * 100
  if (pct >= expected + 10) return 'ahead'
  if (pct >= expected - 5) return 'on'
  return 'behind'
}
export const paceLabel: Record<Pace, string> = {
  done: 'Completed', ahead: 'Ahead of pace', on: 'On pace', behind: 'Behind pace', overdue: 'Past deadline',
}
export const daysLeft = (g: Goal) => daysBetween(todayKey(), g.deadline)

export const AREAS: Area[] = ['Health', 'Wealth', 'Mind', 'Work']
export const areaStyle: Record<Area, { grad: string; text: string; bg: string; ring: string; hex: string; emoji: string; soft: string }> = {
  Health: { grad: 'from-emerald-400 to-green-600', text: 'text-health-600 dark:text-health-400', bg: 'bg-health-500', ring: 'ring-health-500', hex: '#22C55E', emoji: '💪', soft: 'bg-green-50 dark:bg-green-500/10' },
  Wealth: { grad: 'from-yellow-300 to-amber-500', text: 'text-wealth-600 dark:text-wealth-400', bg: 'bg-wealth-500', ring: 'ring-wealth-500', hex: '#EAB308', emoji: '💰', soft: 'bg-yellow-50 dark:bg-yellow-500/10' },
  Mind:   { grad: 'from-orange-300 to-saffron-600', text: 'text-mind-600 dark:text-mind-400', bg: 'bg-mind-500', ring: 'ring-mind-500', hex: '#FF8C1A', emoji: '🧘', soft: 'bg-orange-50 dark:bg-orange-500/10' },
  Work:   { grad: 'from-sky-400 to-blue-600', text: 'text-work-600 dark:text-work-400', bg: 'bg-work-500', ring: 'ring-work-500', hex: '#3B82F6', emoji: '🚀', soft: 'bg-blue-50 dark:bg-blue-500/10' },
}
