import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { db, type Task } from '../lib/db'
import { friendlyDate } from '../lib/dates'
import { isDoneNow, isOverdue, repeatLabel, streak, streakUnit, toggleTask } from '../lib/tasks'
import { celebrate } from '../lib/celebrate'
import { areaStyle } from '../lib/goals'

const prioColor = { 1: 'bg-rose-500', 2: 'bg-amber-400', 3: 'bg-sky-400' } as const

export default function TaskItem({ task, onEdit }: { task: Task; onEdit?: (t: Task) => void }) {
  const done = isDoneNow(task)
  const s = streak(task)
  const overdue = isOverdue(task)
  const [open, setOpen] = useState(false)
  const checklistDone = task.checklist.filter((c) => c.done).length

  const tick = async () => {
    const nowDone = await toggleTask(task)
    if (nowDone) {
      celebrate(false)
      navigator.vibrate?.(15)
    }
  }
  const toggleItem = async (id: string) => {
    if (task.id == null) return
    await db.tasks.update(task.id, { checklist: task.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) })
  }

  return (
    <motion.div layout className={`card overflow-hidden ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        <button onClick={tick} aria-label={done ? 'Mark not done' : 'Mark done'}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] transition-colors ${done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 dark:border-ink-700'}`}>
          <AnimatePresence>{done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-xl font-black">✓</motion.span>}</AnimatePresence>
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => (task.checklist.length ? setOpen(!open) : onEdit?.(task))}>
          <p className={`truncate text-[17px] font-bold ${done ? 'line-through' : ''}`}>{task.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-gray-500">
            <span className={`h-2 w-2 rounded-full ${prioColor[task.priority]}`} />
            {task.repeat !== 'none' && <span>🔁 {repeatLabel[task.repeat]}</span>}
            {task.repeat === 'none' && task.dueDate && (
              <span className={overdue ? 'text-rose-500' : ''}>{overdue ? '⚠️ ' : '📅 '}{friendlyDate(task.dueDate)}</span>
            )}
            {task.area && <span className={areaStyle[task.area].text}>{areaStyle[task.area].emoji} {task.area}</span>}
            {task.checklist.length > 0 && <span>☑️ {checklistDone}/{task.checklist.length}</span>}
          </div>
        </button>
        {s > 0 && (
          <div className="flex shrink-0 flex-col items-center rounded-2xl bg-orange-50 px-2 py-1 dark:bg-orange-500/10" title={`${s} ${streakUnit[task.repeat]} streak`}>
            <span className="text-lg leading-none">🔥</span>
            <span className="text-xs font-black text-saffron-600">{s}</span>
          </div>
        )}
        {onEdit && (
          <button onClick={() => onEdit(task)} aria-label="Edit task" className="flex h-10 w-8 shrink-0 items-center justify-center text-xl text-gray-400">⋯</button>
        )}
      </div>
      <AnimatePresence>
        {open && task.checklist.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-1 border-t border-gray-100 px-4 py-2 dark:border-ink-700">
              {task.checklist.map((c) => (
                <button key={c.id} onClick={() => toggleItem(c.id)} className="flex w-full items-center gap-3 py-2 text-left">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 text-sm ${c.done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'}`}>{c.done ? '✓' : ''}</span>
                  <span className={`font-semibold ${c.done ? 'text-gray-400 line-through' : ''}`}>{c.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
