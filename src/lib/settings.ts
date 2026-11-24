import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export type ThemePref = 'system' | 'light' | 'dark'
export interface Settings { name: string; theme: ThemePref; onboarded: boolean }
const defaults: Settings = { name: '', theme: 'system', onboarded: false }

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => {
    const rows = await db.settings.toArray()
    const s: Record<string, unknown> = { ...defaults }
    rows.forEach((r) => (s[r.key] = r.value))
    return s as unknown as Settings
  })
}
export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value })
}
