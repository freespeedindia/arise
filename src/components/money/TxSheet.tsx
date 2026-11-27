import { useEffect, useState } from 'react'
import Sheet from '../Sheet'
import { db, type NeedWant, type Transaction, type TxType } from '../../lib/db'
import { afterMoneyChange } from '../../lib/money'
import type { Settings } from '../../lib/settings'
import { celebrate } from '../../lib/celebrate'

export default function TxSheet({ open, onClose, s, today, type: initialType, tx }: {
  open: boolean; onClose: () => void; s: Settings; today: string; type: TxType; tx?: Transaction | null
}) {
  const [type, setType] = useState<TxType>(initialType)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)
  const [confirm, setConfirm] = useState(false)
  const [need, setNeed] = useState<NeedWant>('need')
  const cats = type === 'expense' ? s.expenseCategories : s.incomeCategories

  useEffect(() => {
    if (!open) return
    const t = tx?.type ?? initialType
    setType(t)
    setAmount(tx ? String(tx.amount) : '')
    setCategory(tx?.category ?? (t === 'expense' ? s.expenseCategories[0] : s.incomeCategories[0]) ?? 'Other')
    setNote(tx?.note ?? '')
    setDate(tx?.date ?? today)
    const c = tx?.category ?? s.expenseCategories[0] ?? ''
    setNeed(tx?.need ?? (s.wantCategories.includes(c) ? 'want' : 'need'))
    setConfirm(false)
  }, [open, tx, initialType, today, s.expenseCategories, s.incomeCategories, s.wantCategories])

  const pickType = (t: TxType) => {
    setType(t)
    const list = t === 'expense' ? s.expenseCategories : s.incomeCategories
    if (!list.includes(category)) setCategory(list[0] ?? 'Other')
  }
  const value = Number(amount.replace(/,/g, ''))
  const save = async () => {
    if (!value || value <= 0) return
    const data = { type, amount: value, category: category || 'Other', note: note.trim() || undefined, date, need: type === 'expense' ? need : undefined }
    if (tx?.id != null) await db.transactions.update(tx.id, data)
    else await db.transactions.add({ ...data, createdAt: new Date().toISOString() })
    await afterMoneyChange()
    celebrate(false, type === 'expense' ? 'Expense saved' : 'Income saved')
    onClose()
  }
  const remove = async () => {
    if (!confirm) return setConfirm(true)
    await db.transactions.delete(tx!.id!)
    await afterMoneyChange()
    onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={tx ? 'Edit entry' : type === 'expense' ? 'Money out' : 'Money in'}>
      <div className="space-y-5">
        <div className="seg grid-cols-2">
          {(['income', 'expense'] as const).map((t) => (
            <button key={t} onClick={() => pickType(t)} className={`seg-item ${type === t ? 'seg-item-on' : ''}`}>{t === 'expense' ? 'OUT' : 'IN'}</button>
          ))}
        </div>
        <div className="grid grid-cols-[1.3fr_1fr] gap-3">
          <div>
            <label className="label" htmlFor="tx-amount">Amount ({s.currency})</label>
            <input id="tx-amount" autoFocus className="input num text-xl" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </div>
          <div>
            <label className="label" htmlFor="tx-date">Date</label>
            <input id="tx-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => <button key={c} onClick={() => setCategory(c)} className={`chip ${category === c ? 'chip-on' : ''}`}>{c}</button>)}
          </div>
          <p className="mt-1.5 text-xs text-muted">Edit categories in Expenses, Setup.</p>
        </div>
        {type === 'expense' && (
          <div>
            <span className="label">Need or want</span>
            <div className="seg grid-cols-2">
              {(['need', 'want'] as const).map((k) => (
                <button key={k} onClick={() => setNeed(k)} className={`seg-item ${need === k ? 'seg-item-on' : ''}`}>{k === 'need' ? 'Need' : 'Want'}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="tx-note">{type === 'expense' ? 'Description' : 'Source'}</label>
          <input id="tx-note" className="input" placeholder={type === 'expense' ? 'e.g. Weekly groceries' : 'e.g. Salary from office'} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button onClick={save} disabled={!value || value <= 0} className="btn-primary w-full">{tx ? 'Save changes' : 'Save'}</button>
        {tx && <button onClick={remove} className={`btn w-full ${confirm ? 'bg-crimson text-white' : 'text-crimson'}`}>{confirm ? 'Tap again to delete' : 'Delete entry'}</button>}
      </div>
    </Sheet>
  )
}
