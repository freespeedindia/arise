import { useEffect, useState } from 'react'
import Sheet from '../Sheet'
import { db, type Holding, type Liability } from '../../lib/db'
import { afterMoneyChange, gainPct, money } from '../../lib/money'
import type { Settings } from '../../lib/settings'
import { celebrate } from '../../lib/celebrate'

const num = (v: string) => Number(v.replace(/,/g, '')) || 0

export function HoldingSheet({ open, onClose, s, holding }: { open: boolean; onClose: () => void; s: Settings; holding?: Holding | null }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('')
  const [invested, setInvested] = useState('')
  const [current, setCurrent] = useState('')
  const [maturity, setMaturity] = useState('')
  const [notes, setNotes] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(holding?.name ?? ''); setKind(holding?.kind ?? s.assetKinds[0] ?? 'Other')
    setInvested(holding ? String(holding.invested) : ''); setCurrent(holding ? String(holding.current) : '')
    setMaturity(holding?.maturity ?? ''); setNotes(holding?.notes ?? ''); setConfirm(false)
  }, [open, holding, s.assetKinds])
  const inv = num(invested), cur = current === '' ? inv : num(current)
  const save = async () => {
    if (!name.trim()) return
    const data = { name: name.trim(), kind, invested: inv, current: cur, maturity: maturity || undefined, notes: notes.trim() || undefined, updatedAt: new Date().toISOString() }
    if (holding?.id != null) await db.holdings.update(holding.id, data)
    else await db.holdings.add(data)
    await afterMoneyChange()
    celebrate(false, 'Investment saved')
    onClose()
  }
  const remove = async () => {
    if (!confirm) return setConfirm(true)
    await db.holdings.delete(holding!.id!); await afterMoneyChange(); onClose()
  }
  const g = cur - inv
  return (
    <Sheet open={open} onClose={onClose} title={holding ? 'Update investment' : 'Add investment or account'}>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="h-name">Name</label>
          <input id="h-name" autoFocus={!holding} className="input" placeholder="e.g. Nifty 50 index fund, SBI savings" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-2">
            {s.assetKinds.map((k) => <button key={k} onClick={() => setKind(k)} className={`chip ${kind === k ? 'chip-on' : ''}`}>{k}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="h-inv">Amount put in ({s.currency})</label>
            <input id="h-inv" className="input num" inputMode="decimal" placeholder="0" value={invested} onChange={(e) => setInvested(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="h-cur">Value today ({s.currency})</label>
            <input id="h-cur" autoFocus={!!holding} className="input num" inputMode="decimal" placeholder={invested || '0'} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
        </div>
        {inv > 0 && (
          <p className={`num rounded-lg bg-sunken px-3 py-2 text-sm ${g >= 0 ? 'text-forest' : 'text-crimson'}`}>
            {g >= 0 ? 'Gain' : 'Loss'} {money(g, s.currency, { sign: true })} ({gainPct({ invested: inv, current: cur }).toFixed(1)}%)
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="h-mat">Matures on (optional)</label>
            <input id="h-mat" type="date" className="input" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="h-notes">Notes</label>
            <input id="h-notes" className="input" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted">For a bank account, put the balance in both fields. Update "Value today" whenever you check prices; your net worth and Wealth goals update with it.</p>
        <button onClick={save} disabled={!name.trim()} className="btn-primary w-full">{holding ? 'Save' : 'Add'}</button>
        {holding && <button onClick={remove} className={`btn w-full ${confirm ? 'bg-crimson text-white' : 'text-crimson'}`}>{confirm ? 'Tap again to delete' : 'Delete'}</button>}
      </div>
    </Sheet>
  )
}

const LOAN_KINDS = ['Home loan', 'Car loan', 'Personal loan', 'Education loan', 'Credit card', 'Other']
export function LiabilitySheet({ open, onClose, s, item }: { open: boolean; onClose: () => void; s: Settings; item?: Liability | null }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState(LOAN_KINDS[0])
  const [outstanding, setOutstanding] = useState('')
  const [emi, setEmi] = useState('')
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (!open) return
    setName(item?.name ?? ''); setKind(item?.kind ?? LOAN_KINDS[0])
    setOutstanding(item ? String(item.outstanding) : ''); setEmi(item?.emi ? String(item.emi) : ''); setConfirm(false)
  }, [open, item])
  const save = async () => {
    if (!name.trim()) return
    const data = { name: name.trim(), kind, outstanding: num(outstanding), emi: num(emi) || undefined, updatedAt: new Date().toISOString() }
    if (item?.id != null) await db.liabilities.update(item.id, data)
    else await db.liabilities.add(data)
    await afterMoneyChange(); onClose()
  }
  const remove = async () => {
    if (!confirm) return setConfirm(true)
    await db.liabilities.delete(item!.id!); await afterMoneyChange(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title={item ? 'Update loan' : 'Add a loan or card balance'}>
      <div className="space-y-5">
        <div>
          <label className="label" htmlFor="l-name">Name</label>
          <input id="l-name" autoFocus={!item} className="input" placeholder="e.g. HDFC home loan" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-2">
            {LOAN_KINDS.map((k) => <button key={k} onClick={() => setKind(k)} className={`chip ${kind === k ? 'chip-on' : ''}`}>{k}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="l-out">Still owed ({s.currency})</label>
            <input id="l-out" autoFocus={!!item} className="input num" inputMode="decimal" placeholder="0" value={outstanding} onChange={(e) => setOutstanding(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="l-emi">Monthly EMI</label>
            <input id="l-emi" className="input num" inputMode="decimal" placeholder="Optional" value={emi} onChange={(e) => setEmi(e.target.value)} />
          </div>
        </div>
        <button onClick={save} disabled={!name.trim()} className="btn-primary w-full">{item ? 'Save' : 'Add'}</button>
        {item && <button onClick={remove} className={`btn w-full ${confirm ? 'bg-crimson text-white' : 'text-crimson'}`}>{confirm ? 'Tap again to delete' : 'Delete'}</button>}
      </div>
    </Sheet>
  )
}
