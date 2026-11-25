import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function Ring({ pct, size = 64, stroke = 6, color = 'rgb(var(--saffron))', children }: {
  pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct || 0))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'rgb(var(--sunken))' }} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} style={{ stroke: color }}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: 0.8, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}
