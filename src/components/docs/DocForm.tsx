import { useEffect, useRef, useState } from 'react'
import { Camera, FileUp, X } from 'lucide-react'
import Sheet from '../Sheet'
import { db, type DocRecord } from '../../lib/db'
import { addFiles, fileSize, MAX_FILE_MB } from '../../lib/documents'
import { addDays } from '../../lib/dates'
import type { Settings } from '../../lib/settings'
import { celebrate, toast } from '../../lib/celebrate'

const REMIND = [15, 30, 60, 90]

export default function DocForm({ open, onClose, s, doc, preset, today, onSaved }: {
  open: boolean; onClose: () => void; s: Settings; doc?: DocRecord | null; preset?: string; today: string; onSaved?: (id: number) => void
}) {
  const [kind, setKind] = useState('')
  const [title, setTitle] = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [number, setNumber] = useState('')
  const [holder, setHolder] = useState('')
  const [issuer, setIssuer] = useState('')
  const [issuedOn, setIssuedOn] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [remindDays, setRemindDays] = useState(30)
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const pick = useRef<HTMLInputElement>(null)
  const cam = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const k = doc?.kind ?? preset ?? s.docKinds[0] ?? 'Other'
    setKind(k); setTitle(doc?.title ?? k); setTitleTouched(!!doc)
    setNumber(doc?.number ?? ''); setHolder(doc?.holder ?? ''); setIssuer(doc?.issuer ?? '')
    setIssuedOn(doc?.issuedOn ?? ''); setExpiresOn(doc?.expiresOn ?? ''); setRemindDays(doc?.remindDays ?? 30)
    setAmount(doc?.amount ? String(doc.amount) : ''); setNotes(doc?.notes ?? ''); setPending([]); setBusy(false)
  }, [open, doc, preset, s.docKinds])

  const pickKind = (k: string) => { setKind(k); if (!titleTouched) setTitle(k) }
  const isInsurance = /insur|policy/i.test(kind)
  const onFiles = (list: FileList | null) => {
    const arr = [...(list ?? [])]
    const tooBig = arr.filter((f) => f.size > MAX_FILE_MB * 1e6)
    if (tooBig.length) toast(`${tooBig[0].name} is larger than ${MAX_FILE_MB} MB`)
    setPending((p) => [...p, ...arr.filter((f) => f.size <= MAX_FILE_MB * 1e6)])
  }
  const save = async () => {
    if (!title.trim() || busy) return
    setBusy(true)
    const now = new Date().toISOString()
    const data = {
      title: title.trim(), kind, number: number.trim() || undefined, holder: holder.trim() || undefined, issuer: issuer.trim() || undefined,
      issuedOn: issuedOn || undefined, expiresOn: expiresOn || undefined, remindDays, amount: Number(amount.replace(/,/g, '')) || undefined,
      notes: notes.trim() || undefined, updatedAt: now,
    }
    let id = doc?.id
    try {
      if (id != null) await db.docs.update(id, data)
      else id = await db.docs.add({ ...data, createdAt: now })
      if (pending.length) await addFiles(id!, pending)
      celebrate(false, doc ? 'Document updated' : 'Document saved')
      onSaved?.(id!)
      onClose()
    } catch (e) {
      console.error(e); toast('Could not save. The phone may be out of space.')
    }
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={doc ? 'Edit document' : 'Add document'}>
      <div className="space-y-5">
        <div>
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...s.docKinds, ...(doc && !s.docKinds.includes(doc.kind) ? [doc.kind] : [])])].map((k) => (
              <button key={k} onClick={() => pickKind(k)} className={`chip ${kind === k ? 'chip-on' : ''}`}>{k}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="d-title">Name</label>
          <input id="d-title" className="input" value={title} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true) }} placeholder="e.g. Passport, Swift car insurance" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="d-num">{isInsurance ? 'Policy number' : 'Number'}</label>
            <input id="d-num" className="input" autoComplete="off" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label" htmlFor="d-holder">{/car|bike|vehicle/i.test(kind) ? 'Vehicle' : 'Belongs to'}</label>
            <input id="d-holder" className="input" value={holder} onChange={(e) => setHolder(e.target.value)} placeholder={/car|bike|vehicle/i.test(kind) ? 'e.g. KA 01 AB 1234' : 'e.g. Self'} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="d-issuer">{isInsurance ? 'Insurer' : 'Issued by'}</label>
          <input id="d-issuer" className="input" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="d-issued">Issued on</label>
            <input id="d-issued" type="date" className="input" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="d-exp">Expires on</label>
            <input id="d-exp" type="date" className="input" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </div>
        </div>
        {!expiresOn && (
          <div className="flex flex-wrap gap-2">
            {([['1 year', 365], ['5 years', 1826], ['10 years', 3652]] as const).map(([l, n]) => (
              <button key={l} onClick={() => setExpiresOn(addDays(issuedOn || today, n - 1))} className="chip">Valid {l}</button>
            ))}
          </div>
        )}
        {expiresOn && (
          <div>
            <span className="label">Remind me before expiry</span>
            <div className="seg grid-cols-4">
              {REMIND.map((d) => <button key={d} onClick={() => setRemindDays(d)} className={`seg-item ${remindDays === d ? 'seg-item-on' : ''}`}>{d} days</button>)}
            </div>
          </div>
        )}
        {(isInsurance || amount) && (
          <div>
            <label className="label" htmlFor="d-amt">{isInsurance ? `Premium (${s.currency})` : `Renewal fee (${s.currency})`}</label>
            <input id="d-amt" className="input num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Optional" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="d-notes">Notes</label>
          <textarea id="d-notes" rows={2} className="input resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Agent phone, nominee, where the original is kept" />
        </div>
        {!doc && (
          <div>
            <span className="label">Files</span>
            {pending.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {pending.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl bg-sunken px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{f.name}</span><span className="text-xs text-muted">{fileSize(f.size)}</span>
                    <button onClick={() => setPending(pending.filter((_, k) => k !== i))} aria-label={`Remove ${f.name}`} className="p-1 text-faint"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => pick.current?.click()} className="btn-secondary"><FileUp size={17} />PDF or photo</button>
              <button onClick={() => cam.current?.click()} className="btn-secondary"><Camera size={17} />Take photo</button>
            </div>
            <input ref={pick} type="file" accept="application/pdf,image/*" multiple className="hidden" aria-label="Choose files" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
            <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take a photo" onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          </div>
        )}
        <button onClick={save} disabled={!title.trim() || busy} className="btn-primary w-full">{busy ? 'Saving…' : doc ? 'Save changes' : 'Save document'}</button>
        <p className="text-center text-xs text-faint">Stored only on this phone. Nothing is uploaded.</p>
      </div>
    </Sheet>
  )
}
