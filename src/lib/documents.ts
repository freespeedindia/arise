import { db, type DocRecord } from './db'
import { daysBetween, todayKey } from './dates'

export type DocStatus = 'expired' | 'soon' | 'valid' | 'none'
export function docStatus(d: Pick<DocRecord, 'expiresOn' | 'remindDays'>, today = todayKey()): { status: DocStatus; days?: number } {
  if (!d.expiresOn) return { status: 'none' }
  const days = daysBetween(today, d.expiresOn)
  if (days < 0) return { status: 'expired', days }
  if (days <= (d.remindDays ?? 30)) return { status: 'soon', days }
  return { status: 'valid', days }
}
export function expiryText(d: Pick<DocRecord, 'expiresOn' | 'remindDays'>, today = todayKey()): string {
  const { status, days } = docStatus(d, today)
  if (status === 'none') return 'No expiry'
  if (status === 'expired') return days === -1 ? 'Expired yesterday' : `Expired ${-days!} days ago`
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days! < 60) return `Expires in ${days} days`
  const months = Math.round(days! / 30.4)
  return months < 24 ? `Expires in ${months} months` : `Expires in ${(days! / 365.25).toFixed(1)} years`
}
export const statusTone: Record<DocStatus, string> = { expired: 'text-crimson', soon: 'text-saffron-deep', valid: 'text-forest', none: 'text-muted' }

/** Reminder days: the day the window opens, then 30, 14, 7, 3, 1 days before and on the day; weekly once expired. */
export function remindToday(d: Pick<DocRecord, 'expiresOn' | 'remindDays'>, today = todayKey()): boolean {
  if (!d.expiresOn) return false
  const days = daysBetween(today, d.expiresOn)
  if (days < 0) return days >= -90 && -days % 7 === 0
  return days === d.remindDays || [30, 14, 7, 3, 1, 0].includes(days)
}

export const MAX_FILE_MB = 25

/** Shrink large photos so the phone does not fill up; PDFs are kept as they are. */
export async function prepareFile(file: File): Promise<{ name: string; type: string; data: ArrayBuffer; size: number; thumb?: string }> {
  if (file.type.startsWith('image/') && !/svg/.test(file.type)) {
    try {
      const bmp = await createImageBitmap(file)
      const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas')
      c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.86))
      const t = document.createElement('canvas')
      const ts = 160 / Math.max(c.width, c.height)
      t.width = Math.round(c.width * ts); t.height = Math.round(c.height * ts)
      t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height)
      const useOriginal = file.size <= blob.size
      const out = useOriginal ? file : blob
      return { name: file.name.replace(/\.(heic|heif|png|webp)$/i, '.jpg') || 'photo.jpg', type: useOriginal ? file.type : 'image/jpeg', data: await out.arrayBuffer(), size: out.size, thumb: t.toDataURL('image/jpeg', 0.7) }
    } catch { /* fall through: keep original */ }
  }
  return { name: file.name || 'document.pdf', type: file.type || 'application/pdf', data: await file.arrayBuffer(), size: file.size }
}

export async function addFiles(docId: number, files: File[]) {
  for (const f of files) {
    const p = await prepareFile(f)
    await db.docFiles.add({ docId, ...p, addedAt: new Date().toISOString() })
  }
  await db.docs.update(docId, { updatedAt: new Date().toISOString() })
}
export async function deleteDoc(id: number) {
  await db.transaction('rw', db.docs, db.docFiles, async () => {
    await db.docFiles.where('docId').equals(id).delete()
    await db.docs.delete(id)
  })
}
export const fileSize = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`)

// ----- Optional PIN lock (a privacy screen; files stay on this phone) -----
async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
export async function hashPin(pin: string, salt?: string) {
  const s = salt ?? [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
  return { salt: s, hash: await sha(`${s}:${pin}`) }
}
export async function checkPin(pin: string, salt: string, hash: string) { return (await hashPin(pin, salt)).hash === hash }
