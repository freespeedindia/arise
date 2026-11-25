import { Capacitor } from '@capacitor/core'
import type { ScheduledReminder } from './reminders'
import { QUOTES } from '../data/quotes'

/**
 * Bridges to the iPhone when Arise runs as the native app (the Xcode build).
 * In Safari / the home-screen web app none of this is used.
 */
export const isNative = () => Capacitor.isNativePlatform()

// ---------- Notifications ----------
// Note: never return a plugin object from a promise (it would be mistaken for a promise itself)
const mod = () => import('@capacitor/local-notifications')

export async function nativePermission(): Promise<NotificationPermission> {
  const r = await (await mod()).LocalNotifications.checkPermissions()
  return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default'
}
export async function nativeRequest(): Promise<boolean> {
  return (await (await mod()).LocalNotifications.requestPermissions()).display === 'granted'
}

/** Stable positive 31-bit id for a reminder on a date. */
function idFor(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 1) % 2_000_000_000 + 1000
}

export async function nativeShowNow(title: string, body: string, tag = 'now') {
  await (await mod()).LocalNotifications.schedule({ notifications: [{ id: idFor(tag + Date.now()), title, body, schedule: { at: new Date(Date.now() + 1000) } }] })
}

const FOCUS_ID = 77
/** Ring when a focus session or break ends, even if Arise is closed. */
export async function nativeFocusAlarm(endsAt: number | null, title = '', body = '') {
  const L = (await mod()).LocalNotifications
  await L.cancel({ notifications: [{ id: FOCUS_ID }] }).catch(() => {})
  if (endsAt && endsAt > Date.now()) await L.schedule({ notifications: [{ id: FOCUS_ID, title, body, schedule: { at: new Date(endsAt) } }] })
}

/**
 * Hand the coming days' reminders to iOS so they arrive even when Arise is closed.
 * iOS keeps at most 64 waiting notifications, so the nearest 60 are booked.
 * Called again whenever the plan changes, so the list is always current.
 */
let lastPlan = ''
export async function nativeBook(days: { date: string; list: ScheduledReminder[] }[]) {
  const now = Date.now()
  const items: { id: number; title: string; body: string; at: Date }[] = []
  days.forEach(({ date, list }, d) => {
    list.forEach((r, i) => {
      if (r.done) return
      const [y, m, day] = date.split('-').map(Number)
      const [hh, mm] = r.time.split(':').map(Number)
      const at = new Date(y, m - 1, day, hh, mm, 0)
      if (at.getTime() <= now + 5000) return
      const body = r.kind === 'water' && d > 0 ? 'Drink a glass of water.' : r.body
      const q = (i + d) % 4 === 3 ? `\n\n“${QUOTES[(i * 13 + d * 7) % QUOTES.length].text}” — Swami Vivekananda` : ''
      items.push({ id: idFor(`${date}|${r.key}`), title: r.title, body: body + q, at })
    })
  })
  items.sort((a, b) => a.at.getTime() - b.at.getTime())
  const book = items.slice(0, 60)
  const plan = JSON.stringify(book.map((b) => [b.id, b.at.getTime(), b.title, b.body]))
  if (plan === lastPlan) return
  lastPlan = plan
  const L = (await mod()).LocalNotifications
  const pending = await L.getPending()
  const old = pending.notifications.filter((n) => n.id !== FOCUS_ID).map((n) => ({ id: n.id }))
  if (old.length) await L.cancel({ notifications: old })
  if (book.length) await L.schedule({ notifications: book.map((b) => ({ id: b.id, title: b.title, body: b.body, schedule: { at: b.at, allowWhileIdle: true } })) })
}
export async function nativeCancelAll() {
  lastPlan = ''
  const L = (await mod()).LocalNotifications
  const pending = await L.getPending()
  const old = pending.notifications.filter((n) => n.id !== FOCUS_ID).map((n) => ({ id: n.id }))
  if (old.length) await L.cancel({ notifications: old })
}

// ---------- Files: share sheet (Mail, WhatsApp, Save to Files...) ----------
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
export async function nativeShareFiles(files: File[], title = 'Arise'): Promise<'shared' | 'cancelled'> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
  const uris: string[] = []
  for (const f of files) {
    const safe = f.name.replace(/[^\w.\- ]+/g, '_')
    const r = await Filesystem.writeFile({ path: `share/${safe}`, data: toBase64(await f.arrayBuffer()), directory: Directory.Cache, recursive: true })
    uris.push(r.uri)
  }
  try {
    await Share.share({ title, files: uris })
    return 'shared'
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return 'cancelled'
    throw e
  }
}
