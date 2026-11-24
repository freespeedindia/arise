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
  /** One-off: due date. Repeating: the anchor date (weekday / day of month). */
  dueDate?: string
  checklist: CheckItem[]
  /** Dates (YYYY-MM-DD) on which a repeating task was ticked */
  completions: string[]
  /** One-off tasks: when done */
  doneAt?: string
  createdAt: string
}

export interface Goal {
  id?: number
  title: string
  area: Area
  term: 'short' | 'long'
  /** Optional measurable target, e.g. 10 (kg), 500000 (₹), 12 (books) */
  target?: number
  current?: number
  unit?: string
  startDate: string
  deadline: string
  milestones: CheckItem[]
  focus: boolean
  completedAt?: string
  createdAt: string
}

export interface Setting { key: string; value: unknown }

class AriseDB extends Dexie {
  tasks!: Table<Task, number>
  goals!: Table<Goal, number>
  settings!: Table<Setting, string>
  constructor() {
    super('arise')
    this.version(1).stores({
      tasks: '++id, repeat, dueDate, doneAt',
      goals: '++id, area, term, deadline, focus',
      settings: 'key',
    })
  }
}

export const db = new AriseDB()

export const uid = () => Math.random().toString(36).slice(2, 10)
