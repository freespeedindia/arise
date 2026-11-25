import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Plus, Trash2 } from 'lucide-react'
import Sheet from '../components/Sheet'
import { db, type ReminderRepeat } from '../lib/db'
import { setSetting, setSettings, type Settings } from '../lib/settings'
import { notificationPermission, requestNotifications, showNotification } from '../lib/notifier'
import { isIOS, isStandalone } from '../lib/install'
import type { ScheduledReminder } from '../lib/reminders'
import { nowHHMM } from '../lib/reminders'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function RemindersSheet({ open, onClose, s, schedule, today }: {
  open: boolean; onClose: () => void; s: Settings; schedule: ScheduledReminder[]; today: string
}) {
  const [perm, setPerm] = useState(notificationPermission())
  const custom = useLiveQuery(() => db.reminders.toArray()) ?? []
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('09:00')
  const [repeat, setRepeat] = useState<ReminderRepeat>('daily')
  const [date, setDate] = useState(today)
  useEffect(() => { if (open) setPerm(notificationPermission()) }, [open])
  const now = nowHHMM()

  const enable = async () => {
    const ok = await requestNotifications()
    setPerm(notificationPermission())
    await setSetting('notifications', ok)
    if (ok) showNotification('Reminders are on', 'Arise will remind you through the day.', 'welcome')
  }
  const addCustom = async () => {
    if (!title.trim()) return
    await db.reminders.add({ title: title.trim(), time, repeat, date: repeat === 'once' || repeat === 'weekly' ? date : undefined, enabled: true, createdAt: new Date().toISOString() })
    setTitle('')
  }
  const needsInstall = isIOS() && !isStandalone()

  return (
    <Sheet open={open} onClose={onClose} title="Reminders">
      <div className="space-y-7">
        {/* Permission */}
        <div className="rounded-xl bg-sunken p-4">
          {perm === 'granted' && s.notifications ? (
            <div className="flex items-start gap-3">
              <Bell size={18} className="mt-0.5 shrink-0 text-forest" />
              <div className="text-sm">
                <p className="font-semibold">Phone notifications are on</p>
                <p className="mt-1 text-muted">They arrive while Arise is open or recently used. Reminders with the app fully closed come with cloud sync (Phase 4).</p>
                <button onClick={() => setSetting('notifications', false)} className="mt-2 text-sm font-semibold text-crimson">Turn off</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <BellOff size={18} className="mt-0.5 shrink-0 text-muted" />
              <div className="text-sm">
                <p className="font-semibold">Phone notifications are off</p>
                {needsInstall ? (
                  <p className="mt-1 text-muted">On iPhone, first add Arise to your Home Screen (Share, then Add to Home Screen), open it from there, then come back here.</p>
                ) : perm === 'denied' ? (
                  <p className="mt-1 text-muted">Notifications are blocked for this site. Allow them in your phone's settings for this app, then return here.</p>
                ) : perm === 'unsupported' ? (
                  <p className="mt-1 text-muted">This browser cannot show notifications. Reminders still appear on the Today screen.</p>
                ) : (
                  <button onClick={enable} className="btn-primary mt-3">Turn on notifications</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's schedule */}
        <div>
          <span className="label">Today</span>
          <div className="card divide-y divide-line">
            {schedule.length === 0 && <p className="p-4 text-sm text-muted">No reminders today.</p>}
            {schedule.map((r) => (
              <div key={r.key} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${r.time < now || r.done ? 'text-faint' : ''}`}>
                <span className="num w-12 font-semibold">{r.time}</span>
                <span className={`flex-1 ${r.done ? 'line-through' : ''}`}>{r.title}</span>
                {r.done && <Check size={14} className="text-forest" />}
              </div>
            ))}
          </div>
        </div>

        {/* Built-in nudges */}
        <div className="space-y-4">
          <span className="label">Daily rhythm</span>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="r-ws">Day starts</label><input id="r-ws" type="time" className="input" value={s.wakeStart} onChange={(e) => setSetting('wakeStart', e.target.value)} /></div>
            <div><label className="label" htmlFor="r-we">Day ends</label><input id="r-we" type="time" className="input" value={s.wakeEnd} onChange={(e) => setSetting('wakeEnd', e.target.value)} /></div>
          </div>
          <div>
            <span className="label">Water reminder</span>
            <div className="seg grid-cols-4">
              {[[0, 'Off'], [60, '1 h'], [90, '1.5 h'], [120, '2 h']].map(([m, l]) => (
                <button key={m} onClick={() => setSetting('waterEveryMin', m as number)} className={`seg-item ${s.waterEveryMin === m ? 'seg-item-on' : ''}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Run</span>
            <input type="time" aria-label="Run time" className="input" value={s.runTime} onChange={(e) => setSetting('runTime', e.target.value)} />
            <div className="mt-2">
              <div className="flex justify-between">
                {DAYS.map((d, i) => {
                  const on = s.runDays.includes(i)
                  return <button key={i} aria-label={`Run on ${DAY_NAMES[i]}`} aria-pressed={on} onClick={() => setSetting('runDays', on ? s.runDays.filter((x) => x !== i) : [...s.runDays, i])}
                    className={`h-9 w-9 rounded-full text-sm font-semibold ${on ? 'bg-ink text-bg' : 'border border-line text-muted'}`}>{d}</button>
                })}
              </div>
            </div>
          </div>
          <Toggle label="Supplement reminders at each dose time" on={s.supplementReminders} onChange={(v) => setSetting('supplementReminders', v)} />
          <div><label className="label" htmlFor="r-ev">Evening review</label><input id="r-ev" type="time" className="input" value={s.eveningReviewTime} onChange={(e) => setSetting('eveningReviewTime', e.target.value)} /></div>
          <div>
            <label className="label" htmlFor="r-gr">Weekly goal review</label>
            <div className="grid grid-cols-2 gap-2">
                <select id="r-gr" className="input" value={s.reviewDay} onChange={(e) => setSetting('reviewDay', Number(e.target.value))}>
                  {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
                <input type="time" aria-label="Goal review time" className="input" value={s.reviewTime} onChange={(e) => setSetting('reviewTime', e.target.value)} />
            </div>
          </div>
          <button onClick={() => setSettings({ waterEveryMin: 0, runTime: '', supplementReminders: false, eveningReviewTime: '', reviewTime: '' })} className="text-sm font-semibold text-muted">Turn off all built-in reminders</button>
        </div>

        {/* Custom */}
        <div>
          <span className="label">Your reminders</span>
          <div className="space-y-2">
            {custom.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-sunken px-4 py-2.5 text-sm">
                <span className="num font-semibold">{r.time}</span>
                <span className="flex-1">{r.title} <span className="text-muted">· {r.repeat === 'once' ? r.date : r.repeat}</span></span>
                <button onClick={() => db.reminders.delete(r.id!)} aria-label={`Delete reminder ${r.title}`} className="text-faint"><Trash2 size={15} /></button>
              </div>
            ))}
            <input className="input" placeholder="Remind me to…" aria-label="Reminder text" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" aria-label="Reminder time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              <select aria-label="Repeat" className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}>
                <option value="once">Once</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Every week</option>
              </select>
            </div>
            {(repeat === 'once' || repeat === 'weekly') && <input type="date" aria-label="Reminder date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />}
            <button onClick={addCustom} disabled={!title.trim()} className="btn-secondary w-full"><Plus size={16} />Add reminder</button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on} className="flex w-full items-center justify-between gap-3 text-left text-sm">
      <span>{label}</span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-forest' : 'bg-line'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}
