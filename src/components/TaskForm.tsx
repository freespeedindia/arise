import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import { db, uid, type Area, type CheckItem, type Priority, type Repeat, type Task } from '../lib/db'
import { todayKey } from '../lib/dates'
import { AREAS, areaStyle } from '../lib/goals'

export default function TaskForm({ open, onClose, task }: { open: boolean; onClose: () => void; task?: Task | null }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>(2)
  const [repeat, setRepeat] = useState<Repeat>('none')
  const [dueDate, setDueDate] = useState(todayKey())
  const [time, setTime] = useState('')
  const [area, setArea] = useState<Area | undefined>()
  const [checklist, setChecklist] = useState<CheckItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setPriority(task?.priority ?? 2)
    setRepeat(task?.repeat ?? 'none')
    setDueDate(task ? task.dueDate ?? '' : todayKey())
    setTime(task?.time ?? '')
    setArea(task?.area)
    setChecklist(task?.checklist ?? [])
    setNewItem('')
    setConfirmDelete(false)
  }, [open, task])

  const addItem = () => {
    if (!newItem.trim()) return
    setChecklist([...checklist, { id: uid(), text: newItem.trim(), done: false }])
    setNewItem('')
  }
  const save = async () => {
    if (!title.trim()) return
    const items = newItem.trim() ? [...checklist, { id: uid(), text: newItem.trim(), done: false }] : checklist
    const data = { title: title.trim(), priority, repeat, dueDate: dueDate || (repeat !== 'none' ? todayKey() : undefined), time: time || undefined, area, checklist: items }
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
          <div className="seg grid-cols-3">
            {([[1, 'High'], [2, 'Medium'], [3, 'Low']] as const).map(([p, l]) => (
              <button key={p} onClick={() => setPriority(p)} className={`seg-item ${priority === p ? 'seg-item-on' : ''}`}>{l}</button>
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
          <span className="label">Area</span>
          <div className="grid grid-cols-4 gap-2">
            {AREAS.map((a) => (
              <button key={a} onClick={() => setArea(area === a ? undefined : a)}
                className={`rounded-xl border py-2.5 text-sm font-semibold ${area === a ? `${areaStyle[a].border} ${areaStyle[a].soft} ${areaStyle[a].text}` : 'border-line text-muted'}`}>{a}</button>
            ))}
          </div>
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
