import { db, type Task } from './db'
import { addDays, fromKey, monthKey, prevMonthKey, todayKey, weekStart } from './dates'

/** The "period" a completion belongs to, so streaks count days, weeks or months. */
function periodOf(task: Task, key: string): string {
  if (task.repeat === 'weekly') return weekStart(key)
  if (task.repeat === 'monthly') return monthKey(key)
  return key
}
function prevPeriod(task: Task, p: string): string {
  if (task.repeat === 'weekly') return addDays(p, -7)
  if (task.repeat === 'monthly') return prevMonthKey(p)
  return addDays(p, -1)
}

export function isDoneNow(task: Task, today = todayKey()): boolean {
  if (task.repeat === 'none') return !!task.doneAt
  const p = periodOf(task, today)
  return task.completions.some((c) => periodOf(task, c) === p)
}

/** Consecutive days / weeks / months the task was completed. */
export function streak(task: Task, today = todayKey()): number {
  if (task.repeat === 'none') return 0
  const done = new Set(task.completions.map((c) => periodOf(task, c)))
  let p = periodOf(task, today)
  if (!done.has(p)) p = prevPeriod(task, p)
  let n = 0
  while (done.has(p)) { n++; p = prevPeriod(task, p) }
  return n
}

/** Should this task appear in "Today"? */
export function isDueToday(task: Task, today = todayKey()): boolean {
  if (task.repeat === 'none') return !!task.dueDate && task.dueDate <= today
  if (task.dueDate && task.dueDate > today) return false
  if (task.repeat === 'daily') return true
  const anchor = task.dueDate ? fromKey(task.dueDate) : fromKey(task.createdAt.slice(0, 10))
  const t = fromKey(today)
  if (task.repeat === 'weekly') {
    // Due from its weekday onward, until done this week
    const anchorDow = (anchor.getDay() + 6) % 7
    const todayDow = (t.getDay() + 6) % 7
    return todayDow >= anchorDow
  }
  // monthly
  const day = Math.min(anchor.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())
  return t.getDate() >= day
}

export function isOverdue(task: Task, today = todayKey()): boolean {
  return task.repeat === 'none' && !task.doneAt && !!task.dueDate && task.dueDate < today
}

export async function toggleTask(task: Task, today = todayKey()): Promise<boolean> {
  if (task.id == null) return false
  if (task.repeat === 'none') {
    const doneAt = task.doneAt ? undefined : today
    await db.tasks.update(task.id, { doneAt })
    return !!doneAt
  }
  const p = periodOf(task, today)
  const already = task.completions.some((c) => periodOf(task, c) === p)
  const completions = already
    ? task.completions.filter((c) => periodOf(task, c) !== p)
    : [...task.completions, today]
  await db.tasks.update(task.id, { completions })
  return !already
}

/** Sort: overdue first, then priority, then due date. */
export function sortTasks(a: Task, b: Task): number {
  const ao = isOverdue(a) ? 0 : 1
  const bo = isOverdue(b) ? 0 : 1
  if (ao !== bo) return ao - bo
  if (a.priority !== b.priority) return a.priority - b.priority
  return (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
}

export const repeatLabel: Record<Task['repeat'], string> = {
  none: 'One-off', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
}
export const streakUnit: Record<Task['repeat'], string> = {
  none: '', daily: 'day', weekly: 'week', monthly: 'month',
}
