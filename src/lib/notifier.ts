import { useEffect } from 'react'
import type { ScheduledReminder } from './reminders'
import { nowHHMM, toMin } from './reminders'
import { QUOTES } from '../data/quotes'

/**
 * Shows phone notifications for reminders while Arise is open or recently used.
 * (Reminders when the app is fully closed need a small server — planned for Phase 4.)
 */
const firedKey = (date: string) => `arise-fired-${date}`
const getFired = (date: string): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(firedKey(date)) || '[]')) } catch { return new Set() }
}
const saveFired = (date: string, s: Set<string>) => {
  try { localStorage.setItem(firedKey(date), JSON.stringify([...s])) } catch { /* storage unavailable */ }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window
export const notificationPermission = () => (notificationsSupported() ? Notification.permission : 'unsupported')

export async function requestNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false
  const p = await Notification.requestPermission()
  return p === 'granted'
}

export async function showNotification(title: string, body: string, tag?: string) {
  if (notificationPermission() !== 'granted') return
  const icon = `${import.meta.env.BASE_URL}icon-192.png`
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) { await reg.showNotification(title, { body, icon, badge: icon, tag }); return }
  } catch { /* fall back below */ }
  try { new Notification(title, { body, icon, tag }) } catch { /* not allowed */ }
}

/** Which reminders are due to fire now (within a 15 minute window, not done, not already shown). */
export function dueNow(list: ScheduledReminder[], now: string, fired: Set<string>): ScheduledReminder[] {
  const n = toMin(now)
  return list.filter((r) => !r.done && !fired.has(r.key) && toMin(r.time) <= n && n - toMin(r.time) <= 15)
}

export function useNotifier(date: string, schedule: ScheduledReminder[] | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !schedule) return
    const tick = () => {
      const fired = getFired(date)
      const due = dueNow(schedule, nowHHMM(), fired)
      due.forEach((r, i) => {
        // Add a Vivekananda quote to roughly one in four reminders
        const q = (fired.size + i) % 4 === 3 ? `\n\n“${QUOTES[(fired.size * 13 + i) % QUOTES.length].text}” — Swami Vivekananda` : ''
        showNotification(r.title, r.body + q, r.key)
        fired.add(r.key)
      })
      if (due.length) saveFired(date, fired)
    }
    tick()
    const id = window.setInterval(tick, 20_000)
    return () => window.clearInterval(id)
  }, [date, schedule, enabled])
}
