import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import type { DocFile } from '../../lib/db'
import { downloadFile, shareFile } from '../../lib/export'
import { toast } from '../../lib/celebrate'

/** Full-screen viewer for a stored photo or PDF. PDFs are drawn page by page on the phone. */
export default function DocViewer({ file, onClose }: { file: DocFile | null; onClose: () => void }) {
  const [pages, setPages] = useState(0)
  const [err, setErr] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const isPdf = !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name))

  useEffect(() => {
    if (!file) return
    setPages(0); setErr('')
  }, [file])
  // A fresh address for the file each time a different file opens; released after the closing animation
  const url = useMemo(() => (file ? URL.createObjectURL(new Blob([file.data], { type: file.type })) : ''), [file])
  useEffect(() => () => { if (url) setTimeout(() => URL.revokeObjectURL(url), 1500) }, [url])

  useEffect(() => {
    if (!file || !isPdf) return
    let cancelled = false
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
        const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
        pdfjs.GlobalWorkerOptions.workerSrc = worker
        const doc = await pdfjs.getDocument({ data: new Uint8Array(file.data.slice(0)) }).promise
        if (cancelled) return
        setPages(doc.numPages)
        const width = Math.min(window.innerWidth, 900) - 24
        for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
          const page = await doc.getPage(i)
          if (cancelled) return
          const v1 = page.getViewport({ scale: 1 })
          const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
          const vp = page.getViewport({ scale: (width / v1.width) * dpr })
          const c = document.createElement('canvas')
          c.width = vp.width; c.height = vp.height
          c.style.width = `${width}px`; c.className = 'mx-auto mb-3 rounded-md bg-white shadow-card'
          c.setAttribute('aria-label', `Page ${i}`)
          await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise
          if (cancelled) return
          box.current?.appendChild(c)
        }
      } catch (e) { console.warn(e); if (!cancelled) setErr('This PDF could not be shown here. Use Share or Save to open it in another app.') }
    })()
    return () => { cancelled = true; if (box.current) box.current.innerHTML = '' }
  }, [file, isPdf])

  const asFile = () => new File([file!.data], file!.name, { type: file!.type })
  const share = async () => { const r = await shareFile(asFile()); if (r === 'downloaded') toast('Saved to your Downloads') }

  return (
    <AnimatePresence>
      {file && (
        <motion.div role="dialog" aria-label={`View ${file.name}`} className="fixed inset-0 z-[60] flex flex-col bg-[#16120F] text-[#F7F2E9]"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 320 }}>
          <div className="flex items-center gap-2 px-3 pb-2 safe-top">
            <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X size={20} /></button>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}{pages ? <span className="text-[#F7F2E9]/50"> · {pages} page{pages > 1 ? 's' : ''}</span> : null}</p>
            <button onClick={share} aria-label="Share file" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Share2 size={18} /></button>
            <button onClick={() => downloadFile(asFile())} aria-label="Save file" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><Download size={18} /></button>
          </div>
          <div className="flex-1 overflow-auto px-3 pb-8" style={{ touchAction: 'pan-x pan-y pinch-zoom' }}>
            {!isPdf && url && <img src={url} alt={file.name} className="mx-auto max-w-full rounded-md" />}
            {isPdf && !pages && !err && <p className="mt-20 text-center text-sm text-[#F7F2E9]/60">Opening…</p>}
            {err && <p className="mx-auto mt-20 max-w-xs text-center text-sm text-[#F7F2E9]/70">{err}</p>}
            <div ref={box} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
