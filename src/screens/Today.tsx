import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { AlertTriangle, ArrowRight, Bell, Droplet, Flame, ListChecks, Pill, Scale, Settings as Cog, Activity, Utensils, RefreshCw } from 'lucide-react'
import { db } from '../lib/db'
import { greeting } from '../lib/dates'
import { isDoneNow, isDueToday, sortTasks } from '../lib/tasks'
import { goalPace } from '../lib/goals'
import { daysOfStock, LOW_STOCK_DAYS } from '../lib/health'
import { nextReminder, nowHHMM, toMin, type ScheduledReminder } from '../lib/reminders'
import type { Settings } from '../lib/settings'
import { QUOTES, quoteOfTheDay } from '../data/quotes'
import Ring from '../components/Ring'
import TaskItem from '../components/TaskItem'
import GoalCard from '../components/GoalCard'
import Section from '../components/Section'
import { addWater } from '../components/health/WaterCard'
import { toggleDose } from '../components/health/SupplementsCard'
import type { Tab } from '../components/BottomNav'
import type { HealthAction } from './Health'

interface Props {
  s: Settings; today: string; schedule: ScheduledReminder[]
  onNavigate: (t: Tab, action?: HealthAction) => void; onOpenSettings: () => void; onOpenReminders: () => void
}

