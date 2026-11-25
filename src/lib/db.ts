import Dexie, { type Table } from 'dexie'

export type Area = 'Health' | 'Wealth' | 'Mind' | 'Work'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'
export type Priority = 1 | 2 | 3 // 1 = high

export interface CheckItem { id: string; text: string; done: boolean }

export interface Task {
  id?: number
  title: string
  notes?: string
  priority: Priority
  area?: Area
  repeat: Repeat
  /** One-off: due date. Repeating: the start date (sets weekday / day of month). */
  dueDate?: string
  /** Optional time of day "HH:MM" — creates a reminder */
  time?: string
  checklist: CheckItem[]
  /** Dates (YYYY-MM-DD) on which a repeating task was ticked */
  completions: string[]
  doneAt?: string
  createdAt: string
}

/** A goal can be fed automatically by data logged elsewhere in the app. */
export type GoalLink = 'weight' | 'runKm' | 'activeMinutes' | 'workouts' | 'netWorth' | 'portfolio' | 'savings' | 'holding' | 'focusHours'

export interface Goal {
  id?: number
  title: string
  area: Area
  term: 'short' | 'long'
  target?: number
  /** Value when the goal started (e.g. 80 kg). Progress is measured from here. */
  start?: number
  current?: number
  unit?: string
  link?: GoalLink
  /** For link 'holding': which investment */
  linkId?: number
  startDate: string
  deadline: string
  milestones: CheckItem[]
  focus: boolean
  completedAt?: string
  createdAt: string
}

export interface Setting { key: string; value: unknown }

export interface WeightEntry { date: string; kg: number }
export interface WaterEntry { id?: number; date: string; ml: number; at: string }
export interface FoodEntry { id?: number; date: string; name: string; kcal: number; meal: Meal; at: string }
export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
export type ActivityType = 'Run' | 'Walk' | 'Cycle' | 'Gym' | 'Yoga' | 'Swim' | 'Sport' | 'Other'
export interface Activity { id?: number; date: string; type: ActivityType; minutes: number; km?: number; notes?: string }
export interface Supplement {
  id?: number
  name: string
  dose: string // e.g. "1 tablet", "500 mg"
  times: string[] // "HH:MM"
  perDose: number // units used per dose
  stock: number // units left
  active: boolean
  createdAt: string
}
export interface DoseLog { id?: number; suppId: number; date: string; time: string; takenAt: string }
export type ReminderRepeat = 'once' | 'daily' | 'weekdays' | 'weekly'
export interface Reminder {
  id?: number
  title: string
  time: string // "HH:MM"
  repeat: ReminderRepeat
  date?: string // for once / weekly anchor
  enabled: boolean
  createdAt: string
}

export type TxType = 'expense' | 'income'
export interface Transaction { id?: number; date: string; type: TxType; amount: number; category: string; note?: string; createdAt: string }
export interface Holding {
  id?: number
  name: string
  kind: string // Stocks, Mutual funds, FD, Gold, Bank, ... (user editable)
  invested: number
  current: number
  maturity?: string
  notes?: string
  updatedAt: string
}
export interface Liability { id?: number; name: string; kind: string; outstanding: number; emi?: number; updatedAt: string }
export interface NetWorthPoint { date: string; assets: number; liabilities: number; net: number }
export interface Review {
  id?: number
  kind: 'daily' | 'weekly' | 'monthly'
  date: string // the day / week start / month start it covers
  wins: string
  improve: string
  tomorrow: string[] // top priorities (daily creates tasks)
  energy?: number // 1-5
  notes?: string
  createdAt: string
}
export interface FocusSession { id?: number; date: string; minutes: number; label?: string; at: string }

class AriseDB extends Dexie {
  tasks!: Table<Task, number>
  goals!: Table<Goal, number>
  settings!: Table<Setting, string>
  weights!: Table<WeightEntry, string>
  water!: Table<WaterEntry, number>
  food!: Table<FoodEntry, number>
  activities!: Table<Activity, number>
  supplements!: Table<Supplement, number>
  doses!: Table<DoseLog, number>
  reminders!: Table<Reminder, number>
  transactions!: Table<Transaction, number>
  holdings!: Table<Holding, number>
  liabilities!: Table<Liability, number>
  netWorth!: Table<NetWorthPoint, string>
  reviews!: Table<Review, number>
  focus!: Table<FocusSession, number>
  constructor() {
    super('arise')
    this.version(1).stores({
      tasks: '++id, repeat, dueDate, doneAt',
      goals: '++id, area, term, deadline, focus',
      settings: 'key',
    })
    this.version(2).stores({
      weights: 'date',
      water: '++id, date',
      food: '++id, date, name',
      activities: '++id, date, type',
      supplements: '++id, active',
      doses: '++id, date, suppId, [suppId+date+time]',
      reminders: '++id, enabled',
    })
    this.version(3).stores({
      transactions: '++id, date, type, category',
      holdings: '++id, kind',
      liabilities: '++id',
      netWorth: 'date',
      reviews: '++id, kind, date, [kind+date]',
      focus: '++id, date',
    })
  }
}

export const db = new AriseDB()
export const uid = () => Math.random().toString(36).slice(2, 10)
