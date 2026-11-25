import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Camera, Copy, FileText, FileUp, ListPlus, Pencil, Share2, Trash2 } from 'lucide-react'
import Sheet from '../Sheet'
import { db, type DocFile, type DocRecord } from '../../lib/db'
import { addFiles, deleteDoc, docStatus, expiryText, fileSize, MAX_FILE_MB, statusTone } from '../../lib/documents'
import { addDays, fromKey } from '../../lib/dates'
import { money } from '../../lib/money'
import { shareFile } from '../../lib/export'
import type { Settings } from '../../lib/settings'
import { celebrate, toast } from '../../lib/celebrate'
import { DocIcon } from './kinds'

const fmt = (k?: string) => (k ? fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export default function DocDetail({ doc, onClose, onEdit, onView, s, today }: {
  doc: DocRecord | null; onClose: () => void; onEdit: (d: DocRecord) => void; onView: (f: DocFile) => void; s: Settings; today: string
}) {
  const files = useLiveQuery(() => (doc?.id != null ? db.docFiles.where('docId').equals(doc.id).toArray() : Promise.resolve([] as DocFile[])), [doc?.id]) ?? []
  const [confirm, setConfirm] = useState(false)
  const [confirmFile, setConfirmFile] = useState<number | null>(null)
  const pick = useRef<HTMLInputElement>(null)
  const cam = useRef<HTMLInputElement>(null)
  if (!doc) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>
  const st = docStatus(doc, today)

  const add = async (list: FileList | null) => {
    const arr = [...(list ?? [])].filter((f) => f.size <= MAX_FILE_MB * 1e6)
    if (!arr.length) return
    try { await addFiles(doc.id!, arr); celebrate(false, arr.length > 1 ? `${arr.length} files added` : 'File added') } catch { toast('Could not save the file') }
  }
  const removeFile = async (id: number) => {
    if (confirmFile !== id) return setConfirmFile(id)
    await db.docFiles.delete(id); setConfirmFile(null)
  }
  const shareAll = async () => {
    if (!files.length) return
    const list = files.map((f) => new File([f.data], f.name, { type: f.type }))
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
    if (list.length > 1 && nav.share && nav.canShare?.({ files: list })) { try { await nav.share({ files: list, title: doc.title }) } catch { /* cancelled */ } return }
    for (const f of list) await shareFile(f)
  }
  const renewTask = async () => {
    const due = doc.expiresOn ? (addDays(doc.expiresOn, -7) < today ? today : addDays(doc.expiresOn, -7)) : today
    await db.tasks.add({ title: `Renew ${doc.title}`, priority: 1, repeat: 'none', dueDate: due, area: /insur|vehicle|car|bike/i.test(doc.kind) ? 'Wealth' : 'Work', notes: doc.number ? `Number ${doc.number}` : undefined, checklist: [], completions: [], createdAt: new Date().toISOString() })
    celebrate(false, `Task added for ${fmt(due)}`)
  }
  const remove = async () => { if (!confirm) return setConfirm(true); await deleteDoc(doc.id!); onClose() }
  const copy = async () => { try { await navigator.clipboard.writeText(doc.number!); toast('Number copied') } catch { toast(doc.number!) } }

  const rows: [string, string | undefined][] = [
    ['Type', doc.kind], ['Belongs to', doc.holder], [/insur/i.test(doc.kind) ? 'Insurer' : 'Issued by', doc.issuer],
    ['Issued on', fmt(doc.issuedOn)], ['Expires on', fmt(doc.expiresOn)],
    [/insur/i.test(doc.kind) ? 'Premium' : 'Renewal fee', doc.amount ? money(doc.amount, s.currency) : undefined], ['Notes', doc.notes],
  ]
  return (
    <Sheet open={!!doc} onClose={() => { setConfirm(false); onClose() }} title={doc.title}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-soft text-gold"><DocIcon kind={doc.kind} size={22} /></span>
          <div>
            <p className={`text-sm font-semibold ${statusTone[st.status]}`}>{expiryText(doc, today)}</p>
            {doc.expiresOn && st.status !== 'none' && <p className="text-xs text-muted">Reminders start {doc.remindDays} days before</p>}
          </div>
        </div>
        {doc.number && (
          <div className="flex items-center justify-between rounded-xl bg-sunken px-4 py-3">
            <div><p className="eyebrow">{/insur/i.test(doc.kind) ? 'Policy number' : 'Number'}</p><p className="num mt-0.5 font-semibold tracking-wide">{doc.number}</p></div>
            <button onClick={copy} aria-label="Copy number" className="flex h-10 w-10 items-center justify-center rounded-full text-muted"><Copy size={17} /></button>
          </div>
        )}
        <div className="divide-y divide-line rounded-xl border border-line">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-2 px-4 py-2.5 text-sm"><span className="text-muted">{k}</span><span className="break-words">{v}</span></div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="label mb-0">Files ({files.length})</span>
            {files.length > 0 && <button onClick={shareAll} className="-my-2 py-2 pl-4 text-sm font-semibold text-saffron">Share all</button>}
          </div>
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((f) => (
                <div key={f.id} className="relative">
                  <button onClick={() => onView(f)} aria-label={`Open ${f.name}`} className="flex aspect-[3/4] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-line bg-sunken">
                    {f.thumb ? <img src={f.thumb} alt="" className="h-full w-full object-cover" /> : <><FileText size={26} strokeWidth={1.4} className="text-crimson" /><span className="mt-1 text-2xs font-semibold text-muted">PDF</span></>}
                  </button>
                  <p className="mt-1 truncate text-2xs text-muted">{f.name} · {fileSize(f.size)}</p>
                  <button onClick={() => removeFile(f.id!)} aria-label={`Delete ${f.name}`}
                    className={`absolute right-1 top-1 flex h-8 items-center justify-center rounded-full px-2 text-2xs font-semibold ${confirmFile === f.id ? 'bg-crimson text-white' : 'bg-surface/90 text-muted'}`}>
                    {confirmFile === f.id ? 'Delete?' : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => pick.current?.click()} className="btn-secondary py-2.5 text-sm"><FileUp size={16} />Add PDF or photo</button>
            <button onClick={() => cam.current?.click()} className="btn-secondary py-2.5 text-sm"><Camera size={16} />Take photo</button>
          </div>
          <input ref={pick} type="file" accept="application/pdf,image/*" multiple className="hidden" aria-label="Choose files" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
          <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take a photo" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onEdit(doc)} className="btn-secondary"><Pencil size={16} />Edit details</button>
          <button onClick={renewTask} className="btn-secondary"><ListPlus size={16} />Renewal task</button>
        </div>
        {files.length === 1 && <button onClick={() => shareFile(new File([files[0].data], files[0].name, { type: files[0].type }))} className="btn-ghost w-full"><Share2 size={16} />Share file</button>}
        <button onClick={remove} className={`btn w-full ${confirm ? 'bg-crimson text-white' : 'text-crimson'}`}>{confirm ? 'Tap again to delete' : 'Delete document'}</button>
      </div>
    </Sheet>
  )
}
