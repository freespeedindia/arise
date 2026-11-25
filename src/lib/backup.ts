import { db } from './db'
import { todayKey } from './dates'

const TABLES = ['tasks', 'goals', 'settings', 'weights', 'water', 'food', 'activities', 'supplements', 'doses', 'reminders'] as const

export async function exportData() {
  const out: Record<string, unknown> = { app: 'arise', version: 2, exportedAt: new Date().toISOString() }
  for (const t of TABLES) out[t] = await db.table(t).toArray()
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `arise-backup-${todayKey()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export async function importData(json: string) {
  const data = JSON.parse(json)
  if (data?.app !== 'arise') throw new Error('Not an Arise backup')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      if (!Array.isArray(data[t])) continue
      await db.table(t).clear()
      await db.table(t).bulkAdd(data[t])
    }
  })
}
