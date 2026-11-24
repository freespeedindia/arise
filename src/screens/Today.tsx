import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { db } from '../lib/db'
import { greeting, todayKey } from '../lib/dates'
import { isDoneNow, isDueToday, sortTasks } from '../lib/tasks'
import { goalPace, goalPercent } from '../lib/goals'
import { QUOTES, quoteOfTheDay } from '../data/quotes'
import Ring from '../components/Ring'
import TaskItem from '../components/TaskItem'
import GoalCard from '../components/GoalCard'
import type { Tab } from '../components/BottomNav'

export default function Today({ name, onNavigate, onOpenSettings }: { name: string; onNavigate: (t: Tab) => void; onOpenSettings: () => void }) {
  const t = todayKey()
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const [qIndex, setQIndex] = useState(() => quoteOfTheDay().index)
  const quote = QUOTES[qIndex]

  const todays = tasks.filter((k) => isDueToday(k, t) && (k.repeat !== 'none' || !k.doneAt || k.doneAt === t))
  const open = todays.filter((k) => !isDoneNow(k, t)).sort(sortTasks)
  const done = todays.length - open.length
  const taskPct = todays.length ? Math.round((done / todays.length) * 100) : 0
  const active = goals.filter((g) => !g.completedAt)
  const focusGoal = active.find((g) => g.focus)
  const behindGoal = active.filter((g) => goalPace(g) === 'behind').sort((a, b) => a.deadline.localeCompare(b.deadline))[0]

  // The single most important thing to do now
  let now: { title: string; sub: string; action: string; to: Tab }
  if (open.length) {
    const top = open[0]
    now = { title: top.title, sub: open.length > 1 ? `Then ${open.length - 1} more for today` : 'Your last task for today', action: 'Go to tasks', to: 'tasks' }
  } else if (focusGoal && goalPercent(focusGoal) < 100) {
    const nextMs = focusGoal.milestones.find((m) => !m.done)
    now = { title: nextMs ? nextMs.text : `Move “${focusGoal.title}” forward`, sub: `For your focus goal: ${focusGoal.title}`, action: 'Open goals', to: 'goals' }
  } else if (behindGoal) {
    now = { title: `Catch up on “${behindGoal.title}”`, sub: 'This goal is behind pace', action: 'Open goals', to: 'goals' }
  } else if (todays.length) {
    now = { title: 'All done for today 🎉', sub: 'Rest well, or plan tomorrow.', action: 'Plan tasks', to: 'tasks' }
  } else {
    now = { title: 'Plan your day', sub: 'Add the 3 things that matter most today.', action: 'Add tasks', to: 'tasks' }
  }

  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="px-5 safe-top">
      {/* Header */}
      <div className="mt-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wide text-saffron-600 dark:text-saffron-400">{dateStr}</p>
          <h1 className="mt-0.5 font-display text-3xl font-extrabold leading-tight">{greeting()}{name ? `, ${name}` : ''} 🌅</h1>
        </div>
        <button onClick={onOpenSettings} aria-label="Settings" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm dark:bg-ink-800">⚙️</button>
      </div>

      {/* Do this now */}
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative mt-5 overflow-hidden rounded-4xl bg-gradient-to-br from-saffron-400 via-orange-500 to-rose-500 p-5 text-white shadow-xl shadow-orange-500/30">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
        <div className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-yellow-300/25" />
        <p className="text-xs font-extrabold uppercase tracking-widest text-white/85">🎯 Do this now</p>
        <p className="mt-2 font-display text-2xl font-bold leading-snug">{now.title}</p>
        <p className="mt-1 text-sm font-bold text-white/85">{now.sub}</p>
        <button onClick={() => onNavigate(now.to)} className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-orange-600 shadow active:scale-95">{now.action} →</button>
      </motion.div>

      {/* Progress rings */}
      <div className="card mt-4 grid grid-cols-3 gap-2 p-4">
        <div className="flex flex-col items-center">
          <Ring pct={taskPct} color="#3B82F6"><span className="text-sm font-black">{done}/{todays.length}</span></Ring>
          <p className="mt-1.5 text-xs font-extrabold text-gray-500">✅ Tasks</p>
        </div>
        <div className="flex flex-col items-center opacity-60">
          <Ring pct={0} color="#06B6D4"><span className="text-xl">💧</span></Ring>
          <p className="mt-1.5 text-xs font-extrabold text-gray-500">Water · soon</p>
        </div>
        <div className="flex flex-col items-center opacity-60">
          <Ring pct={0} color="#22C55E"><span className="text-xl">🔥</span></Ring>
          <p className="mt-1.5 text-xs font-extrabold text-gray-500">Calories · soon</p>
        </div>
      </div>

      {/* Quote */}
      <button onClick={() => setQIndex((i) => (i + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length)}
        className="mt-4 w-full overflow-hidden rounded-4xl bg-gradient-to-br from-amber-50 to-orange-100 p-5 text-left dark:from-ink-800 dark:to-ink-700">
        <AnimatePresence mode="wait">
          <motion.div key={qIndex} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <p className="font-display text-4xl leading-none text-saffron-500">“</p>
            <p className="-mt-2 text-[17px] font-bold leading-relaxed text-ink-800 dark:text-orange-50">{quote.text}</p>
            <p className="mt-3 text-sm font-extrabold text-saffron-700 dark:text-saffron-400">— Swami Vivekananda</p>
          </motion.div>
        </AnimatePresence>
        <p className="mt-2 text-[11px] font-bold text-gray-400">Tap for another</p>
      </button>

      {/* Focus goal */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">⭐ Today's focus</h2>
        <button onClick={() => onNavigate('goals')} className="text-sm font-extrabold text-saffron-600">All goals</button>
      </div>
      <div className="mt-3">
        {focusGoal ? <GoalCard goal={focusGoal} onOpen={() => onNavigate('goals')} /> : (
          <button onClick={() => onNavigate('goals')} className="card w-full p-5 text-left">
            <p className="font-bold">{active.length ? 'Pick one goal to focus on today.' : 'Set your first goal.'}</p>
            <p className="mt-1 text-sm font-semibold text-gray-500">Open a goal and tap “Make today's focus”.</p>
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">✅ Today's tasks</h2>
        <button onClick={() => onNavigate('tasks')} className="text-sm font-extrabold text-saffron-600">See all</button>
      </div>
      <div className="mt-3 space-y-3">
        {[...open, ...todays.filter((k) => isDoneNow(k, t))].slice(0, 6).map((k) => <TaskItem key={k.id} task={k} />)}
        {todays.length === 0 && (
          <button onClick={() => onNavigate('tasks')} className="card w-full p-5 text-left">
            <p className="font-bold">No tasks for today yet.</p>
            <p className="mt-1 text-sm font-semibold text-gray-500">Tap to add your first one.</p>
          </button>
        )}
      </div>

      {/* Next reminder */}
      <div className="card mt-6 flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-2xl dark:bg-sky-500/20">⏰</div>
        <div>
          <p className="font-bold">Next reminder</p>
          <p className="text-sm font-semibold text-gray-500">Phone reminders arrive in Phase 2.</p>
        </div>
      </div>
      <p className="mt-8 text-center text-xs font-bold text-gray-400">Focus. No feeds. One step at a time.</p>
    </div>
  )
}
