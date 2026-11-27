import { useState } from 'react'
import { Delete, Lock } from 'lucide-react'

/** Number pad for the Documents lock. */
export default function PinPad({ title, sub, onDone, error }: { title: string; sub?: string; onDone: (pin: string) => Promise<boolean> | boolean; error?: string }) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [msg, setMsg] = useState('')
  const press = async (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next); setMsg('')
    if (next.length === 4) {
      const ok = await onDone(next)
      if (!ok) { setShake(true); setMsg(error ?? 'Wrong PIN'); try { navigator.vibrate?.([30, 40, 30]) } catch { /* */ } setTimeout(() => { setPin(''); setShake(false) }, 450) }
      else setPin('')
    }
  }
  return (
    <div className="flex flex-col items-center py-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold"><Lock size={24} strokeWidth={1.7} /></span>
      <p className="mt-4 font-display text-xl font-medium">{title}</p>
      {sub && <p className="mt-1 max-w-xs text-center text-sm text-muted">{sub}</p>}
      <div className={`mt-6 flex gap-4 ${shake ? 'animate-[shake_0.4s]' : ''}`} aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? 'border-saffron bg-saffron' : 'border-line'}`} />)}
      </div>
      <p className="mt-3 h-5 text-sm text-crimson">{msg}</p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
          k === '' ? <span key="blank" /> : (
            <button key={k} onClick={() => (k === 'del' ? setPin(pin.slice(0, -1)) : press(k))} aria-label={k === 'del' ? 'Delete digit' : `Digit ${k}`}
              className="num flex h-16 w-16 items-center justify-center rounded-full bg-surface text-2xl font-medium active:bg-sunken">
              {k === 'del' ? <Delete size={20} /> : k}
            </button>
          ))}
      </div>
    </div>
  )
}
