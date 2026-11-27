import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ArrowRight, ChevronDown, ListChecks, Plus } from 'lucide-react'
import { db, type Priority, type Task } from '../lib/db'
import { addDays, friendlyDate } from '../lib/dates'
import { RAG, ragCounts, tasksOn, type DayTask } from '../lib/day'
import { toast } from '../lib/celebrate'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'
import DateBar from '../components/DateBar'

type View = 'day' | 'upcoming' | 'done'

export default function Tasks({ today: t, date, setDate }: { today: string; date: string; setDate: (d: string) => void }) {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const [view, setView] = useState<View>('day')
  const [editing, setEditing] = useState<Task | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [prio, setPrio] = useState<Priority>(1)
  const [showDone, setShowDone] = useState(false)

  const list = tasksOn(tasks, date, t)
  const c = ragCounts(list)
  const goalName = (id?: number) => goals.find((g) => g.id === id)?.title
  const open = (task: Task | null) => { setEditing(task); setFormOpen(true) }
  const isToday = date === t

  const add = async () => {
    const v = title.trim()
    if (!v) return
    await db.tasks.add({ title: v, priority: prio, repeat: 'none', dueDate: date, checklist: [], completions: [], createdAt: new Date().toISOString() })
    setTitle('')
  }
  const greenOpen = list.filter((x) => x.task.priority === 3 && !x.done && x.task.repeat === 'none')
  const carryGreen = async () => {
    const next = addDays(date, 1)
    await Promise.all(greenOpen.map((x) => db.tasks.update(x.task.id!, { dueDate: next })))
    toast(`${greenOpen.length} green task${greenOpen.length > 1 ? 's' : ''} moved to ${friendlyDate(next).toLowerCase()}`)
  }

  const row = (x: DayTask) => <TaskItem key={x.task.id} task={x.task} done={x.done} carried={x.carried} onEdit={open} today={date} isToday={isToday} goalName={goalName(x.task.goalId)} />
  const upcoming = tasks.filter((k) => k.repeat === 'none' && !k.doneAt && k.dueDate && k.dueDate > date).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.priority - b.priority)
  const done = tasks.filter((k) => k.repeat === 'none' && k.doneAt).sort((a, b) => b.doneAt!.localeCompare(a.doneAt!)).slice(0, 40)

  return (
    <div className="px-5 safe-top">
      <p className="eyebrow mt-2">{c.done} of {c.total} done</p>
      <h1 className="h1 mt-1">To-do</h1>
      <DateBar date={date} today={t} onChange={setDate} className="mt-4" />

      {/* Quick add */}
      <div className="card mt-3 p-3">
        <div className="flex gap-2">
          <input className="input" placeholder={isToday ? 'Add a task for today' : `Add a task for ${friendlyDate(date).toLowerCase()}`} aria-label="New task" value={title}
            onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button onClick={add} disabled={!title.trim()} aria-label="Add task" className="btn-primary shrink-0 px-4"><Plus size={18} /></button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((p) => (
            <button key={p} onClick={() => setPrio(p)} aria-pressed={prio === p}
              className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${prio === p ? `${RAG[p].soft} ${RAG[p].text}` : 'text-muted'}`}>
              <span className={`h-2 w-2 rounded-full ${RAG[p].dot}`} />{RAG[p].name}
            </button>
          ))}
        </div>
        <p className="mt-1 px-1 text-center text-2xs text-muted">{RAG[prio].sub}. For a time, repeat or goal, tap a task after adding it.</p>
      </div>

      <div className="seg mt-4 grid-cols-3">
        {([['day', isToday ? 'Today' : friendlyDate(date)], ['upcoming', 'Upcoming'], ['done', 'Completed']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`seg-item ${view === k ? 'seg-item-on' : ''}`}>{l}</button>
        ))}
      </div>

      {view === 'day' && (
        <>
          {([1, 2, 3] as const).map((p) => {
            const items = list.filter((x) => x.task.priority === p && !x.done)
            return (
              <section key={p} className="mt-6">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <h2 className={`flex items-center gap-2 text-sm font-semibold ${RAG[p].text}`}><span className={`h-2.5 w-2.5 rounded-full ${RAG[p].dot}`} />{RAG[p].name}<span className="font-normal text-muted">{RAG[p].sub}</span></h2>
                  <span className="num shrink-0 text-xs text-muted">{c[p].done}/{c[p].total}</span>
                </div>
                <div className="space-y-2">
                  {items.map(row)}
                  {!items.length && <p className="rounded-2xl bg-surface/60 px-4 py-3 text-sm text-faint">{c[p].total ? 'All done.' : 'Nothing here.'}</p>}
                </div>
                {p === 3 && greenOpen.length > 0 && date >= t && (
                  <button onClick={carryGreen} className="btn-secondary mt-2 w-full text-sm">Carry {greenOpen.length} to {friendlyDate(addDays(date, 1)).toLowerCase()}<ArrowRight size={15} /></button>
                )}
              </section>
            )
          })}
          {c.done > 0 && (
            <section className="mt-6">
              <button onClick={() => setShowDone(!showDone)} className="flex w-full items-center justify-between py-2 text-sm font-semibold text-muted">
                Completed ({c.done})<ChevronDown size={16} className={showDone ? 'rotate-180' : ''} />
              </button>
              {showDone && <div className="mt-1 space-y-2">{list.filter((x) => x.done).map(row)}</div>}
            </section>
          )}
          {c.total === 0 && (
            <div className="card mt-4 flex flex-col items-center px-6 py-8 text-center">
              <ListChecks size={26} strokeWidth={1.5} className="text-faint" />
              <p className="mt-3 font-display text-lg">{date < t ? 'Nothing was planned this day' : 'A clear list'}</p>
              <p className="mt-1 text-sm text-muted">Red for what must happen before noon, Amber by 5 PM, Green when there is time.</p>
            </div>
          )}
        </>
      )}
      {view === 'upcoming' && (
        <div className="mt-4 space-y-2">
          {upcoming.map((k) => <TaskItem key={k.id} task={k} onEdit={open} today={t} goalName={goalName(k.goalId)} />)}
          {!upcoming.length && <p className="card p-4 text-sm text-muted">Nothing planned after {friendlyDate(date).toLowerCase()}.</p>}
          {tasks.some((k) => k.repeat !== 'none') && (
            <>
              <h2 className="eyebrow pt-4">Repeating</h2>
              {tasks.filter((k) => k.repeat !== 'none').map((k) => <TaskItem key={k.id} task={k} onEdit={open} today={t} goalName={goalName(k.goalId)} />)}
            </>
          )}
        </div>
      )}
      {view === 'done' && (
        <div className="mt-4 space-y-2">
          {done.map((k) => <TaskItem key={k.id} task={k} onEdit={open} today={t} goalName={goalName(k.goalId)} />)}
          {!done.length && <p className="card p-4 text-sm text-muted">Finished tasks appear here.</p>}
        </div>
      )}
      <button onClick={() => open(null)} className="btn-ghost mt-6 w-full text-sm">More options: repeat, time, checklist</button>
      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editing} date={date} />
    </div>
  )
}
