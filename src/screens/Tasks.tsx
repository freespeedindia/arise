import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type Task } from '../lib/db'
import { isDoneNow, isDueToday, sortTasks } from '../lib/tasks'
import { todayKey } from '../lib/dates'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'
import Fab from '../components/Fab'

type Filter = 'today' | 'upcoming' | 'repeating' | 'anytime' | 'done'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'today', label: '☀️ Today' },
  { id: 'upcoming', label: '📅 Upcoming' },
  { id: 'repeating', label: '🔁 Habits' },
  { id: 'anytime', label: '📝 Anytime' },
  { id: 'done', label: '✅ Done' },
]

export default function Tasks() {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const [filter, setFilter] = useState<Filter>('today')
  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const t = todayKey()

  const list = tasks.filter((k) => {
    switch (filter) {
      case 'today': return isDueToday(k, t) && (k.repeat !== 'none' || !k.doneAt)
      case 'upcoming': return k.repeat === 'none' && !k.doneAt && !!k.dueDate && k.dueDate > t
      case 'repeating': return k.repeat !== 'none'
      case 'anytime': return k.repeat === 'none' && !k.doneAt && !k.dueDate
      case 'done': return k.repeat === 'none' && !!k.doneAt
    }
  }).sort((a, b) => {
    if (filter === 'done') return (b.doneAt || '').localeCompare(a.doneAt || '')
    const d = Number(isDoneNow(a)) - Number(isDoneNow(b))
    return d || sortTasks(a, b)
  })

  const todayList = tasks.filter((k) => isDueToday(k, t) && (k.repeat !== 'none' || !k.doneAt || k.doneAt === t))
  const doneToday = todayList.filter((k) => isDoneNow(k, t)).length

  const open = (task: Task | null) => { setEditing(task); setFormOpen(true) }

  return (
    <div className="px-5 safe-top">
      <div className="mt-4 flex items-end justify-between">
        <h1 className="font-display text-3xl font-extrabold">Tasks</h1>
        <p className="font-bold text-gray-500">{doneToday}/{todayList.length} done today</p>
      </div>
      <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`chip shrink-0 ${filter === f.id ? 'bg-work-500 text-white shadow-md shadow-blue-500/30' : 'bg-white text-gray-600 dark:bg-ink-800 dark:text-gray-300'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {list.map((k) => <TaskItem key={k.id} task={k} onEdit={open} />)}
        {list.length === 0 && (
          <div className="card px-6 py-10 text-center">
            <p className="text-5xl">{filter === 'done' ? '🌱' : '🎉'}</p>
            <p className="mt-3 font-display text-lg font-bold">{filter === 'today' ? 'Nothing left for today' : 'Nothing here yet'}</p>
            <p className="mt-1 text-sm font-semibold text-gray-500">Tap + to add a task.</p>
          </div>
        )}
      </div>
      <Fab onClick={() => open(null)} label="Add task" />
      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editing} />
    </div>
  )
}
