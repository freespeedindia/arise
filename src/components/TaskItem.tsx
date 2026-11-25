import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Calendar, Check, ChevronDown, Clock, Flame, ListTodo, MoreHorizontal, Repeat } from 'lucide-react'
import { useState } from 'react'
import { db, type Task } from '../lib/db'
import { friendlyDate } from '../lib/dates'
import { isDoneNow, isOverdue, repeatLabel, streak, streakUnit, toggleTask } from '../lib/tasks'
import { celebrate } from '../lib/celebrate'
import { areaStyle } from '../lib/goals'

const prio = { 1: 'bg-crimson', 2: 'bg-gold', 3: 'bg-faint' } as const
const prioName = { 1: 'High priority', 2: 'Medium priority', 3: 'Low priority' } as const

export default function TaskItem({ task, onEdit, today }: { task: Task; onEdit?: (t: Task) => void; today?: string }) {
  const done = isDoneNow(task, today)
  const s = streak(task, today)
  const overdue = isOverdue(task, today)
  const [open, setOpen] = useState(false)
  const checklistDone = task.checklist.filter((c) => c.done).length

  const tick = async () => {
    const nowDone = await toggleTask(task, today)
    if (nowDone) celebrate(false)
  }
  const toggleItem = async (id: string) => {
    if (task.id == null) return
    await db.tasks.update(task.id, { checklist: task.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) })
  }

  return (
    <motion.div layout className="card overflow-hidden">
      <div className="flex items-center gap-3 py-3 pl-3 pr-2">
        <button onClick={tick} aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${done ? 'border-forest bg-forest text-white' : 'border-line text-transparent'}`}>
          <Check size={18} strokeWidth={2.5} />
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => (task.checklist.length ? setOpen(!open) : onEdit?.(task))}>
          <div className="flex items-center gap-2">
            <span title={prioName[task.priority]} className={`h-1.5 w-1.5 shrink-0 rounded-full ${prio[task.priority]}`} />
            <p className={`truncate text-[15.5px] font-medium ${done ? 'text-faint line-through' : ''}`}>{task.title}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-3.5 text-xs text-muted">
            {task.repeat !== 'none' && <span className="inline-flex items-center gap-1"><Repeat size={12} />{repeatLabel[task.repeat]}</span>}
            {task.repeat === 'none' && task.dueDate && (
              <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-crimson' : ''}`}>
                {overdue ? <AlertCircle size={12} /> : <Calendar size={12} />}{overdue ? `Overdue · ${friendlyDate(task.dueDate)}` : friendlyDate(task.dueDate)}
              </span>
            )}
            {task.time && <span className="inline-flex items-center gap-1"><Clock size={12} />{task.time}</span>}
            {task.area && <span className={`font-medium ${areaStyle[task.area].text}`}>{task.area}</span>}
            {task.checklist.length > 0 && <span className="inline-flex items-center gap-1"><ListTodo size={12} />{checklistDone}/{task.checklist.length}<ChevronDown size={12} className={open ? 'rotate-180' : ''} /></span>}
          </div>
        </button>
        {s > 0 && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-saffron-soft px-2 py-1 text-xs font-semibold text-saffron-deep" title={`${s} ${streakUnit[task.repeat]} streak`}>
            <Flame size={13} />{s}
          </div>
        )}
        {onEdit && (
          <button onClick={() => onEdit(task)} aria-label={`Edit "${task.title}"`} className="flex h-10 w-9 shrink-0 items-center justify-center text-faint"><MoreHorizontal size={18} /></button>
        )}
      </div>
      <AnimatePresence>
        {open && task.checklist.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-line px-4 py-1">
              {task.checklist.map((c) => (
                <button key={c.id} onClick={() => toggleItem(c.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] ${c.done ? 'border-forest bg-forest text-white' : 'border-line'}`}>{c.done && <Check size={12} strokeWidth={3} />}</span>
                  <span className={`text-sm ${c.done ? 'text-faint line-through' : ''}`}>{c.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
