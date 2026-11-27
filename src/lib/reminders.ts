import type { DocRecord, DoseLog, Goal, Reminder, Supplement, Task } from './db'
import { expiryText, remindToday } from './documents'
import { fromKey } from './dates'
import type { Settings } from './settings'
import { isDoneNow, isDueToday } from './tasks'

export type ReminderKind = 'water' | 'run' | 'supplement' | 'task' | 'custom' | 'review' | 'goal-review' | 'document'
export interface ScheduledReminder { key: string; time: string; title: string; body: string; kind: ReminderKind; done?: boolean }

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export interface ScheduleInput {
  date: string
  settings: Settings
  tasks: Task[]
  supplements: Supplement[]
  doses: DoseLog[]
  reminders: Reminder[]
  goals: Goal[]
  waterMl: number
  docs?: DocRecord[]
}

/** Everything that should remind you on a given date, in time order. */
export function buildSchedule(i: ScheduleInput): ScheduledReminder[] {
  const { date, settings: s } = i
  const dow = fromKey(date).getDay()
  const out: ScheduledReminder[] = []

  if (s.waterEveryMin > 0 && s.trackWater !== false) {
    const waterDone = i.waterMl >= s.waterTargetMl
    for (let m = toMin(s.wakeStart) + s.waterEveryMin; m <= toMin(s.wakeEnd); m += s.waterEveryMin) {
      out.push({ key: `water-${toTime(m)}`, time: toTime(m), kind: 'water', title: 'Time for water', body: `Drink a glass. Today ${(i.waterMl / 1000).toFixed(1)} of ${(s.waterTargetMl / 1000).toFixed(1)} L.`, done: waterDone })
    }
  }
  if (s.runTime && s.runDays.includes(dow)) {
    out.push({ key: 'run', time: s.runTime, kind: 'run', title: 'Run time', body: 'Shoes on. Log it in Health when you finish.' })
  }
  if (s.supplementReminders) {
    for (const sup of i.supplements.filter((x) => x.active)) {
      for (const t of sup.times) {
        const taken = i.doses.some((d) => d.suppId === sup.id && d.date === date && d.time === t)
        out.push({ key: `sup-${sup.id}-${t}`, time: t, kind: 'supplement', title: sup.person === 'devi' ? `${s.childName || 'Devi'}: ${sup.name}` : sup.name, body: `Take ${sup.dose}.`, done: taken })
      }
    }
  }
  for (const t of i.tasks) {
    if (t.time && isDueToday(t, date)) {
      out.push({ key: `task-${t.id}`, time: t.time, kind: 'task', title: t.title, body: 'Scheduled task', done: isDoneNow(t, date) })
    }
  }
  // Red tasks are due by noon, Amber by 5 PM: a nudge 30 minutes before, if any are still open
  for (const [p, time, by] of [[1, '11:30', 'noon'], [2, '16:30', '5 PM']] as const) {
    const open = i.tasks.filter((t) => t.priority === p && !t.time && (t.repeat === 'none' ? !t.doneAt && !!t.dueDate && t.dueDate <= date : isDueToday(t, date) && !isDoneNow(t, date)))
    if (open.length) out.push({ key: `rag-${p}`, time, kind: 'task', title: `${open.length} ${p === 1 ? 'Red' : 'Amber'} task${open.length > 1 ? 's' : ''} due by ${by}`, body: open.slice(0, 3).map((t) => t.title).join(', ') })
  }
  for (const r of i.reminders.filter((x) => x.enabled)) {
    const on =
      r.repeat === 'daily' ||
      (r.repeat === 'weekdays' && dow >= 1 && dow <= 5) ||
      (r.repeat === 'weekly' && !!r.date && fromKey(r.date).getDay() === dow && r.date <= date) ||
      (r.repeat === 'once' && r.date === date)
    if (on) out.push({ key: `rem-${r.id}`, time: r.time, kind: 'custom', title: r.title, body: 'Reminder' })
  }
  if (s.eveningReviewTime) {
    out.push({ key: 'evening', time: s.eveningReviewTime, kind: 'review', title: 'Daily review', body: 'Four quick questions on how today went.' })
  }
  if (s.reviewTime && dow === s.reviewDay && i.goals.some((g) => !g.completedAt)) {
    out.push({ key: 'goal-review', time: s.reviewTime, kind: 'goal-review', title: 'Weekly goal review', body: 'Check each goal: on pace, behind, next milestone.' })
  }
  for (const d of i.docs ?? []) {
    if (remindToday(d, date)) out.push({ key: `doc-${d.id}`, time: s.docReminderTime || '09:00', kind: 'document', title: `${d.title}: ${expiryText(d, date).toLowerCase()}`, body: d.expiresOn ? 'Open Documents in Arise to renew and update the date.' : '' })
  }
  return out.sort((a, b) => a.time.localeCompare(b.time))
}

export function nextReminder(list: ScheduledReminder[], nowTime: string): ScheduledReminder | undefined {
  return list.find((r) => !r.done && r.time > nowTime)
}
export const nowHHMM = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
export { toMin, toTime }
