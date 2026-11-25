/** Arise mark: a sun rising over the horizon, drawn in line. */
export default function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path d="M10 32a14 14 0 0 1 28 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 9v5M11.3 14.3l3.5 3.5M36.7 14.3l-3.5 3.5M4 32h40M12 38h24" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
