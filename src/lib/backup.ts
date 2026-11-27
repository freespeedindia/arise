import { db } from './db'
import { todayKey } from './dates'

const TABLES = ['tasks', 'goals', 'settings', 'weights', 'water', 'food', 'activities', 'supplements', 'doses', 'reminders', 'transactions', 'holdings', 'liabilities', 'netWorth', 'reviews', 'focus', 'docs', 'docFiles', 'healthDays', 'wishes'] as const

export async function exportData() {
  const out: Record<string, unknown> = { app: 'arise', version: 5, exportedAt: new Date().toISOString() }
  for (const t of TABLES) out[t] = await db.table(t).toArray()
  // Files are binary: store them as text so they fit in the backup file
  out.docFiles = (out.docFiles as { data: ArrayBuffer }[]).map((f) => ({ ...f, data: toB64(f.data) }))
  const file = new File([JSON.stringify(out, null, 1)], `arise-backup-${todayKey()}.json`, { type: 'application/json' })
  const { downloadFile } = await import('./export')
  downloadFile(file)
}

export async function importData(json: string) {
  const data = JSON.parse(json)
  if (data?.app !== 'arise') throw new Error('Not an Arise backup')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      if (!Array.isArray(data[t])) continue
      await db.table(t).clear()
      const rows = t === 'docFiles' ? data[t].map((f: { data: string }) => ({ ...f, data: fromB64(f.data) })) : data[t]
      await db.table(t).bulkAdd(rows)
    }
  })
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
function fromB64(b64: string): ArrayBuffer {
  const s = atob(b64)
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out.buffer
}
