import Dexie, { type Table } from 'dexie'

export type Area = 'Health' | 'Wealth' | 'Mind' | 'Work'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'
export type Priority = 1 | 2 | 3 // 1 = high

export interface CheckItem { id: string; text: string; done: boolean; /** day it was ticked */ doneOn?: string }

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
  /** Optional link to the goal this task moves forward */
  goalId?: number
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
  /** Status you set yourself. When empty, Arise works it out from your progress. */
  status?: GoalStatus
  completedAt?: string
  createdAt: string
}

export type GoalStatus = 'not-started' | 'in-progress' | 'on-track' | 'at-risk' | 'completed'

export interface Setting { key: string; value: unknown }

export interface WeightEntry { date: string; kg: number }
export interface WaterEntry { id?: number; date: string; ml: number; at: string }
export interface FoodEntry { id?: number; date: string; name: string; kcal: number; meal: Meal; at: string }
export type Meal = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
export type ActivityType = 'Run' | 'Walk' | 'Cycle' | 'Gym' | 'Yoga' | 'Swim' | 'Sport' | 'Other'
export type Person = 'me' | 'devi'
export interface Activity { id?: number; person?: Person; date: string; type: ActivityType; minutes: number; km?: number; notes?: string }
export interface Supplement {
  id?: number
  name: string
  dose: string // e.g. "1 tablet", "500 mg"
  times: string[] // "HH:MM"
  perDose: number // units used per dose
  stock: number // units left
  active: boolean
  /** Whose supplement: you (default) or Devi */
  person?: Person
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
export type NeedWant = 'need' | 'want'
/** note holds the description (money out) or the source (money in). */
export interface Transaction { id?: number; date: string; type: TxType; amount: number; category: string; note?: string; need?: NeedWant; wishId?: number; createdAt: string }
/** Something you want to buy later. It becomes an expense when you buy it. */
export interface Wish { id?: number; title: string; amount?: number; category?: string; addedAt: string; boughtAt?: string; txId?: number }

export type MealSlot = 'breakfast' | 'lunch' | 'snacks' | 'dinner'
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snacks', 'dinner']
/** One person's day: the meal plan, whether it was followed, and the routine ticks. */
export interface HealthDay {
  person: Person
  date: string
  meals: Partial<Record<MealSlot, string>>
  followed: Partial<Record<MealSlot, boolean>>
  routine: string[] // routine items ticked that day
  notes?: string
}
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

/** A personal document: ID, licence, policy, certificate... Files are stored separately. */
export interface DocRecord {
  id?: number
  title: string
  kind: string // Aadhaar, Passport, Car insurance... (user editable)
  number?: string // document / policy number
  holder?: string // whose document (you, spouse, car KA-01-...)
  issuer?: string // issued by / insurer
  issuedOn?: string
  expiresOn?: string
  remindDays: number // start reminding this many days before expiry
  amount?: number // premium or fee to renew
  notes?: string
  createdAt: string
  updatedAt: string
}
export interface DocFile { id?: number; docId: number; name: string; type: string; size: number; data: ArrayBuffer; thumb?: string; addedAt: string }

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
  docs!: Table<DocRecord, number>
  docFiles!: Table<DocFile, number>
  healthDays!: Table<HealthDay, [Person, string]>
  wishes!: Table<Wish, number>
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
    this.version(4).stores({
      docs: '++id, kind, expiresOn',
      docFiles: '++id, docId',
    })
    this.version(5).stores({
      healthDays: '[person+date], date',
      wishes: '++id, boughtAt',
    })
  }
}

export const db = new AriseDB()
export const uid = () => Math.random().toString(36).slice(2, 10)
