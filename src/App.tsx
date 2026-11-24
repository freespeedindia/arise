import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import BottomNav, { type Tab } from './components/BottomNav'
import { useSettings } from './lib/settings'
import Today from './screens/Today'
import Tasks from './screens/Tasks'
import Goals from './screens/Goals'
import ComingSoon from './screens/ComingSoon'
import Welcome from './screens/Welcome'
import SettingsSheet from './screens/SettingsSheet'

const TABS: Tab[] = ['today', 'tasks', 'goals', 'health', 'money']
const readHash = (): Tab => {
  const h = window.location.hash.replace('#', '') as Tab
  return TABS.includes(h) ? h : 'today'
}

export default function App() {
  const settings = useSettings()
  const [tab, setTab] = useState<Tab>(readHash)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14121F' : '#FF9933')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])

  if (!settings) return null
  if (!settings.onboarded) return <Welcome />

  const go = (t: Tab) => {
    window.location.hash = t
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto min-h-full max-w-lg pb-28">
      <motion.main key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {tab === 'today' && <Today name={settings.name} onNavigate={go} onOpenSettings={() => setSettingsOpen(true)} />}
          {tab === 'tasks' && <Tasks />}
          {tab === 'goals' && <Goals />}
          {tab === 'health' && <ComingSoon kind="health" />}
          {tab === 'money' && <ComingSoon kind="money" />}
      </motion.main>
      <BottomNav tab={tab} onChange={go} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} />
    </div>
  )
}
