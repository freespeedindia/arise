import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Share2 } from 'lucide-react'
import Sheet from '../components/Sheet'
import { addDays, monthKey, prevMonthKey } from '../lib/dates'
import { toast } from '../lib/celebrate'
import type { ExportFormat, ExportRange } from '../lib/export'

// Any screen can open the export sheet, optionally with a date range already chosen.
type Opener = (r?: ExportRange) => void
let opener: Opener | null = null
export const openExport = (r?: ExportRange) => opener?.(r)

const lastDay = (mk: string) => `${mk}-${String(new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate()).padStart(2, '0')}`

export default function ExportSheet({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<ExportRange | null>(null)
  const [period, setPeriod] = useState('30')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    opener = (r) => { setPreset(r ?? null); setFile(null); setOpen(true) }
    return () => { opener = null }
  }, [])

  const mk = monthKey(today)
  const periods: [string, string, ExportRange][] = [
    ['30', 'Last 30 days', { from: addDays(today, -29), to: today }],
    ['month', 'This month', { from: `${mk}-01`, to: today }],
    ['last', 'Last month', { from: `${prevMonthKey(mk)}-01`, to: lastDay(prevMonthKey(mk)) }],
    ['year', 'This year', { from: `${today.slice(0, 4)}-01-01`, to: today }],
    ['all', 'Everything', { from: '2000-01-01', to: today }],
  ]
  const range = preset ?? periods.find((p) => p[0] === period)![2]

  const create = async () => {
    setBusy(true); setFile(null)
    try {
      const { buildFile } = await import('../lib/export')
      setFile(await buildFile(format, range))
    } catch (e) { console.error(e); toast('Could not create the file') }
    setBusy(false)
  }
  const share = async () => {
    if (!file) return
    const { shareFile } = await import('../lib/export')
    const r = await shareFile(file)
    if (r === 'downloaded') toast('Saved to your Downloads')
  }
  const save = async () => { if (file) (await import('../lib/export')).downloadFile(file) }
  const canShareFiles = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && !!navigator.share)

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Export your plan">
      <div className="space-y-5">
        <p className="text-sm text-muted">Creates one file with your goals, tasks and habits, health plan, money, investments, routines and reviews. Send it by email, WhatsApp or save it to Drive.</p>
        <div>
          <span className="label">Format</span>
          <div className="grid grid-cols-2 gap-2">
            {([['pdf', 'PDF report', FileText, 'To read and share'], ['xlsx', 'Excel workbook', FileSpreadsheet, 'Every entry, one sheet each']] as const).map(([k, l, I, sub]) => (
              <button key={k} onClick={() => { setFormat(k); setFile(null) }} className={`rounded-xl border p-3 text-left ${format === k ? 'border-saffron bg-saffron-soft' : 'border-line'}`}>
                <I size={20} strokeWidth={1.6} className={format === k ? 'text-saffron-deep' : 'text-muted'} />
                <p className="mt-1.5 text-sm font-semibold">{l}</p>
                <p className="text-2xs text-muted">{sub}</p>
              </button>
            ))}
          </div>
        </div>
        {preset ? (
          <p className="rounded-lg bg-sunken px-3 py-2 text-sm">{preset.title ?? 'Report'}: {preset.from} to {preset.to} <button onClick={() => setPreset(null)} className="ml-1 font-semibold text-saffron">Change</button></p>
        ) : (
          <div>
            <span className="label">Period for totals</span>
            <div className="flex flex-wrap gap-2">
              {periods.map(([k, l]) => <button key={k} onClick={() => { setPeriod(k); setFile(null) }} className={`chip ${period === k ? 'chip-on' : ''}`}>{l}</button>)}
            </div>
          </div>
        )}
        {!file ? (
          <button onClick={create} disabled={busy} className="btn-primary w-full">{busy ? 'Preparing…' : `Create ${format === 'pdf' ? 'PDF' : 'Excel file'}`}</button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm font-medium text-forest">Ready: {file.name}</p>
            <div className={`grid gap-2 ${canShareFiles ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canShareFiles && <button onClick={share} className="btn-primary"><Share2 size={17} />Share</button>}
              <button onClick={save} className={canShareFiles ? 'btn-secondary' : 'btn-primary'}><Download size={17} />Save to phone</button>
            </div>
          </div>
        )}
        <p className="text-xs text-faint">The file is made on your phone. Nothing is uploaded.</p>
      </div>
    </Sheet>
  )
}
