import { BadgeCheck, Car, FileText, GraduationCap, HeartPulse, Home, IdCard, Landmark, Plane, ShieldCheck } from 'lucide-react'

/** A line icon that fits the kind of document (works for user-made kinds too). */
export function DocIcon({ kind, size = 20, className = '' }: { kind: string; size?: number; className?: string }) {
  const k = kind.toLowerCase()
  const I = /health|medical|mediclaim/.test(k) ? HeartPulse
    : /car|bike|vehicle|rc\b|motor|licen/.test(k) ? Car
    : /insur|policy/.test(k) ? ShieldCheck
    : /passport|visa|travel/.test(k) ? Plane
    : /aadhaar|aadhar|pan|voter|id/.test(k) ? IdCard
    : /certif|degree|mark|school|college/.test(k) ? GraduationCap
    : /property|home|house|rent|deed/.test(k) ? Home
    : /bank|tax|itr|account/.test(k) ? Landmark
    : /warranty|bill/.test(k) ? BadgeCheck
    : FileText
  return <I size={size} strokeWidth={1.6} className={className} />
}
export const mask = (n?: string) => (n ? (n.replace(/\s/g, '').length > 4 ? `•••• ${n.replace(/\s/g, '').slice(-4)}` : n) : '')
