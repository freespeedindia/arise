import type { ReactNode } from 'react'
export default function Section({ title, action, onAction, children, className = '' }: {
  title: string; action?: string; onAction?: () => void; children: ReactNode; className?: string
}) {
  return (
    <section className={`mt-7 ${className}`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow">{title}</h2>
        {action && <button onClick={onAction} className="-my-2 py-2.5 pl-4 text-sm font-semibold text-saffron">{action}</button>}
      </div>
      {children}
    </section>
  )
}
