import { useEffect, useState } from 'react'
import { todayKey } from './dates'

/** Today's date key, updated at midnight and when the app comes back to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const check = () => setToday((prev) => (prev === todayKey() ? prev : todayKey()))
    const id = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])
  return today
}
