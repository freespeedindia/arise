import { useLiveQuery } from 'dexie-react-hooks'
import { db, type HealthDay, type Person } from './db'
import { loadAll } from './report'
import { emptyDay } from './day'

/** Everything, kept live. The data is small, so one query keeps all screens in step. */
export const useAllData = () => useLiveQuery(loadAll)

export async function saveDay(person: Person, date: string, patch: (d: HealthDay) => Partial<HealthDay>) {
  const cur = (await db.healthDays.get([person, date])) ?? emptyDay(person, date)
  await db.healthDays.put({ ...cur, ...patch(cur) })
}
