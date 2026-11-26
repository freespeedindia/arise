/** Arise mark: a five-petal lotus (goals, health, money, mind, records) opening at dawn above still water. */
const PETAL = 'M0 0 C 70 -90, 78 -250, 0 -360 C -78 -250, -70 -90, 0 0 Z'
export default function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="140 160 744 760" className={className} aria-hidden>
      <circle cx="512" cy="540" r="330" fill="none" stroke="#C9A24A" strokeWidth="12" strokeDasharray="2 28" strokeLinecap="round" />
      <circle cx="512" cy="540" r="272" fill="#F1E1BF" />
      <g transform="translate(512 770) scale(1.12)">
        <path d={PETAL} fill="#C9A24A" transform="rotate(-62) scale(0.78)" />
        <path d={PETAL} fill="#C9A24A" transform="rotate(62) scale(0.78)" />
        <path d={PETAL} fill="#B4561A" transform="rotate(-31) scale(0.9)" />
        <path d={PETAL} fill="#B4561A" transform="rotate(31) scale(0.9)" />
        <path d={PETAL} fill="#CF6D1E" />
        <path d="M0 -40 L0 -300" stroke="#F7F2E9" strokeOpacity="0.6" strokeWidth="8" strokeLinecap="round" />
      </g>
      <path d="M280 830 H744" stroke="#8E2B1F" strokeWidth="18" strokeLinecap="round" />
      <path d="M360 878 H664" stroke="#8E2B1F" strokeOpacity="0.5" strokeWidth="13" strokeLinecap="round" />
    </svg>
  )
}
