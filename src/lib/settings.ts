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
  // Money (all editable in Money → Setup)
  currency: string
  expenseCategories: string[]
  incomeCategories: string[]
  assetKinds: string[]
  monthlyBudget: number // 0 = none
  budgets: Record<string, number> // per expense category
  // Documents
  docKinds: string[]
  docReminderTime: string
  pinHash?: string // optional lock for Documents (SHA-256 of salt + PIN)
  pinSalt?: string
  // Focus
  focusMinutes: number
  breakMinutes: number
}
export const defaultSettings: Settings = {
  name: '', theme: 'system', onboarded: false,
  calorieTarget: 2000, waterTargetMl: 3000,
  notifications: false, wakeStart: '06:00', wakeEnd: '22:00', waterEveryMin: 90,
  runTime: '06:30', runDays: [1, 3, 5], reviewDay: 0, reviewTime: '19:00', eveningReviewTime: '21:30',
  supplementReminders: true,
  currency: '₹',
  expenseCategories: ['Food & groceries', 'Rent & home', 'Transport', 'Bills & utilities', 'Health', 'Shopping', 'Education', 'Family', 'Giving', 'Travel', 'Other'],
  incomeCategories: ['Salary', 'Business', 'Interest & dividends', 'Other'],
  assetKinds: ['Bank & cash', 'Stocks', 'Mutual funds', 'Fixed deposits', 'PPF / EPF / NPS', 'Gold', 'Real estate', 'Other'],
  monthlyBudget: 0,
  budgets: {},
  docKinds: ['Aadhaar', 'PAN card', 'Passport', 'Visa', 'Driving licence', 'Vehicle RC', 'Car insurance', 'Bike insurance', 'Health insurance', 'Life insurance', 'Home insurance', 'Voter ID', 'Certificates', 'Property', 'Bank and tax', 'Other'],
  docReminderTime: '09:00',
  focusMinutes: 25,
  breakMinutes: 5,
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
