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
  const [area, setArea] = useState<Area | undefined>()
  const [checklist, setChecklist] = useState<CheckItem[]>([])
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setPriority(task?.priority ?? 2)
    setRepeat(task?.repeat ?? 'none')
    setDueDate(task?.dueDate ?? todayKey())
    setArea(task?.area)
    setChecklist(task?.checklist ?? [])
    setNewItem('')
  }, [open, task])

  const addItem = () => {
    if (!newItem.trim()) return
    setChecklist([...checklist, { id: uid(), text: newItem.trim(), done: false }])
    setNewItem('')
  }

  const save = async () => {
    if (!title.trim()) return
    const items = newItem.trim() ? [...checklist, { id: uid(), text: newItem.trim(), done: false }] : checklist
    const data = { title: title.trim(), priority, repeat, dueDate: dueDate || undefined, area, checklist: items }
    if (task?.id != null) await db.tasks.update(task.id, data)
    else await db.tasks.add({ ...data, completions: [], createdAt: new Date().toISOString() })
    onClose()
  }
  const remove = async () => {
    if (task?.id != null) await db.tasks.delete(task.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <div className="space-y-5">
        <input autoFocus className="input text-lg font-bold" placeholder="What needs doing?" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />

        <div>
          <span className="label">Priority</span>
          <div className="grid grid-cols-3 gap-2">
            {([[1, 'High', 'bg-rose-500'], [2, 'Medium', 'bg-amber-400'], [3, 'Low', 'bg-sky-400']] as const).map(([p, l, c]) => (
              <button key={p} onClick={() => setPriority(p)}
                className={`rounded-2xl py-3 font-extrabold ${priority === p ? `${c} text-white` : 'bg-gray-100 dark:bg-ink-700'}`}>{l}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Repeat</span>
          <div className="grid grid-cols-4 gap-2">
            {(['none', 'daily', 'weekly', 'monthly'] as Repeat[]).map((r) => (
              <button key={r} onClick={() => setRepeat(r)}
                className={`rounded-2xl py-3 text-sm font-extrabold capitalize ${repeat === r ? 'bg-work-500 text-white' : 'bg-gray-100 dark:bg-ink-700'}`}>
                {r === 'none' ? 'Once' : r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">{repeat === 'none' ? 'Due date' : repeat === 'daily' ? 'Starts on' : repeat === 'weekly' ? 'Starts on (repeats on this weekday)' : 'Starts on (repeats on this day each month)'}</span>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div>
          <span className="label">Area (optional)</span>
          <div className="grid grid-cols-4 gap-2">
            {AREAS.map((a) => (
              <button key={a} onClick={() => setArea(area === a ? undefined : a)}
                className={`rounded-2xl py-3 text-sm font-extrabold ${area === a ? `${areaStyle[a].bg} text-white` : 'bg-gray-100 dark:bg-ink-700'}`}>
                {areaStyle[a].emoji} {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Checklist</span>
          <div className="space-y-2">
            {checklist.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-gray-50 px-4 py-2.5 dark:bg-ink-900">
                <span className="flex-1 font-semibold">{c.text}</span>
                <button onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))} className="text-gray-400" aria-label="Remove">✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input" placeholder="Add a step…" value={newItem} onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()} />
              <button onClick={addItem} className="rounded-2xl bg-gray-100 px-5 text-xl font-black dark:bg-ink-700">+</button>
            </div>
          </div>
        </div>

        <button onClick={save} className="btn-primary w-full">{task ? 'Save changes' : 'Add task'}</button>
        {task && <button onClick={remove} className="w-full py-2 font-bold text-rose-500">Delete task</button>}
      </div>
    </Sheet>
  )
}
