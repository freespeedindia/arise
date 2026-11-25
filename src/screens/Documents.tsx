import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Lock, Paperclip, Search, Settings2 } from 'lucide-react'
import { db, type DocFile, type DocRecord } from '../lib/db'
import { checkPin, docStatus, expiryText, statusTone, type DocStatus } from '../lib/documents'
import { lockDocs, unlockDocs, useDocsUnlocked } from '../lib/lock'
import { setSettings } from '../lib/settings'
import type { Settings } from '../lib/settings'
import Fab from '../components/Fab'
import DocForm from '../components/docs/DocForm'
import DocDetail from '../components/docs/DocDetail'
import DocViewer from '../components/docs/DocViewer'
import PinPad from '../components/docs/PinPad'
import DocsSetup from '../components/docs/DocsSetup'
import { DocIcon, mask } from '../components/docs/kinds'

const ORDER: Record<DocStatus, number> = { expired: 0, soon: 1, valid: 2, none: 3 }
const STARTERS = ['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Vehicle RC', 'Car insurance', 'Health insurance', 'Life insurance']

export default function Documents({ s, today }: { s: Settings; today: string }) {
  const unlocked = useDocsUnlocked()
  const locked = !!s.pinHash && !unlocked
  const docs = useLiveQuery(() => db.docs.toArray()) ?? []
  const counts = useLiveQuery(async () => {
    const m: Record<number, number> = {}
    await db.docFiles.each((f) => { m[f.docId] = (m[f.docId] || 0) + 1 })
    return m
  }) ?? {}
  const thumbs = useLiveQuery(async () => {
    const m: Record<number, string> = {}
    await db.docFiles.each((f) => { if (f.thumb && !m[f.docId]) m[f.docId] = f.thumb })
    return m
  }) ?? {}
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<string>('All')
  const [statusF, setStatusF] = useState<DocStatus | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<DocRecord | null>(null)
  const [preset, setPreset] = useState<string | undefined>()
  const [openId, setOpenId] = useState<number | null>(null)
  const [viewing, setViewing] = useState<DocFile | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)

  if (locked) {
    return (
      <div className="px-5 safe-top">
        <p className="eyebrow mt-2">Locked</p>
        <h1 className="h1 mt-1">Documents</h1>
        <div className="card mt-5">
          <PinPad title="Enter your PIN" sub="Your documents are locked." onDone={async (pin) => { const ok = await checkPin(pin, s.pinSalt!, s.pinHash!); if (ok) unlockDocs(); return ok }} />
        </div>
        <ForgotPin />
      </div>
    )
  }

  const withStatus = docs.map((d) => ({ d, st: docStatus(d, today) }))
  const soon = withStatus.filter((x) => x.st.status === 'soon').length
  const expired = withStatus.filter((x) => x.st.status === 'expired').length
  const kindsPresent = [...new Set(docs.map((d) => d.kind))].sort((a, b) => s.docKinds.indexOf(a) - s.docKinds.indexOf(b))
  const needle = q.trim().toLowerCase()
  const list = withStatus
    .filter(({ d }) => kind === 'All' || d.kind === kind)
    .filter(({ st }) => !statusF || st.status === statusF)
    .filter(({ d }) => !needle || [d.title, d.kind, d.number, d.holder, d.issuer, d.notes].some((v) => v?.toLowerCase().includes(needle)))
    .sort((a, b) => ORDER[a.st.status] - ORDER[b.st.status] || (a.d.expiresOn ?? '9').localeCompare(b.d.expiresOn ?? '9') || a.d.title.localeCompare(b.d.title))
  const detail = docs.find((d) => d.id === openId) ?? null
  const add = (k?: string) => { setEditing(null); setPreset(k); setFormOpen(true) }

  return (
    <div className="px-5 safe-top">
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Identity · Vehicle · Insurance · Records</p>
          <h1 className="h1 mt-1">Documents</h1>
        </div>
        <div className="mt-1 flex gap-1">
          {s.pinHash && <button onClick={lockDocs} aria-label="Lock documents" className="flex h-11 w-11 items-center justify-center rounded-full text-muted"><Lock size={19} strokeWidth={1.75} /></button>}
          <button onClick={() => setSetupOpen(true)} aria-label="Documents settings" className="flex h-11 w-11 items-center justify-center rounded-full text-muted"><Settings2 size={20} strokeWidth={1.75} /></button>
        </div>
      </div>

      <div className="card mt-5 grid grid-cols-3 divide-x divide-line">
        {([[null, 'Stored', docs.length, ''], ['soon', 'Expiring soon', soon, 'text-saffron-deep'], ['expired', 'Expired', expired, 'text-crimson']] as const).map(([k, l, n, tone]) => (
          <button key={l} onClick={() => setStatusF(statusF === k ? null : k)} className={`px-2 py-3 text-center ${statusF === k && k ? 'bg-sunken' : ''}`}>
            <p className={`num font-serif text-2xl font-semibold ${n ? tone : ''}`}>{n}</p>
            <p className="text-2xs uppercase tracking-[0.08em] text-muted">{l}</p>
          </button>
        ))}
      </div>

      {docs.length > 0 && (
        <>
          <div className="relative mt-4">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
            <input className="input pl-10" placeholder="Search name, number, vehicle" aria-label="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {kindsPresent.length > 1 && (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              {['All', ...kindsPresent].map((k) => <button key={k} onClick={() => setKind(k)} className={`chip ${kind === k ? 'chip-on' : ''}`}>{k}</button>)}
            </div>
          )}
          {statusF && <button onClick={() => setStatusF(null)} className="mt-3 text-sm font-semibold text-saffron">Showing {statusF === 'soon' ? 'expiring soon' : 'expired'} only · Show all</button>}
        </>
      )}

      <div className="mt-4 space-y-2.5">
        {list.map(({ d, st }) => (
          <button key={d.id} onClick={() => setOpenId(d.id!)} className="card flex w-full items-center gap-3 p-3.5 text-left">
            {thumbs[d.id!] ? <img src={thumbs[d.id!]} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold"><DocIcon kind={d.kind} /></span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.title}</p>
              <p className="truncate text-xs text-muted">{[d.title !== d.kind ? d.kind : '', d.holder, mask(d.number)].filter(Boolean).join(' · ') || d.kind}</p>
              <p className={`mt-0.5 text-xs font-semibold ${statusTone[st.status]}`}>{expiryText(d, today)}</p>
            </div>
            {counts[d.id!] ? <span className="flex items-center gap-1 text-xs text-muted"><Paperclip size={13} />{counts[d.id!]}</span> : null}
          </button>
        ))}
        {docs.length > 0 && list.length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing matches.</p>}
      </div>

      {docs.length === 0 && (
        <div className="card mt-2 p-5">
          <p className="font-serif text-lg font-semibold">Keep every important document in one place</p>
          <p className="mt-1 text-sm text-muted">Add the details and a PDF or photo. Arise reminds you before anything expires. Files stay on this phone.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STARTERS.filter((k) => s.docKinds.includes(k)).map((k) => (
              <button key={k} onClick={() => add(k)} className="chip"><DocIcon kind={k} size={15} />{k}</button>
            ))}
          </div>
        </div>
      )}
      <p className="my-8 text-center text-xs text-faint">{s.pinHash ? 'Protected with your PIN. ' : ''}Stored only on this phone. Include them in Settings, Save backup.</p>

      <Fab onClick={() => add()} label="Add document" />
      <DocForm open={formOpen} onClose={() => setFormOpen(false)} s={s} doc={editing} preset={preset} today={today} onSaved={(id) => { if (!editing) setOpenId(id) }} />
      <DocDetail doc={formOpen ? null : detail} onClose={() => setOpenId(null)} onEdit={(d) => { setEditing(d); setFormOpen(true) }} onView={setViewing} s={s} today={today} />
      <DocViewer file={viewing} onClose={() => setViewing(null)} />
      <DocsSetup open={setupOpen} onClose={() => setSetupOpen(false)} s={s} />
    </div>
  )
}

function ForgotPin() {
  const [step, setStep] = useState(0)
  const reset = async () => {
    if (step < 1) return setStep(1)
    await db.transaction('rw', db.docs, db.docFiles, async () => { await db.docFiles.clear(); await db.docs.clear() })
    await setSettings({ pinHash: undefined, pinSalt: undefined })
  }
  return (
    <div className="mt-4 text-center">
      {step === 0 ? <button onClick={reset} className="py-2 text-sm font-semibold text-muted">Forgot PIN?</button> : (
        <div className="rounded-xl border border-crimson/30 bg-crimson-soft p-4 text-sm text-crimson">
          <p>Resetting the PIN erases every stored document and file on this phone. Your other data stays.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setStep(0)} className="btn-secondary">Cancel</button>
            <button onClick={reset} className="btn bg-crimson text-white">Erase and reset</button>
          </div>
        </div>
      )}
    </div>
  )
}
