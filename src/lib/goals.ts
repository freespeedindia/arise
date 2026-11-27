import type { Area, Goal } from './db'
import { daysBetween, todayKey } from './dates'

export function goalPercent(g: Goal): number {
  if (g.completedAt) return 100
  if (g.target != null) {
    const start = g.start ?? 0
    const span = g.target - start
    if (span === 0) return (g.current ?? start) === g.target ? 100 : 0
    // Works for goals that go up (savings) and down (weight)
    return Math.max(0, Math.min(100, Math.round((((g.current ?? start) - start) / span) * 100)))
  }
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

export const AREAS: Area[] = ['Health', 'Wealth', 'Work', 'Mind']
/** Names shown on screen. Stored values stay the same so older data keeps working. */
export const AREA_LABEL: Record<Area, string> = { Health: 'Health', Wealth: 'Money', Work: 'Work', Mind: 'Personal' }
/** Area colours: Health green, Wealth gold, Mind saffron, Work deep red */
export const areaStyle: Record<Area, { text: string; bg: string; soft: string; border: string; color: string }> = {
  Health: { text: 'text-forest', bg: 'bg-forest', soft: 'bg-forest-soft', border: 'border-forest', color: 'rgb(var(--forest))' },
  Wealth: { text: 'text-gold', bg: 'bg-gold', soft: 'bg-gold-soft', border: 'border-gold', color: 'rgb(var(--gold))' },
  Mind: { text: 'text-saffron', bg: 'bg-saffron', soft: 'bg-saffron-soft', border: 'border-saffron', color: 'rgb(var(--saffron))' },
  Work: { text: 'text-crimson', bg: 'bg-crimson', soft: 'bg-crimson-soft', border: 'border-crimson', color: 'rgb(var(--crimson))' },
}
export const paceTone: Record<Pace, string> = {
  done: 'text-forest', ahead: 'text-forest', on: 'text-gold', behind: 'text-crimson', overdue: 'text-crimson',
}
