export default function ComingSoon({ kind }: { kind: 'health' | 'money' }) {
  const c = kind === 'health'
    ? { title: 'Health', emoji: '💚', grad: 'from-emerald-400 to-green-600', phase: 'Phase 2',
        items: ['⚖️ Target weight with a weekly plan', '📈 Daily weight trend chart', '🔥 Calorie target and log', '💧 Water target with quick-add', '🏃 Run and exercise log', '💊 Supplements with reminders and stock alerts'] }
    : { title: 'Money', emoji: '💰', grad: 'from-yellow-300 to-amber-500', phase: 'Phase 3',
        items: ['🧾 Expenses with categories', '📊 Monthly budget and charts', '💵 Income entries', '📈 Stocks, mutual funds, FDs and gold', '🎯 Savings goals by a date'] }
  return (
    <div className="px-5 safe-top">
      <h1 className="mt-4 font-display text-3xl font-extrabold">{c.title}</h1>
      <div className={`mt-5 rounded-4xl bg-gradient-to-br ${c.grad} p-6 text-white shadow-xl`}>
        <div className="text-5xl">{c.emoji}</div>
        <p className="mt-3 text-sm font-extrabold uppercase tracking-wide text-white/80">Coming in {c.phase}</p>
        <p className="mt-1 font-display text-2xl font-bold">Being built next</p>
      </div>
      <div className="card mt-5 divide-y divide-gray-100 p-2 dark:divide-ink-700">
        {c.items.map((i) => <p key={i} className="px-3 py-3.5 font-semibold">{i}</p>)}
      </div>
    </div>
  )
}
