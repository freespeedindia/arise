import { useEffect, useState } from 'react'

// Documents unlock lasts while the app is in use, and ends 1 minute after the app is put away.
let unlocked = false
let hiddenAt = 0
const subs = new Set<(v: boolean) => void>()
const set = (v: boolean) => { unlocked = v; subs.forEach((f) => f(v)) }
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 60_000) set(false)
  })
}
export const unlockDocs = () => set(true)
export const lockDocs = () => set(false)
export function useDocsUnlocked() {
  const [v, setV] = useState(unlocked)
  useEffect(() => { subs.add(setV); return () => { subs.delete(setV) } }, [])
  return v
}
