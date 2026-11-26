import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BellOff, Check, Droplet, Pause, Play, Smartphone, Square, X } from 'lucide-react'
import { db } from '../lib/db'
import { weekStart } from '../lib/dates'
import { isDoneNow, isDueToday, sortTasks } from '../lib/tasks'
import { logFocus, mmss, pauseFocus, resumeFocus, startFocus, writeFocus, type FocusState } from '../lib/focus'
import { setSettings, type Settings } from '../lib/settings'
import { QUOTES } from '../data/quotes'
import Ring from '../components/Ring'

const FOCUS_QUOTES = QUOTES.filter((q) => q.tags.some((t) => t === 'focus' || t === 'work'))
const NUDGES = [
  { I: BellOff, t: 'Do Not Disturb on' },
  { I: Smartphone, t: 'Social media closed' },
  { I: Droplet, t: 'Water within reach' },
]

export default function FocusScreen({ open, onClose, s, today, focus }: {
  open: boolean; onClose: () => void; s: Settings; today: string; focus: { state: FocusState | null; left: number }
}) {
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? []
  const sessions = useLiveQuery(() => db.focus.where('date').aboveOrEqual(weekStart(today)).toArray(), [today]) ?? []
  const [mins, setMins] = useState(s.focusMinutes)
  const [brk, setBrk] = useState(s.breakMinutes)
  const [label, setLabel] = useState('')
  const [taskId, setTaskId] = useState<number | undefined>()
  const [checks, setChecks] = useState<boolean[]>([false, false, false])
  const [qi] = useState(() => Math.floor(Math.random() * Math.max(1, FOCUS_QUOTES.length)))
  useEffect(() => { if (open) { setMins(s.focusMinutes); setBrk(s.breakMinutes) } }, [open, s.focusMinutes, s.breakMinutes])

  const open_ = tasks.filter((k) => isDueToday(k, today) && !isDoneNow(k, today) && (k.repeat !== 'none' || !k.doneAt)).sort(sortTasks).slice(0, 6)
  const todayMin = sessions.filter((x) => x.date === today).reduce((a, x) => a + x.minutes, 0)
  const weekMin = sessions.reduce((a, x) => a + x.minutes, 0)
  const { state, left } = focus
  const running = !!state
  const total = state ? state.minutes * 60000 : mins * 60000
  const pct = running ? ((total - left) / total) * 100 : 0
  const quote = FOCUS_QUOTES[qi] ?? QUOTES[0]

  const begin = async () => {
    await setSettings({ focusMinutes: mins, breakMinutes: brk })
    startFocus(mins, label.trim() || tasks.find((t) => t.id === taskId)?.title, taskId)
    try { navigator.vibrate?.(15) } catch { /* */ }
  }
  const stop = async () => {
    if (state?.phase === 'focus') await logFocus((state.minutes * 60000 - left) / 60000, state.label)
    writeFocus(null)
  }
  const fmtH = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)

  return (
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-label="Focus mode" className="fixed inset-0 z-50 overflow-y-auto bg-[#2A2826] text-[#F7F2E9]"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 320 }}>
          <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 pb-10 safe-top">
            <div className="mt-2 flex items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-[#CDA85C]">{state?.phase === 'break' ? 'Break' : 'Focus mode'}</p>
              <button onClick={onClose} aria-label="Close focus mode" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#F7F2E9]/70"><X size={18} /></button>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <Ring pct={pct} size={236} stroke={6} color={state?.phase === 'break' ? 'rgb(110 176 128)' : 'rgb(226 132 54)'} track="rgba(255,255,255,0.08)">
                <div className="text-center">
                  <p className="num font-display text-[56px] font-medium leading-none" aria-live="polite">{mmss(running ? left : mins * 60000)}</p>
                  <p className="mt-2 text-xs text-[#F7F2E9]/60">{state?.pausedLeft != null ? 'Paused' : running ? (state!.phase === 'break' ? 'Stand up, stretch, breathe' : state!.label || 'Deep work') : `${mins} minutes`}</p>
                </div>
              </Ring>
            </div>

            {running ? (
              <div className="mt-8 grid grid-cols-2 gap-3">
                {state!.pausedLeft != null
                  ? <button onClick={resumeFocus} className="btn bg-[#E28436] text-white"><Play size={18} />Resume</button>
                  : <button onClick={pauseFocus} className="btn bg-white/10 text-[#F7F2E9]"><Pause size={18} />Pause</button>}
                <button onClick={stop} className="btn bg-white/5 text-[#F7F2E9]/80"><Square size={16} />{state!.phase === 'break' ? 'Skip break' : 'Stop'}</button>
              </div>
            ) : (
              <>
                <div className="mt-8">
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-[#F7F2E9]/50">Length</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 25, 45, 60].map((m) => (
                      <button key={m} onClick={() => setMins(m)} className={`rounded-xl py-2.5 text-sm font-semibold ${mins === m ? 'bg-[#F7F2E9] text-[#1C1612]' : 'bg-white/5 text-[#F7F2E9]/70'}`}>{m} min</button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-[#F7F2E9]/60">Break afterwards</span>
                    <div className="flex gap-1.5">
                      {[0, 5, 10, 15].map((m) => (
                        <button key={m} onClick={() => setBrk(m)} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${brk === m ? 'bg-[#F7F2E9] text-[#1C1612]' : 'bg-white/5 text-[#F7F2E9]/70'}`}>{m ? `${m}m` : 'None'}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-[#F7F2E9]/50">Working on</p>
                  {open_.length > 0 && (
                    <div className="no-scrollbar -mx-6 mb-2 flex gap-2 overflow-x-auto px-6">
                      {open_.map((t) => (
                        <button key={t.id} onClick={() => { setTaskId(taskId === t.id ? undefined : t.id); setLabel('') }}
                          className={`shrink-0 rounded-full px-3.5 py-2 text-sm ${taskId === t.id ? 'bg-[#F7F2E9] font-semibold text-[#1C1612]' : 'bg-white/5 text-[#F7F2E9]/75'}`}>{t.title}</button>
                      ))}
                    </div>
                  )}
                  <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#F7F2E9] outline-none placeholder:text-[#F7F2E9]/35 focus:border-[#E28436]"
                    placeholder="Or type what you will work on" aria-label="What you will work on" value={label} onChange={(e) => { setLabel(e.target.value); setTaskId(undefined) }} />
                </div>
                <div className="mt-6 space-y-2">
                  <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-[#F7F2E9]/50">Before you start</p>
                  {NUDGES.map(({ I, t }, i) => (
                    <button key={t} onClick={() => setChecks(checks.map((c, k) => (k === i ? !c : c)))} className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-left text-sm">
                      <I size={17} strokeWidth={1.7} className="text-[#CDA85C]" />
                      <span className="flex-1">{t}</span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checks[i] ? 'border-[#E28436] bg-[#E28436]' : 'border-white/25'}`}>{checks[i] && <Check size={13} strokeWidth={3} />}</span>
                    </button>
                  ))}
                </div>
                <button onClick={begin} className="btn mt-6 w-full bg-[#E28436] text-white"><Play size={18} />Start {mins} minute focus</button>
              </>
            )}

            <div className="mt-8 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white/5 py-3"><p className="num font-display text-xl font-medium">{fmtH(todayMin)}</p><p className="text-2xs uppercase tracking-[0.1em] text-[#F7F2E9]/50">Today</p></div>
              <div className="rounded-xl bg-white/5 py-3"><p className="num font-display text-xl font-medium">{fmtH(weekMin)}</p><p className="text-2xs uppercase tracking-[0.1em] text-[#F7F2E9]/50">This week</p></div>
            </div>
            <blockquote className="mt-8 border-l-2 border-[#CDA85C] pl-4">
              <p className="font-serif text-[16px] italic leading-relaxed text-[#F7F2E9]/85">{quote.text}</p>
              <p className="mt-2 text-xs text-[#F7F2E9]/50">Swami Vivekananda</p>
            </blockquote>
            <p className="mt-6 text-center text-xs text-[#F7F2E9]/40">The timer keeps running if you leave the app. No feeds. One thing at a time.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
