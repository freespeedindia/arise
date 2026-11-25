// Quiet, professional feedback: a short haptic tick and a toast message.
type ToastListener = (msg: string) => void
const listeners = new Set<ToastListener>()
export const onToast = (l: ToastListener) => { listeners.add(l); return () => { listeners.delete(l) } }
export function toast(msg: string) { listeners.forEach((l) => l(msg)) }

export function celebrate(big = false, msg?: string) {
  try { navigator.vibrate?.(big ? [20, 40, 20] : 12) } catch { /* not supported */ }
  if (msg) toast(msg)
}
