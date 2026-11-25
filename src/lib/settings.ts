import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export type ThemePref = 'system' | 'light' | 'dark'
export interface Settings {
  name: string
  theme: ThemePref
  onboarded: boolean
  // Health plan
  startWeight?: number
  targetWeight?: number
  planStart?: string
  planEnd?: string
  heightCm?: number
  calorieTarget: number
  waterTargetMl: number
  // Reminders
  notifications: boolean
  wakeStart: string // "06:00"
  wakeEnd: string // "22:00"
  waterEveryMin: number // 0 = off
  runTime: string // "" = off
  runDays: number[] // 0=Sun..6=Sat
  reviewDay: number // weekly goal review, 0 = Sunday
  reviewTime: string
  eveningReviewTime: string
  supplementReminders: boolean
}
export const defaultSettings: Settings = {
  name: '', theme: 'system', onboarded: false,
  calorieTarget: 2000, waterTargetMl: 3000,
  notifications: false, wakeStart: '06:00', wakeEnd: '22:00', waterEveryMin: 90,
  runTime: '06:30', runDays: [1, 3, 5], reviewDay: 0, reviewTime: '19:00', eveningReviewTime: '21:30',
  supplementReminders: true,
}

export async function readSettings(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const s: Record<string, unknown> = { ...defaultSettings }
  rows.forEach((r) => (s[r.key] = r.value))
  return s as unknown as Settings
}
export function useSettings(): Settings | undefined {
  return useLiveQuery(readSettings)
}
export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value })
}
export async function setSettings(values: Partial<Settings>) {
  await db.settings.bulkPut(Object.entries(values).map(([key, value]) => ({ key, value })))
}
