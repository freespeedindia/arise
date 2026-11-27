import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Calendar, Check, ChevronDown, Clock, CornerDownRight, Flame, ListTodo, MoreHorizontal, Repeat, Target } from 'lucide-react'
import { useState } from 'react'
import { db, type Priority, type Task } from '../lib/db'
import { friendlyDate } from '../lib/dates'
import { isDoneNow, isOverdue, repeatLabel, streak, streakUnit, toggleTask } from '../lib/tasks'
import { celebrate } from '../lib/celebrate'
import { RAG } from '../lib/day'
import { nowHHMM } from '../lib/reminders'

export default function TaskItem({ task, onEdit, today, done: doneProp, carried, goalName, isToday }: {
  task: Task; onEdit?: (t: Task) => void; today?: string; done?: boolean; carried?: boolean; goalName?: string; isToday?: boolean
}) {
  const done = doneProp ?? isDoneNow(task, today)
  const [moving, setMoving] = useState(false)
  const rag = RAG[task.priority]
  const late = isToday && !done && rag.by && nowHHMM() >= rag.by
  const moveTo = async (p: Priority) => { setMoving(false); if (task.id != null && p !== task.priority) await db.tasks.update(task.id, { priority: p }) }
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
            <p className={`truncate text-[15.5px] font-medium ${done ? 'text-faint line-through' : ''}`}>{task.title}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {task.repeat !== 'none' && <span className="inline-flex items-center gap-1"><Repeat size={12} />{repeatLabel[task.repeat]}</span>}
            {task.repeat === 'none' && task.dueDate && task.dueDate !== today && (
              <span className={`inline-flex items-center gap-1 ${overdue ? 'font-semibold text-crimson' : ''}`}>
                {overdue ? <AlertCircle size={12} /> : <Calendar size={12} />}{overdue ? (task.priority === 3 ? `From ${friendlyDate(task.dueDate)}` : `Overdue · ${friendlyDate(task.dueDate)}`) : friendlyDate(task.dueDate)}
              </span>
            )}
            {task.time && <span className="inline-flex items-center gap-1"><Clock size={12} />{task.time}</span>}
            {late && <span className="font-semibold text-crimson">Past {rag.by}</span>}
            {carried && !done && <span className="inline-flex items-center gap-1"><CornerDownRight size={12} />Carried forward</span>}
            {goalName && <span className="inline-flex min-w-0 items-center gap-1 text-gold"><Target size={12} className="shrink-0" /><span className="truncate">{goalName}</span></span>}
            {task.checklist.length > 0 && <span className="inline-flex items-center gap-1"><ListTodo size={12} />{checklistDone}/{task.checklist.length}<ChevronDown size={12} className={open ? 'rotate-180' : ''} /></span>}
          </div>
        </button>
        {s > 0 && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-saffron-soft px-2 py-1 text-xs font-semibold text-saffron-deep" title={`${s} ${streakUnit[task.repeat]} streak`}>
            <Flame size={13} />{s}
          </div>
        )}
        <button onClick={() => setMoving(!moving)} aria-label={`Change priority of "${task.title}" (now ${rag.name})`} aria-expanded={moving}
          className={`flex h-10 shrink-0 items-center rounded-lg px-2 text-2xs font-semibold uppercase tracking-[0.08em] ${rag.text}`}>{rag.name}</button>
        {onEdit && (
          <button onClick={() => onEdit(task)} aria-label={`Edit "${task.title}"`} className="flex h-10 w-9 shrink-0 items-center justify-center text-faint"><MoreHorizontal size={18} /></button>
        )}
      </div>
      {moving && (
        <div className="flex items-center gap-2 border-t border-line px-3 py-2">
          <span className="text-xs text-muted">Move to</span>
          {([1, 2, 3] as const).map((p) => (
            <button key={p} onClick={() => moveTo(p)} className={`chip ${p === task.priority ? 'chip-on' : ''}`}><span className={`h-2 w-2 rounded-full ${RAG[p].dot}`} />{RAG[p].name}</button>
          ))}
        </div>
      )}
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
