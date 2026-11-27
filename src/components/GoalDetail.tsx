import { Check, Link2, Pencil, Plus, Star, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from './Sheet'
import Ring from './Ring'
import { db, type Goal, type GoalStatus, type Priority, type Task } from '../lib/db'
import { AREA_LABEL, areaStyle, daysLeft, goalPercent } from '../lib/goals'
import { RAG, STATUS_LABEL, STATUS_TONE } from '../lib/day'
import { friendlyDate, todayKey } from '../lib/dates'
import { celebrate } from '../lib/celebrate'
import AreaIcon from './AreaIcon'

export default function GoalDetail({ goal, onClose, onEdit, status, tasks, today }: { goal: Goal | null; onClose: () => void; onEdit: (g: Goal) => void; status: GoalStatus; tasks: Task[]; today: string }) {
  const [amount, setAmount] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPrio, setTaskPrio] = useState<Priority>(2)
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => { setAmount(''); setConfirmDelete(false); setTaskTitle('') }, [goal?.id])
  if (!goal) return <Sheet open={false} onClose={onClose} title=""><div /></Sheet>
  const pct = goalPercent(goal)
  const st = areaStyle[goal.area]
  const id = goal.id!
  const linked = tasks.filter((t) => t.goalId === id)
  const openLinked = linked.filter((t) => t.repeat !== 'none' || !t.doneAt)
  const doneLinked = linked.filter((t) => t.repeat === 'none' && t.doneAt).length + linked.reduce((n, t) => n + (t.repeat === 'none' ? 0 : t.completions.length), 0)
  const addTask = async () => {
    if (!taskTitle.trim()) return
    await db.tasks.add({ title: taskTitle.trim(), priority: taskPrio, repeat: 'none', dueDate: today, goalId: id, checklist: [], completions: [], createdAt: new Date().toISOString() })
    setTaskTitle('')
  }

  const checkComplete = async (g: Goal) => {
    const p = goalPercent({ ...g, completedAt: undefined })
    if (p >= 100 && !g.completedAt) {
      await db.goals.update(id, { completedAt: todayKey(), focus: false })
      celebrate(true, 'Goal achieved. Well done.')
    } else if (p < 100 && g.completedAt) {
      await db.goals.update(id, { completedAt: undefined })
    }
  }
  const setCurrent = async (v: number) => {
    await db.goals.update(id, { current: v })
    await checkComplete({ ...goal, current: v })
  }
  const toggleMs = async (msId: string) => {
    const milestones = goal.milestones.map((m) => (m.id === msId ? { ...m, done: !m.done, doneOn: m.done ? undefined : todayKey() } : m))
    await db.goals.update(id, { milestones })
    if (milestones.find((m) => m.id === msId)?.done) celebrate(false, 'Milestone reached')
    await checkComplete({ ...goal, milestones })
  }
  const toggleFocus = async () => {
    if (!goal.focus) await db.goals.toCollection().modify({ focus: false })
    await db.goals.update(id, { focus: !goal.focus })
  }
  const markComplete = async () => {
    await db.goals.update(id, { completedAt: todayKey(), focus: false })
    celebrate(true, 'Goal achieved. Well done.')
  }
  const reopen = async () => db.goals.update(id, { completedAt: undefined })
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await db.goals.delete(id)
    onClose()
  }

  return (
    <Sheet open={!!goal} onClose={onClose} title={goal.title}>
      <div className="space-y-6">
        <div className="flex items-center gap-5">
          <Ring pct={pct} size={92} stroke={7} color={st.color}>
            <span className="num font-display text-2xl font-medium">{pct}%</span>
          </Ring>
          <div className="space-y-1 text-sm">
            <p className={`flex items-center gap-1.5 font-semibold ${st.text}`}><AreaIcon area={goal.area} size={15} />{AREA_LABEL[goal.area]} · {goal.term === 'short' ? 'Short term' : 'Long term'}</p>
            <p><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>{goal.status && !goal.completedAt ? <span className="ml-1.5 text-xs text-faint">set by you</span> : null}</p>
            <p className="text-muted">Due {friendlyDate(goal.deadline)} · {daysLeft(goal) >= 0 ? `${daysLeft(goal)} days left` : 'deadline passed'}</p>
          </div>
        </div>

        {goal.target != null && (goal.link ? (
          <div className="flex items-start gap-3 rounded-xl bg-sunken p-4 text-sm">
            <Link2 size={16} className="mt-0.5 shrink-0 text-muted" />
            <p><span className="num font-semibold">Now {(goal.current ?? goal.start ?? 0).toLocaleString()} {goal.unit}</span> · target {goal.target.toLocaleString()}. This goal updates automatically from what you log.</p>
          </div>
        ) : (
          <div>
            <span className="label">Update progress</span>
            <div className="flex items-center gap-2">
              <input className="input num" inputMode="decimal" placeholder={`Now ${goal.current ?? goal.start ?? 0}`} aria-label="Progress value" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button onClick={() => { if (amount !== '') { setCurrent(Number(amount)); setAmount('') } }} className="btn-primary shrink-0">Update</button>
              <button onClick={() => { if (amount !== '') { setCurrent((goal.current ?? goal.start ?? 0) + Number(amount)); setAmount('') } }} className="btn-secondary shrink-0">Add</button>
            </div>
            <p className="num mt-1.5 text-xs text-muted">Now {(goal.current ?? goal.start ?? 0).toLocaleString()} {goal.unit} · started at {(goal.start ?? 0).toLocaleString()} · target {goal.target.toLocaleString()}. Type the new value and tap Update, or an amount and tap Add.</p>
          </div>
        ))}

        {goal.milestones.length > 0 && (
          <div>
            <span className="label">Milestones</span>
            <div className="card divide-y divide-line">
              {goal.milestones.map((m) => (
                <button key={m.id} onClick={() => toggleMs(m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] ${m.done ? 'border-forest bg-forest text-white' : 'border-line'}`}>{m.done && <Check size={14} strokeWidth={3} />}</span>
                  <span className={`text-[15px] ${m.done ? 'text-faint line-through' : ''}`}>{m.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!goal.completedAt && (
          <div>
            <span className="label">Daily actions for this goal</span>
            <div className="card divide-y divide-line">
              {openLinked.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${RAG[t.priority].dot}`} /><span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="shrink-0 text-xs text-muted">{t.dueDate ? friendlyDate(t.dueDate) : ''}</span>
                </div>
              ))}
              <div className="flex gap-2 p-2">
                <input className="input" placeholder="Add a to-do for today" aria-label="To-do for this goal" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} />
                <select className="input w-[6.5rem] shrink-0 text-sm" aria-label="Priority" value={taskPrio} onChange={(e) => setTaskPrio(Number(e.target.value) as Priority)}>
                  {([1, 2, 3] as const).map((p) => <option key={p} value={p}>{RAG[p].name}</option>)}
                </select>
                <button onClick={addTask} disabled={!taskTitle.trim()} aria-label="Add to-do" className="btn-secondary shrink-0 px-4"><Plus size={18} /></button>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted">{doneLinked ? `${doneLinked} linked to-do${doneLinked > 1 ? 's' : ''} completed so far.` : 'Linked to-dos count as steps towards this goal.'}{goal.area === 'Health' ? ' Following your meal plan and exercising also count.' : goal.area === 'Wealth' ? ' Staying within your budget also counts.' : ''}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={toggleFocus} className={goal.focus ? 'btn border border-gold bg-gold-soft text-gold' : 'btn-secondary'}>
            <Star size={16} className={goal.focus ? 'fill-gold' : ''} />{goal.focus ? 'Focus goal' : 'Set as focus'}
          </button>
          <button onClick={() => onEdit(goal)} className="btn-secondary"><Pencil size={16} />Edit</button>
        </div>
        {goal.completedAt
          ? <button onClick={reopen} className="btn-secondary w-full">Reopen goal</button>
          : <button onClick={markComplete} className="btn-primary w-full"><Trophy size={17} />Mark as completed</button>}
        <button onClick={remove} className="btn-ghost w-full text-crimson">{confirmDelete ? 'Tap again to delete' : 'Delete goal'}</button>
      </div>
    </Sheet>
  )
}
