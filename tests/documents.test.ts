import { describe, expect, it } from 'vitest'
import { docStatus, expiryText, remindToday } from '../src/lib/documents'
import { buildSchedule } from '../src/lib/reminders'
import { defaultSettings } from '../src/lib/settings'
import { addDays } from '../src/lib/dates'
import type { DocRecord } from '../src/lib/db'

const doc = (expiresOn?: string, remindDays = 30): DocRecord => ({ id: 1, title: 'Car insurance', kind: 'Car insurance', expiresOn, remindDays, createdAt: '', updatedAt: '' })
const T = '2026-11-25'

describe('documents', () => {
  it('status and wording', () => {
    expect(docStatus(doc(), T).status).toBe('none')
    expect(docStatus(doc('2027-06-01'), T).status).toBe('valid')
    expect(docStatus(doc('2026-12-20'), T)).toEqual({ status: 'soon', days: 25 })
    expect(docStatus(doc('2026-12-20', 15), T).status).toBe('valid')
    expect(docStatus(doc('2026-11-20'), T)).toEqual({ status: 'expired', days: -5 })
    expect(expiryText(doc('2026-11-25'), T)).toBe('Expires today')
    expect(expiryText(doc('2026-11-26'), T)).toBe('Expires tomorrow')
    expect(expiryText(doc('2026-12-20'), T)).toBe('Expires in 25 days')
    expect(expiryText(doc('2027-05-25'), T)).toBe('Expires in 6 months')
    expect(expiryText(doc('2036-11-25'), T)).toBe('Expires in 10.0 years')
    expect(expiryText(doc('2026-11-24'), T)).toBe('Expired yesterday')
  })
  it('reminds on set days only, then weekly after expiry for 90 days', () => {
    const d = doc('2027-01-31', 60) // passport-style: remind 60 days before
    const days = Array.from({ length: 200 }, (_, i) => addDays('2026-11-01', i)).filter((k) => remindToday(d, k))
    expect(days).toEqual(['2026-12-02', '2027-01-01', '2027-01-17', '2027-01-24', '2027-01-28', '2027-01-30', '2027-01-31',
      '2027-02-07', '2027-02-14', '2027-02-21', '2027-02-28', '2027-03-07', '2027-03-14', '2027-03-21', '2027-03-28', '2027-04-04', '2027-04-11', '2027-04-18', '2027-04-25'])
    expect(remindToday(doc(), T)).toBe(false)
  })
  it('expiry reminder joins the daily schedule at the chosen time', () => {
    const sched = buildSchedule({ date: '2026-12-01', settings: { ...defaultSettings, docReminderTime: '08:30' }, tasks: [], supplements: [], doses: [], reminders: [], goals: [], waterMl: 0, docs: [doc('2026-12-31')] })
    const r = sched.find((x) => x.kind === 'document')
    expect(r).toMatchObject({ time: '08:30', title: 'Car insurance: expires in 30 days' })
  })
})
