import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ListChecks } from 'lucide-react'
import { db, type Task } from '../lib/db'
import { isDoneNow, isDueToday, sortTasks } from '../lib/tasks'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'
import Fab from '../components/Fab'

type Filter = 'today' | 'upcoming' | 'habits' | 'anytime' | 'done'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'habits', label: 'Recurring' },
  { id: 'anytime', label: 'Someday' }, { id: 'done', label: 'Completed' },
]

export default function Tasks({ today: t }: { today: string }) {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const [filter, setFilter] = useState<Filter>('today')
  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const todayList = tasks.filter((k) => isDueToday(k, t) && (k.repeat !== 'none' || !k.doneAt || k.doneAt === t))
  const list = (filter === 'today' ? todayList : tasks.filter((k) => {
    switch (filter) {
      case 'upcoming': return !!k.dueDate && k.dueDate > t && (k.repeat !== 'none' || !k.doneAt)
      case 'habits': return k.repeat !== 'none'
      case 'anytime': return k.repeat === 'none' && !k.doneAt && !k.dueDate
      case 'done': return k.repeat === 'none' && !!k.doneAt
    }
  })).sort((a, b) => {
    if (filter === 'done') return (b.doneAt || '').localeCompare(a.doneAt || '')
    if (filter === 'upcoming') return (a.dueDate || '').localeCompare(b.dueDate || '')
    return Number(isDoneNow(a, t)) - Number(isDoneNow(b, t)) || sortTasks(a, b)
  })
  const doneToday = todayList.filter((k) => isDoneNow(k, t)).length
  const open = (task: Task | null) => { setEditing(task); setFormOpen(true) }

  return (
    <div className="px-5 safe-top">
      <p className="eyebrow mt-2">{doneToday} of {todayList.length} done today</p>
      <h1 className="h1 mt-1">Tasks</h1>
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`chip ${filter === f.id ? 'chip-on' : ''}`}>{f.label}</button>
        ))}
      </div>
      <div className="mt-4 space-y-2.5">
        {list.map((k) => <TaskItem key={k.id} task={k} onEdit={open} today={t} />)}
        {list.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-10 text-center">
            <ListChecks size={28} strokeWidth={1.5} className="text-faint" />
            <p className="mt-3 font-display text-lg">{filter === 'today' ? 'Nothing left for today' : 'Nothing here yet'}</p>
            <p className="mt-1 text-sm text-muted">Tap + to add a task.</p>
          </div>
        )}
      </div>
      <Fab onClick={() => open(null)} label="Add task" />
      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editing} />
    </div>
  )
}