export default function Today({ s, today: t, schedule, onNavigate, onOpenSettings, onOpenReminders }: Props) {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const goals = useLiveQuery(() => db.goals.toArray()) ?? []
  const water = useLiveQuery(() => db.water.where('date').equals(t).toArray(), [t]) ?? []
  const food = useLiveQuery(() => db.food.where('date').equals(t).toArray(), [t]) ?? []
  const sups = useLiveQuery(() => db.supplements.toArray()) ?? []
  const doses = useLiveQuery(() => db.doses.where('date').equals(t).toArray(), [t]) ?? []
  const [qIndex, setQIndex] = useState(() => quoteOfTheDay().index)
  const now = nowHHMM()

  const todays = tasks.filter((k) => isDueToday(k, t) && (k.repeat !== 'none' || !k.doneAt || k.doneAt === t))
  const open = todays.filter((k) => !isDoneNow(k, t)).sort(sortTasks)
  const done = todays.length - open.length
  const waterMl = water.reduce((a, w) => a + w.ml, 0)
  const kcal = food.reduce((a, f) => a + f.kcal, 0)
  const activeSups = sups.filter((x) => x.active)
  const slots = activeSups.flatMap((x) => x.times.map((time) => ({ s: x, time })))
  const taken = slots.filter(({ s: x, time }) => doses.some((d) => d.suppId === x.id && d.time === time)).length
  const dueDose = slots.filter(({ s: x, time }) => time <= now && !doses.some((d) => d.suppId === x.id && d.time === time)).sort((a, b) => a.time.localeCompare(b.time))[0]
  const active = goals.filter((g) => !g.completedAt)
  const focusGoal = active.find((g) => g.focus)
  const behindGoals = active.filter((g) => ['behind', 'overdue'].includes(goalPace(g, t)))
  const lowStock = activeSups.filter((x) => daysOfStock(x) <= LOW_STOCK_DAYS)
  const next = nextReminder(schedule, now)

  // Water you should have had by now, spread evenly across your waking hours
  const dayLen = Math.max(1, toMin(s.wakeEnd) - toMin(s.wakeStart))
  const elapsed = Math.min(Math.max(toMin(now) - toMin(s.wakeStart), 0), dayLen)
  const waterBehind = (s.waterTargetMl * elapsed) / dayLen - waterMl > 500

  // The single most important thing to do now
  type Act = { title: string; sub: string; label: string; run: () => void }
  let act: Act
  const top = open[0]
  if (top && (top.priority === 1 || (top.dueDate && top.dueDate < t && top.repeat === 'none'))) {
    act = { title: top.title, sub: open.length > 1 ? `High priority. ${open.length - 1} more task${open.length > 2 ? 's' : ''} after this.` : 'High priority. Last task for today.', label: 'Open tasks', run: () => onNavigate('tasks') }
  } else if (dueDose) {
    act = { title: `Take ${dueDose.s.name}`, sub: `${dueDose.s.dose}, scheduled ${dueDose.time}`, label: 'Mark taken', run: () => toggleDose(dueDose.s, t, dueDose.time) }
  } else if (waterBehind) {
    act = { title: 'Drink a glass of water', sub: `You are behind: ${(waterMl / 1000).toFixed(1)} of ${(s.waterTargetMl / 1000).toFixed(1)} L so far.`, label: 'Add 250 ml', run: () => addWater(t, 250, s.waterTargetMl) }
  } else if (top) {
    act = { title: top.title, sub: open.length > 1 ? `${open.length - 1} more after this` : 'Last task for today', label: 'Open tasks', run: () => onNavigate('tasks') }
  } else if (focusGoal) {
    const ms = focusGoal.milestones.find((m) => !m.done)
    act = { title: ms ? ms.text : `Advance “${focusGoal.title}”`, sub: `Focus goal: ${focusGoal.title}`, label: 'Open goals', run: () => onNavigate('goals') }
  } else if (behindGoals[0]) {
    act = { title: `Catch up on “${behindGoals[0].title}”`, sub: 'This goal is behind pace.', label: 'Open goals', run: () => onNavigate('goals') }
  } else if (todays.length) {
    act = { title: 'Today is complete', sub: 'Plan tomorrow, then rest well.', label: 'Plan tasks', run: () => onNavigate('tasks') }
  } else {
    act = { title: 'Plan your day', sub: 'Write down the three things that matter most today.', label: 'Add tasks', run: () => onNavigate('tasks') }
  }

  const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const quote = QUOTES[qIndex]

  return (
    <div className="px-5 safe-top">
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{dateStr}</p>
          <h1 className="h1 mt-1">{greeting()}{s.name ? `, ${s.name}` : ''}</h1>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={onOpenReminders} aria-label="Reminders" className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted">
            <Bell size={21} strokeWidth={1.75} />
            {!s.notifications && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-saffron" />}
          </button>
          <button onClick={onOpenSettings} aria-label="Settings" className="flex h-11 w-11 items-center justify-center rounded-full text-muted"><Cog size={21} strokeWidth={1.75} /></button>
        </div>
      </div>

      {/* Next action */}
      <motion.div initial={{ y: 6 }} animate={{ y: 0 }} className="relative mt-5 overflow-hidden rounded-2xl bg-[#241C16] p-5 text-[#F7F2E9] dark:border dark:border-line dark:bg-surface">
        <span className="absolute inset-y-0 left-0 w-1 bg-saffron" />
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-gold">Next action</p>
        <p className="mt-2 font-serif text-[24px] font-semibold leading-snug">{act.title}</p>
        <p className="mt-1 text-sm opacity-70">{act.sub}</p>
        <button onClick={act.run} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-saffron px-4 py-2.5 text-sm font-semibold text-white">{act.label}<ArrowRight size={16} /></button>
      </motion.div>

      {/* Daily summary */}
      <div className="card mt-3 grid grid-cols-4 divide-x divide-line py-3">
        <Metric label="Tasks" value={`${done}/${todays.length}`} pct={todays.length ? (done / todays.length) * 100 : 0} color="rgb(var(--saffron))" Icon={ListChecks} onClick={() => onNavigate('tasks')} />
        <Metric label="Water" value={`${(waterMl / 1000).toFixed(1)}L`} pct={(waterMl / s.waterTargetMl) * 100} color="rgb(var(--water))" Icon={Droplet} onClick={() => onNavigate('health')} />
        <Metric label="Calories" value={kcal.toLocaleString()} pct={(kcal / s.calorieTarget) * 100} color={kcal > s.calorieTarget ? 'rgb(var(--crimson))' : 'rgb(var(--forest))'} Icon={Flame} onClick={() => onNavigate('health')} />
        <Metric label="Doses" value={slots.length ? `${taken}/${slots.length}` : '—'} pct={slots.length ? (taken / slots.length) * 100 : 0} color="rgb(var(--gold))" Icon={Pill} onClick={() => onNavigate('health')} />
      </div>

      {/* Quick log */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <Quick Icon={Droplet} label="+250 ml" onClick={() => addWater(t, 250, s.waterTargetMl)} />
        <Quick Icon={Utensils} label="Food" onClick={() => onNavigate('health', 'food')} />
        <Quick Icon={Scale} label="Weight" onClick={() => onNavigate('health', 'weight')} />
        <Quick Icon={Activity} label="Activity" onClick={() => onNavigate('health', 'activity')} />
      </div>

      {/* Next reminder + alerts */}
      <button onClick={onOpenReminders} className="card mt-3 flex w-full items-center gap-3 p-4 text-left">
        <Bell size={18} strokeWidth={1.75} className="shrink-0 text-saffron" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Next reminder</p>
          <p className="truncate text-[15px] font-medium">{next ? `${next.time} · ${next.title}` : 'Nothing more today'}</p>
        </div>
        <ArrowRight size={16} className="text-faint" />
      </button>
      {(lowStock.length > 0 || behindGoals.length > 0) && (
        <div className="mt-3 space-y-2">
          {lowStock.map((x) => (
            <Alert key={`s${x.id}`} text={`${x.name} runs out in about ${daysOfStock(x)} days. Reorder.`} onClick={() => onNavigate('health')} />
          ))}
          {behindGoals.slice(0, 2).map((g) => (
            <Alert key={`g${g.id}`} text={`“${g.title}” is ${goalPace(g, t) === 'overdue' ? 'past its deadline' : 'behind pace'}.`} onClick={() => onNavigate('goals')} />
          ))}
        </div>
      )}

      <Section title="Focus goal" action="All goals" onAction={() => onNavigate('goals')}>
        {focusGoal ? <GoalCard goal={focusGoal} onOpen={() => onNavigate('goals')} /> : (
          <button onClick={() => onNavigate('goals')} className="card w-full p-4 text-left">
            <p className="font-medium">{active.length ? 'Choose one goal to focus on.' : 'Set your first goal.'}</p>
            <p className="mt-1 text-sm text-muted">Open a goal and tap “Set as focus”.</p>
          </button>
        )}
      </Section>

      <Section title="Today's tasks" action="All tasks" onAction={() => onNavigate('tasks')}>
        <div className="space-y-2.5">
          {[...open, ...todays.filter((k) => isDoneNow(k, t))].slice(0, 6).map((k) => <TaskItem key={k.id} task={k} today={t} />)}
          {todays.length === 0 && (
            <button onClick={() => onNavigate('tasks')} className="card w-full p-4 text-left">
              <p className="font-medium">No tasks for today.</p><p className="mt-1 text-sm text-muted">Tap to add one.</p>
            </button>
          )}
        </div>
      </Section>

      <Section title="Thought for the day">
        <div className="card p-5">
          <AnimatePresence mode="wait">
            <motion.div key={qIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-l-2 border-gold pl-4">
              <p className="font-serif text-[18px] italic leading-relaxed">{quote.text}</p>
              <p className="mt-3 text-sm text-muted">Swami Vivekananda</p>
            </motion.div>
          </AnimatePresence>
          <button onClick={() => setQIndex((i) => (i + 1 + Math.floor(Math.random() * (QUOTES.length - 1))) % QUOTES.length)}
            className="mt-1 inline-flex items-center gap-1.5 py-2.5 pr-4 text-xs font-semibold text-muted"><RefreshCw size={12} />Another</button>
        </div>
      </Section>
      <p className="my-8 text-center text-xs text-faint">Focus. No feeds. One step at a time.</p>
    </div>
  )
}

function Metric({ label, value, pct, color, Icon, onClick }: { label: string; value: string; pct: number; color: string; Icon: typeof Droplet; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 px-1">
      <Ring pct={pct} size={50} stroke={4} color={color}><Icon size={16} strokeWidth={1.75} style={{ color }} /></Ring>
      <p className="num text-[13px] font-semibold leading-none">{value}</p>
      <p className="text-2xs text-muted">{label}</p>
    </button>
  )
}
function Quick({ Icon, label, onClick }: { Icon: typeof Droplet; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface py-2.5 text-xs font-medium text-muted active:scale-[0.97]">
      <Icon size={18} strokeWidth={1.75} className="text-ink" />{label}
    </button>
  )
}
function Alert({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-xl border border-crimson/25 bg-crimson-soft px-4 py-3 text-left text-sm text-crimson">
      <AlertTriangle size={16} className="shrink-0" />{text}
    </button>
  )
}
