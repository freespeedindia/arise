import { useEffect, useState } from 'react'
import { db } from './db'
import { todayKey } from './dates'
import { celebrate } from './celebrate'
import { showNotification } from './notifier'
import { isNative, nativeFocusAlarm } from './native'

/** A running focus timer survives closing the app: it is stored with its end time. */
export interface FocusState { phase: 'focus' | 'break'; endsAt: number; minutes: number; label?: string; taskId?: number; pausedLeft?: number }
const KEY = 'arise-focus'
const listeners = new Set<() => void>()
export function readFocus(): FocusState | null {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export function writeFocus(s: FocusState | null) {
  // iPhone app: let iOS ring at the end, even if Arise is closed by then
  if (isNative()) {
    const run = s && s.pausedLeft == null
    nativeFocusAlarm(run ? s.endsAt : null, s?.phase === 'break' ? 'Break over' : 'Focus session complete',
      s?.phase === 'break' ? 'Ready for the next focus session.' : `${s?.minutes ?? ''} minutes done. Time for a short break.`).catch(() => {})
  }
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) } catch { /* private mode */ }
  listeners.forEach((l) => l())
}
export const startFocus = (minutes: number, label?: string, taskId?: number) =>
  writeFocus({ phase: 'focus', endsAt: Date.now() + minutes * 60000, minutes, label, taskId })
export const startBreak = (minutes: number) => writeFocus({ phase: 'break', endsAt: Date.now() + minutes * 60000, minutes })
export function pauseFocus() { const s = readFocus(); if (s && s.pausedLeft == null) writeFocus({ ...s, pausedLeft: Math.max(0, s.endsAt - Date.now()) }) }
export function resumeFocus() { const s = readFocus(); if (s && s.pausedLeft != null) writeFocus({ ...s, endsAt: Date.now() + s.pausedLeft, pausedLeft: undefined }) }

/** Log the minutes actually focused (also used when stopping early, if at least 1 minute). */
export async function logFocus(minutes: number, label?: string) {
  if (minutes < 1) return
  await db.focus.add({ date: todayKey(), minutes: Math.round(minutes), label, at: new Date().toISOString() })
  const { syncLinkedGoals } = await import('./health')
  await syncLinkedGoals()
}

/** Ticks every second while a timer runs; finishes the phase when time is up. */
export function useFocus(breakMinutes: number) {
  const [state, setState] = useState<FocusState | null>(readFocus)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const l = () => setState(readFocus())
    listeners.add(l)
    const onStorage = (e: StorageEvent) => e.key === KEY && l()
    window.addEventListener('storage', onStorage)
    return () => { listeners.delete(l); window.removeEventListener('storage', onStorage) }
  }, [])
  useEffect(() => {
    if (!state || state.pausedLeft != null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [state])
  useEffect(() => {
    if (!state || state.pausedLeft != null || now < state.endsAt) return
    // phase complete
    if (state.phase === 'focus') {
      writeFocus(null)
      logFocus(state.minutes, state.label).then(() => {
        celebrate(true, `Focus session complete: ${state.minutes} minutes`)
        if (!isNative()) showNotification('Focus session complete', `${state.minutes} minutes done. Take a ${breakMinutes} minute break.`, 'focus-done')
        // Only start the break if the session ended recently (not while the app was closed for hours)
        if (breakMinutes > 0 && Date.now() - state.endsAt < breakMinutes * 60000) startBreak(breakMinutes)
      })
    } else {
      writeFocus(null)
      celebrate(false, 'Break over. Ready for the next session.')
      if (!isNative()) showNotification('Break over', 'Ready for the next focus session.', 'focus-break')
    }
  }, [now, state, breakMinutes])
  const left = state ? (state.pausedLeft ?? Math.max(0, state.endsAt - now)) : 0
  return { state, left }
}
export const mmss = (ms: number) => { const t = Math.ceil(ms / 1000); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
