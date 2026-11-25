import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import Toast from './components/Toast'
import { useSettings } from './lib/settings'
import { useToday } from './lib/useToday'
import { useSchedule } from './lib/useSchedule'
import { useNotifier } from './lib/notifier'
import Today from './screens/Today'
import Tasks from './screens/Tasks'
import Goals from './screens/Goals'
import Health, { type HealthAction } from './screens/Health'
import Money from './screens/Money'
import Welcome from './screens/Welcome'
import SettingsSheet from './screens/SettingsSheet'
import RemindersSheet from './screens/RemindersSheet'

const TABS: Tab[] = ['today', 'tasks', 'goals', 'health', 'money']
const readHash = (): Tab => {
  const h = window.location.hash.replace('#', '') as Tab
  return TABS.includes(h) ? h : 'today'
}

export default function App() {
  const settings = useSettings()
  const [tab, setTab] = useState<Tab>(readHash)
  const [healthAction, setHealthAction] = useState<HealthAction>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const today = useToday() // re-draws the screen when the date changes
  const schedule = useSchedule(today)
  useNotifier(today, schedule, !!settings?.notifications)

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
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#16120F' : '#F7F2E9')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])

  if (!settings) return null
  if (!settings.onboarded) return <Welcome />

  const go = (t: Tab, action: HealthAction = null) => {
    setHealthAction(action)
    window.location.hash = t
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto min-h-full max-w-lg pb-28">
      <motion.main key={`${tab}-${today}-${healthAction ?? ''}`} initial={{ y: 6 }} animate={{ y: 0 }} transition={{ duration: 0.18 }}>
        {tab === 'today' && <Today s={settings} today={today} schedule={schedule ?? []} onNavigate={go} onOpenSettings={() => setSettingsOpen(true)} onOpenReminders={() => setRemindersOpen(true)} />}
        {tab === 'tasks' && <Tasks today={today} />}
        {tab === 'goals' && <Goals />}
        {tab === 'health' && <Health s={settings} today={today} initial={healthAction} />}
        {tab === 'money' && <Money />}
      </motion.main>
      <BottomNav tab={tab} onChange={(t) => go(t)} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} />
      <RemindersSheet open={remindersOpen} onClose={() => setRemindersOpen(false)} s={settings} schedule={schedule ?? []} today={today} />
      <Toast />
    </div>
  )
}
