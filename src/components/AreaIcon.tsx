import { Briefcase, Coins, HeartPulse, Sparkles, type LucideProps } from 'lucide-react'
import type { Area } from '../lib/db'

const MAP = { Health: HeartPulse, Wealth: Coins, Mind: Sparkles, Work: Briefcase }
export default function AreaIcon({ area, ...p }: { area: Area } & LucideProps) {
  const I = MAP[area]
  return <I strokeWidth={1.75} {...p} />
}
