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
  /** Categories that start as Want when you add an expense (you can switch each one) */
  wantCategories: string[]
  // Health
  childName: string
  routineMe: string[]
  routineDevi: string[]
  trackWater: boolean
  /** Set once the 0.7 refinement has updated older settings */
  refinedV7?: boolean
  // Documents
  docKinds: string[]
  docReminderTime: string
  pinHash?: string // optional lock for Documents (SHA-256 of salt + PIN)
  pinSalt?: string
  // Focus
  focusMinutes: number
  breakMinutes: number
}
export const EXPENSE_CATEGORIES = [
  'Household & groceries', 'Devi (activities, education)', 'Food & dining out', 'Entertainment & subscriptions',
  'Clothing & personal', 'Household operations', 'Travel', 'Business', 'Other',
]
export const WANT_CATEGORIES = ['Food & dining out', 'Entertainment & subscriptions', 'Clothing & personal', 'Travel']
export const defaultSettings: Settings = {
  name: '', theme: 'system', onboarded: false,
  calorieTarget: 2000, waterTargetMl: 3000,
  notifications: false, wakeStart: '06:00', wakeEnd: '22:00', waterEveryMin: 90,
  runTime: '06:30', runDays: [1, 3, 5], reviewDay: 0, reviewTime: '19:00', eveningReviewTime: '21:30',
  supplementReminders: true,
  currency: '₹',
  expenseCategories: EXPENSE_CATEGORIES,
  incomeCategories: ['Salary', 'Business', 'Interest', 'Gift', 'Other'],
  assetKinds: ['Bank & cash', 'Stocks', 'Mutual funds', 'Fixed deposits', 'PPF / EPF / NPS', 'Gold', 'Real estate', 'Other'],
  monthlyBudget: 0,
  budgets: {},
  wantCategories: WANT_CATEGORIES,
  childName: 'Devi',
  routineMe: ['Up by 6:30', 'Morning walk or stretch', 'No screens after 10 PM', 'In bed by 10:30'],
  routineDevi: ['Breakfast before school', 'Outdoor play', 'Homework done', 'Bed by 9 PM'],
  trackWater: true,
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

/** Older installs: switch to the simpler spending categories once. Entries keep their old category names. */
export async function migrateSettings() {
  const s = await readSettings()
  if (s.refinedV7) return
  const stored = await db.settings.get('expenseCategories')
  const values: Partial<Settings> = { refinedV7: true }
  if (stored) {
    values.expenseCategories = EXPENSE_CATEGORIES
    values.incomeCategories = defaultSettings.incomeCategories
    values.wantCategories = WANT_CATEGORIES
    values.budgets = {}
  }
  await setSettings(values)
}
