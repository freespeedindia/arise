import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import Toast from './components/Toast'
import { migrateSettings, useSettings } from './lib/settings'
import { useToday } from './lib/useToday'
import { useSchedule } from './lib/useSchedule'
import { useNotifier } from './lib/notifier'
import Today from './screens/Today'
import Tasks from './screens/Tasks'
import Goals from './screens/Goals'
import Health, { type HealthAction } from './screens/Health'
import Money, { type MoneyAction } from './screens/Money'
import Welcome from './screens/Welcome'
import Documents from './screens/Documents'
import SettingsSheet from './screens/SettingsSheet'
import RemindersSheet from './screens/RemindersSheet'
import FocusScreen from './screens/FocusScreen'
import ReviewSheet from './screens/ReviewSheet'
import ExportSheet from './screens/ExportSheet'
import { mmss, useFocus } from './lib/focus'
import { Timer } from 'lucide-react'

const TABS: Tab[] = ['today', 'tasks', 'goals', 'health', 'money', 'docs']
const readHash = (): Tab => {
  const h = window.location.hash.replace('#', '') as Tab
  return TABS.includes(h) ? h : 'today'
}

export default function App() {
  const settings = useSettings()
  const [tab, setTab] = useState<Tab>(readHash)
  const [healthAction, setHealthAction] = useState<HealthAction>(null)
  const [moneyAction, setMoneyAction] = useState<MoneyAction>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const today = useToday() // re-draws the screen when the date changes
  const schedule = useSchedule(today)
  useNotifier(today, schedule, !!settings?.notifications)
  const focus = useFocus(settings?.breakMinutes ?? 5)
  const [focusOpen, setFocusOpen] = useState(false)
  const [review, setReview] = useState<{ open: boolean; kind: 'daily' | 'weekly' | 'monthly' }>({ open: false, kind: 'daily' })
  // The day you are looking at: plan tomorrow or review earlier days
  const [viewDate, setViewDate] = useState(today)
  useEffect(() => { setViewDate(today) }, [today])
  useEffect(() => { migrateSettings() }, [])

  useEffect(() => {
    const onHash = () => setTab(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Light / dark mode
  useEffect(() => {
    if (!settings) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1E1D1B' : '#E8E4DC')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])

  if (!settings) return null
  if (!settings.onboarded) return <Welcome />

  const go = (t: Tab, action: HealthAction | MoneyAction = null) => {
    setHealthAction(t === 'health' ? (action as HealthAction) : null)
    setMoneyAction(t === 'money' ? (action as MoneyAction) : null)
    window.location.hash = t
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto min-h-full max-w-lg pb-28">
      <motion.main key={`${tab}-${today}-${healthAction ?? ''}${moneyAction ?? ''}`} initial={{ y: 6 }} animate={{ y: 0 }} transition={{ duration: 0.18 }}>
        {tab === 'today' && <Today s={settings} today={today} date={viewDate} setDate={setViewDate} schedule={schedule ?? []} onNavigate={go} onOpenSettings={() => setSettingsOpen(true)} onOpenReminders={() => setRemindersOpen(true)} onOpenFocus={() => setFocusOpen(true)} onOpenReview={(kind) => setReview({ open: true, kind })} focus={focus} />}
        {tab === 'tasks' && <Tasks today={today} date={viewDate} setDate={setViewDate} />}
        {tab === 'goals' && <Goals s={settings} today={today} />}
        {tab === 'health' && <Health s={settings} today={today} date={viewDate} setDate={setViewDate} initial={healthAction} />}
        {tab === 'docs' && <Documents s={settings} today={today} />}
        {tab === 'money' && <Money s={settings} today={today} date={viewDate} initial={moneyAction} />}
      </motion.main>
      {focus.state && tab !== 'today' && (
        <button onClick={() => setFocusOpen(true)} className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-4 z-30 inline-flex items-center gap-2 rounded-full bg-hero px-4 py-2.5 text-sm font-semibold text-[#F7F2E9] shadow-card">
          <Timer size={16} className="text-[#E28436]" /><span className="num">{mmss(focus.left)}</span>{focus.state.phase === 'break' ? 'break' : 'focus'}
        </button>
      )}
      <BottomNav tab={tab} onChange={(t) => go(t)} />
      <FocusScreen open={focusOpen} onClose={() => setFocusOpen(false)} s={settings} today={today} focus={focus} />
      <ReviewSheet open={review.open} onClose={() => setReview({ ...review, open: false })} s={settings} today={today} date={viewDate} kind={review.kind} />
      <ExportSheet today={today} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onOpenDocs={() => { setSettingsOpen(false); go('docs') }} onOpenFocus={() => { setSettingsOpen(false); setFocusOpen(true) }} />
      <RemindersSheet open={remindersOpen} onClose={() => setRemindersOpen(false)} s={settings} schedule={schedule ?? []} today={today} />
      <Toast />
    </div>
  )
}
