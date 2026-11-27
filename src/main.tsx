import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { Capacitor } from '@capacitor/core'

// Keep the installed app up to date. When a new version is published, the new files are
// fetched in the background and the app reloads itself once, so old and new code never mix.
// Phones keep installed apps in memory, so we also check whenever the app comes back on screen.
// The iPhone app (Xcode build) carries its files inside the app, so it needs no service worker.
if (!Capacitor.isNativePlatform()) registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}) }
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
    setInterval(check, 30 * 60 * 1000)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
