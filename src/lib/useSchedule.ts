import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { buildSchedule, type ScheduledReminder } from './reminders'
import { readSettings } from './settings'

/** Today's full reminder schedule, kept live as data changes. */
export function useSchedule(date: string): ScheduledReminder[] | undefined {
  return useLiveQuery(async () => {
    const [settings, tasks, supplements, doses, reminders, goals, water, docs] = await Promise.all([
      readSettings(), db.tasks.toArray(), db.supplements.toArray(), db.doses.where('date').equals(date).toArray(),
      db.reminders.toArray(), db.goals.toArray(), db.water.where('date').equals(date).toArray(), db.docs.toArray(),
    ])
    return buildSchedule({ date, settings, tasks, supplements, doses, reminders, goals, waterMl: water.reduce((s, w) => s + w.ml, 0), docs })
  }, [date])
}
