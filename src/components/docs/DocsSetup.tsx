import { useEffect, useState } from 'react'
import Sheet from '../Sheet'
import ListEditor from '../money/ListEditor'
import PinPad from './PinPad'
import { setSettings, type Settings } from '../../lib/settings'
import { checkPin, hashPin } from '../../lib/documents'
import { unlockDocs } from '../../lib/lock'
import { celebrate } from '../../lib/celebrate'

type Step = null | 'new' | 'confirm' | 'old-change' | 'old-remove'

export default function DocsSetup({ open, onClose, s }: { open: boolean; onClose: () => void; s: Settings }) {
  const [kinds, setKinds] = useState<string[]>([])
  const [time, setTime] = useState('09:00')
  const [step, setStep] = useState<Step>(null)
  const [first, setFirst] = useState('')
  useEffect(() => { if (open) { setKinds(s.docKinds); setTime(s.docReminderTime || '09:00'); setStep(null) } }, [open, s.docKinds, s.docReminderTime])

  const save = async () => {
    const clean = [...new Set(kinds.map((k) => k.trim()).filter(Boolean))]
    await setSettings({ docKinds: clean.length ? clean : ['Other'], docReminderTime: time || '09:00' })
    celebrate(false, 'Saved'); onClose()
  }

  if (step) {
    const titles: Record<Exclude<Step, null>, [string, string]> = {
      new: ['Choose a 4-digit PIN', 'You will need it to open Documents.'],
      confirm: ['Enter it again', 'To make sure it is right.'],
      'old-change': ['Enter your current PIN', ''],
      'old-remove': ['Enter your current PIN', 'To turn the lock off.'],
    }
    return (
      <Sheet open={open} onClose={() => setStep(null)} title="Documents lock">
        <PinPad key={step} title={titles[step][0]} sub={titles[step][1]} error={step === 'confirm' ? 'PINs did not match. Try again.' : undefined}
          onDone={async (pin) => {
            if (step === 'new') { setFirst(pin); setStep('confirm'); return true }
            if (step === 'confirm') {
              if (pin !== first) { setStep('new'); return false }
              const { salt, hash } = await hashPin(pin)
              await setSettings({ pinSalt: salt, pinHash: hash }); unlockDocs(); setStep(null); celebrate(true, 'PIN set. Documents are locked when you leave the app.'); return true
            }
            const ok = await checkPin(pin, s.pinSalt!, s.pinHash!)
            if (!ok) return false
            if (step === 'old-change') setStep('new')
            else { await setSettings({ pinSalt: undefined, pinHash: undefined }); setStep(null); celebrate(false, 'Lock turned off') }
            return true
          }} />
      </Sheet>
    )
  }
  return (
    <Sheet open={open} onClose={onClose} title="Documents settings">
      <div className="space-y-6">
        <div>
          <span className="label">Lock</span>
          <p className="mb-2 text-xs text-muted">Ask for a 4-digit PIN to open Documents. It locks again a minute after you leave the app.</p>
          {s.pinHash ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep('old-change')} className="btn-secondary">Change PIN</button>
              <button onClick={() => setStep('old-remove')} className="btn-secondary text-crimson">Turn off</button>
            </div>
          ) : <button onClick={() => setStep('new')} className="btn-secondary w-full">Set a PIN</button>}
          <p className="mt-2 text-xs text-faint">If you forget the PIN, you can reset it from the lock screen, but that erases the stored documents. Your phone's own passcode protects them too.</p>
        </div>
        <div>
          <label className="label" htmlFor="ds-time">Expiry reminders at</label>
          <input id="ds-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <span className="label">Document types</span>
          <ListEditor label="document type" placeholder="New type, e.g. Gas connection" items={kinds} onChange={setKinds} />
        </div>
        <button onClick={save} className="btn-primary w-full">Save</button>
      </div>
    </Sheet>
  )
}
