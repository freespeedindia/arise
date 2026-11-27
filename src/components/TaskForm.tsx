import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid, type CheckItem, type Priority, type Repeat, type Task } from '../lib/db'
import { todayKey } from '../lib/dates'
import { RAG } from '../lib/day'

export default function TaskForm({ open, onClose, task, date }: { open: boolean; onClose: () => void; task?: Task | null; date?: string }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>(2)
  const [repeat, setRepeat] = useState<Repeat>('none')
  const [dueDate, setDueDate] = useState(todayKey())
  const [time, setTime] = useState('')
  const [goalId, setGoalId] = useState<number | undefined>()
  const goals = (useLiveQuery(() => db.goals.toArray()) ?? []).filter((g) => !g.completedAt || g.id === task?.goalId)
  const [checklist, setChecklist] = useState<CheckItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setPriority(task?.priority ?? 2)
    setRepeat(task?.repeat ?? 'none')
    setDueDate(task ? task.dueDate ?? '' : date ?? todayKey())
    setTime(task?.time ?? '')
    setGoalId(task?.goalId)
    setChecklist(task?.checklist ?? [])
    setNewItem('')
    setConfirmDelete(false)
  }, [open, task, date])

  const addItem = () => {
    if (!newItem.trim()) return
    setChecklist([...checklist, { id: uid(), text: newItem.trim(), done: false }])
    setNewItem('')
  }
  const save = async () => {
    if (!title.trim()) return
    const items = newItem.trim() ? [...checklist, { id: uid(), text: newItem.trim(), done: false }] : checklist
    const data = { title: title.trim(), priority, repeat, dueDate: dueDate || (repeat !== 'none' ? todayKey() : undefined), time: time || undefined, goalId, checklist: items }
    if (task?.id != null) await db.tasks.update(task.id, data)
    else await db.tasks.add({ ...data, completions: [], createdAt: new Date().toISOString() })
    onClose()
  }
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    if (task?.id != null) await db.tasks.delete(task.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="task-title">Task</label>
          <input id="task-title" autoFocus className="input text-[17px]" placeholder="What needs doing?" value={title}
            onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <span className="label">Priority</span>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((p) => (
              <button key={p} onClick={() => setPriority(p)} aria-pressed={priority === p}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-2xl px-1 text-center ${priority === p ? `${RAG[p].soft} ${RAG[p].text}` : 'bg-sunken text-muted'}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${RAG[p].dot}`} />{RAG[p].name}</span>
                <span className="text-2xs leading-tight">{RAG[p].sub}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Repeat</span>
          <div className="seg grid-cols-4">
            {(['none', 'daily', 'weekly', 'monthly'] as Repeat[]).map((r) => (
              <button key={r} onClick={() => setRepeat(r)} className={`seg-item capitalize ${repeat === r ? 'seg-item-on' : ''}`}>{r === 'none' ? 'Once' : r}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="task-date">{repeat === 'none' ? 'Due date' : 'Starts'}</label>
            <input id="task-date" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="task-time">Remind at</label>
            <input id="task-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        {repeat !== 'none' && (
          <p className="-mt-3 text-xs text-muted">
            {repeat === 'weekly' ? 'Repeats every week on the weekday of the start date.' : repeat === 'monthly' ? 'Repeats every month on the day of the start date (last day in shorter months).' : 'Repeats every day from the start date.'}
          </p>
        )}
        <div>
          <label className="label" htmlFor="task-goal">Moves this goal forward (optional)</label>
          <select id="task-goal" className="input" value={goalId ?? ''} onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">No goal</option>
            {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        <div>
          <span className="label">Checklist</span>
          <div className="space-y-2">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-xl bg-sunken px-4 py-2.5">
                <span className="flex-1 text-sm">{c.text}</span>
                <button onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))} className="text-faint" aria-label="Remove step"><X size={16} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input" placeholder="Add a step" aria-label="Add a step" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} />
              <button onClick={addItem} aria-label="Add step" className="btn-secondary px-4"><Plus size={18} /></button>
            </div>
          </div>
        </div>
        <button onClick={save} disabled={!title.trim()} className="btn-primary w-full">{task ? 'Save changes' : 'Add task'}</button>
        {task && <button onClick={remove} className="btn-ghost w-full text-crimson">{confirmDelete ? 'Tap again to delete' : 'Delete task'}</button>}
      </div>
    </Sheet>
  )
}
