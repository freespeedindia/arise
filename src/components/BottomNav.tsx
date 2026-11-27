import { HeartPulse, LayoutGrid, ListChecks, Target, Wallet } from 'lucide-react'

export type Tab = 'today' | 'tasks' | 'goals' | 'health' | 'money' | 'docs'
const TABS = [
  { id: 'today', label: 'Today', Icon: LayoutGrid },
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'health', label: 'Health', Icon: HeartPulse },
  { id: 'money', label: 'Expenses', Icon: Wallet },
  { id: 'tasks', label: 'To-do', Icon: ListChecks },
] as const

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg/90 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg px-1">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab
          return (
            <button key={id} onClick={() => onChange(id)} aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 ${active ? 'text-saffron' : 'text-faint'}`}>
              {active && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-saffron" />}
              <Icon size={21} strokeWidth={active ? 2 : 1.6} />
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
