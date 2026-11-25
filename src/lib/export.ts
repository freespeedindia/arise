// Builds the full plan as a PDF or Excel file. Loaded only when needed (keeps the app fast).
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import writeXlsxFile from 'write-excel-file'
import { addDays, fromKey, todayKey } from './dates'
import { goalPace, goalPercent, paceLabel } from './goals'
import { daysOfStock, latestWeight, plannedWeight } from './health'
import { gainPct, money, totals } from './money'
import { loadAll, periodSummary, type AllData } from './report'
import { readSettings, type Settings } from './settings'
import { isDoneNow, isDueToday, repeatLabel, streak } from './tasks'
import { quoteOfTheDay } from '../data/quotes'
import { expiryText } from './documents'

export type ExportFormat = 'pdf' | 'xlsx'
export interface ExportRange { from: string; to: string; title?: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const d = (k?: string) => (k ? fromKey(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
/** PDF built-in fonts cannot draw ₹, − or →, so swap them for safe equivalents. */
const safe = (t: string) => t.replace(/₹/g, 'Rs ').replace(/[−–]/g, '-').replace(/→/g, 'to').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/—/g, ' - ')

export async function buildFile(format: ExportFormat, range?: ExportRange): Promise<File> {
  const [data, s] = await Promise.all([loadAll(), readSettings()])
  const today = todayKey()
  const r = range ?? { from: addDays(today, -29), to: today }
  const stamp = today
  if (format === 'pdf') {
    const blob = buildPdf(data, s, r)
    return new File([blob], `Arise-${(r.title ?? 'plan').replace(/\s+/g, '-').toLowerCase()}-${stamp}.pdf`, { type: 'application/pdf' })
  }
  const blob = await buildXlsx(data, s, r)
  return new File([blob], `Arise-plan-${stamp}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

/** Open the phone's share sheet (Mail, WhatsApp, Drive...) or fall back to a download. */
export async function shareFile(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Arise plan', text: 'My Arise life plan' })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // NotAllowedError etc: fall through to download
    }
  }
  downloadFile(file)
  return 'downloaded'
}
export function downloadFile(file: File) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
export async function sharePlan(format: ExportFormat, range?: ExportRange) {
  return shareFile(await buildFile(format, range))
}

// ---------- PDF ----------
function colStyles(widths: number[] = [], right: number[] = []) {
  const out: Record<number, { cellWidth?: number; halign?: 'right' }> = {}
  widths.forEach((w, i) => (out[i] = { ...out[i], cellWidth: w }))
  right.forEach((i) => (out[i] = { ...out[i], halign: 'right' }))
  return out
}
const INK: [number, number, number] = [38, 30, 23]
const MUTED: [number, number, number] = [113, 101, 88]
const SAFFRON: [number, number, number] = [207, 109, 30]
const GOLD: [number, number, number] = [166, 128, 52]
const LINE: [number, number, number] = [226, 216, 199]
const CREAM: [number, number, number] = [247, 242, 233]

function buildPdf(data: AllData, s: Settings, r: ExportRange): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 44
  let y = 0
  const cur = s.currency
  const f = (n: number, compact = false) => safe(money(n, cur, { compact }))
  const sum = periodSummary(data, r.from, r.to)
  const today = todayKey()

  // Cover band
  doc.setFillColor(...CREAM); doc.rect(0, 0, W, 128, 'F')
  doc.setFillColor(...SAFFRON); doc.rect(0, 0, 6, 128, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GOLD)
  doc.text(safe(`ARISE  ·  ${(r.title ?? 'Life plan').toUpperCase()}`), M, 46, { charSpace: 1.2 })
  doc.setFont('times', 'bold'); doc.setFontSize(28); doc.setTextColor(...INK)
  doc.text(safe(s.name ? `${s.name}'s plan` : 'My plan'), M, 80)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED)
  doc.text(safe(`Period ${d(r.from)} to ${d(r.to)}   ·   Prepared ${d(today)}`), M, 102)
  y = 156

  const heading = (t: string) => {
    if (y > 740) { doc.addPage(); y = 56 }
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK)
    doc.text(safe(t), M, y)
    doc.setDrawColor(...SAFFRON); doc.setLineWidth(1.2); doc.line(M, y + 6, M + 28, y + 6)
    y += 18
  }
  const table = (head: string[], body: (string | number)[][], opts: { widths?: number[]; right?: number[] } = {}) => {
    if (!body.length) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(9.5); doc.setTextColor(...MUTED)
      doc.text('Nothing recorded yet.', M, y + 8); y += 28; return
    }
    autoTable(doc, {
      startY: y, margin: { left: M, right: M },
      head: [head.map(safe)], body: body.map((row) => row.map((c) => safe(String(c)))),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: { top: 5, bottom: 5, left: 4, right: 4 }, lineColor: LINE, lineWidth: { bottom: 0.5 } as unknown as number },
      headStyles: { fontStyle: 'bold', fontSize: 7.5, textColor: MUTED, fillColor: CREAM },
      columnStyles: colStyles(opts.widths, opts.right),
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22
  }

  // 1. Snapshot
  const t = totals(data.holdings, data.liabilities)
  const lw = latestWeight(data.weights)
  const active = data.goals.filter((g) => !g.completedAt)
  const avg = active.length ? Math.round(active.reduce((a, g) => a + goalPercent(g), 0) / active.length) : 0
  heading('Snapshot')
  const snap: [string, string][] = [
    ['Net worth', f(t.net)], ['Assets / owed', `${f(t.assets, true)} / ${f(t.debt, true)}`],
    ['Active goals', `${active.length} · ${avg}% average progress`], ['Tasks completed', String(sum.tasksDone)],
    ['Weight', lw ? `${lw.kg.toFixed(1)} kg${s.targetWeight ? ` (target ${s.targetWeight} kg)` : ''}` : 'Not logged'],
    ['Workouts', `${sum.workouts} · ${sum.activeMin} min${sum.runKm ? ` · ${sum.runKm} km run` : ''}`],
    ['Income / spent', `${f(sum.income, true)} / ${f(sum.spent, true)}`], ['Saved', `${f(sum.saved, true)}${sum.income ? ` (${sum.rate}%)` : ''}`],
    ['Focus time', `${Math.floor(sum.focusMin / 60)}h ${sum.focusMin % 60}m`], ['Water per day', `${sum.waterAvgL.toFixed(1)} L of ${(s.waterTargetMl / 1000).toFixed(1)} L`],
  ]
  const half = Math.ceil(snap.length / 2)
  table(['Measure', 'Value', 'Measure', 'Value'], Array.from({ length: half }, (_, i) => [snap[i][0], snap[i][1], snap[i + half]?.[0] ?? '', snap[i + half]?.[1] ?? '']), { widths: [82, 170, 82] })

  // 2. Goals
  heading('Goals')
  const goalRows = ['Health', 'Wealth', 'Mind', 'Work'].flatMap((a) => data.goals.filter((g) => g.area === a && !g.completedAt).map((g) => [
    g.area, g.title + (g.term === 'long' ? ' (long term)' : ''),
    g.target != null ? (g.unit === '₹' ? `${f(g.current ?? 0, true)} of ${f(g.target, true)}` : `${g.current ?? 0} of ${g.target} ${g.unit ?? ''}`) : `${g.milestones.filter((m) => m.done).length}/${g.milestones.length} milestones`,
    `${goalPercent(g)}%`, paceLabel[goalPace(g)], d(g.deadline),
  ]))
  table(['Area', 'Goal', 'Progress', '%', 'Pace', 'Deadline'], goalRows, { widths: [50, 150, 110, 36, 70], right: [3] })
  const achieved = data.goals.filter((g) => g.completedAt)
  if (achieved.length) table(['Achieved goals', 'Area', 'Completed'], achieved.map((g) => [g.title, g.area, d(g.completedAt)]))

  // 3. Tasks and habits
  heading('Tasks and habits')
  const habits = data.tasks.filter((k) => k.repeat !== 'none')
  table(['Habit', 'Repeats', 'Time', 'Streak', 'Done this period'], habits.map((k) => [k.title, repeatLabel[k.repeat], k.time ?? '', String(streak(k, today)), String(k.completions.filter((c) => c >= r.from && c <= r.to).length)]), { right: [3, 4] })
  const openTasks = data.tasks.filter((k) => k.repeat === 'none' && !k.doneAt).sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'))
  table(['Open task', 'Priority', 'Due', 'Status'], openTasks.slice(0, 40).map((k) => [k.title, ['High', 'Medium', 'Low'][k.priority - 1], k.dueDate ? d(k.dueDate) : 'Someday', isDueToday(k, today) && !isDoneNow(k, today) ? (k.dueDate! < today ? 'Overdue' : 'Today') : '']), { widths: [230] })

  // 4. Health
  heading('Health')
  const plan = plannedWeight(s, today)
  table(['Plan', 'Value'], [
    ['Weight plan', s.startWeight && s.targetWeight && s.planEnd ? `${s.startWeight} kg to ${s.targetWeight} kg by ${d(s.planEnd)}${plan ? ` (plan today ${plan.toFixed(1)} kg)` : ''}` : 'Not set'],
    ['Daily targets', `${s.calorieTarget} kcal · ${(s.waterTargetMl / 1000).toFixed(1)} L water`],
    ['Average this period', `${sum.kcalAvg || '-'} kcal · ${sum.waterAvgL} L water`],
    ['Weight this period', sum.weightStart != null ? `${sum.weightStart.toFixed(1)} to ${sum.weightEnd!.toFixed(1)} kg` : 'No entries'],
    ['Supplements taken', sum.adherence != null ? `${sum.adherence}% of scheduled doses` : 'None scheduled'],
  ], { widths: [130] })
  const sup = data.supplements.filter((x) => x.active)
  if (sup.length) table(['Supplement', 'Dose', 'Times', 'Stock left'], sup.map((x) => [x.name, x.dose, x.times.join(', '), `${x.stock} (${daysOfStock(x)} days)`]))
  const recentW = data.weights.filter((w) => w.date >= r.from && w.date <= r.to).slice(-12)
  if (recentW.length) table(['Date', 'Weight (kg)'], recentW.map((w) => [d(w.date), w.kg.toFixed(1)]), { widths: [130], right: [1] })

  // 5. Money
  heading('Money')
  const cats = Object.entries(sum.byCat).sort((a, b) => b[1] - a[1])
  table(['Spending by category', 'Spent', 'Monthly limit'], cats.map(([c, v]) => [c, f(v), s.budgets[c] ? f(s.budgets[c]) : '']), { right: [1, 2] })
  table(['Asset', 'Type', 'Put in', 'Value', 'Gain'], [...data.holdings].sort((a, b) => b.current - a.current).map((h) => [h.name, h.kind, f(h.invested), f(h.current), h.invested ? `${gainPct(h).toFixed(1)}%` : '']), { right: [2, 3, 4] })
  if (data.liabilities.length) table(['Loan', 'Type', 'Owed', 'EMI'], data.liabilities.map((l) => [l.name, l.kind, f(l.outstanding), l.emi ? f(l.emi) : '']), { right: [2, 3] })

  // Documents (details only; files stay on the phone)
  if (data.docs.length) {
    heading('Documents')
    const sorted = [...data.docs].sort((a, b) => (a.expiresOn ?? '9').localeCompare(b.expiresOn ?? '9'))
    table(['Document', 'Type', 'Number', 'Belongs to', 'Expires', 'Status'], sorted.map((x) => [x.title, x.kind, x.number ? `....${x.number.replace(/\s/g, '').slice(-4)}` : '', x.holder ?? '', x.expiresOn ? d(x.expiresOn) : 'No expiry', expiryText(x, todayKey())]), { widths: [100, 80, 60, 80, 70] })
  }

  // 6. Daily rhythm
  heading('Daily rhythm and reminders')
  table(['Routine', 'Setting'], [
    ['Waking hours', `${s.wakeStart} to ${s.wakeEnd}`],
    ['Water reminders', s.waterEveryMin ? `Every ${s.waterEveryMin} minutes` : 'Off'],
    ['Run', s.runTime ? `${s.runTime} on ${s.runDays.map((x) => DAYS[x]).join(', ')}` : 'Off'],
    ['Evening review', s.eveningReviewTime || 'Off'],
    ['Weekly review', s.reviewTime ? `${DAYS[s.reviewDay]} ${s.reviewTime}` : 'Off'],
    ['Focus sessions', `${s.focusMinutes} minutes, ${s.breakMinutes} minute break`],
  ], { widths: [130] })

  // 7. Reviews
  const revs = data.reviews.filter((v) => v.date >= addDays(r.from, -6) && v.date <= r.to).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  if (revs.length) {
    heading('Reflections')
    table(['Date', 'Type', 'Went well', 'To improve'], revs.map((v) => [d(v.date), v.kind === 'daily' ? 'Evening' : v.kind === 'weekly' ? 'Week' : 'Month', v.wins, v.improve]), { widths: [70, 50, 190] })
  }

  // Closing quote + footers
  const q = quoteOfTheDay().quote
  if (y > 720) { doc.addPage(); y = 64 }
  doc.setDrawColor(...GOLD); doc.setLineWidth(1); doc.line(M, y, M, y + 36)
  doc.setFont('times', 'italic'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(doc.splitTextToSize(safe(q.text), W - M * 2 - 14), M + 12, y + 10)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED)
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8); doc.setTextColor(...MUTED)
    doc.text('Arise · Data from this device', M, 818)
    doc.text(`${i} / ${pages}`, W - M, 818, { align: 'right' })
  }
  return doc.output('blob')
}

// ---------- Excel ----------
type Cell = { value?: string | number | null; type?: StringConstructor | NumberConstructor; fontWeight?: 'bold'; format?: string } | null
const H = (...h: string[]): Cell[] => h.map((value) => ({ value, fontWeight: 'bold' as const }))
const S = (v?: string | null): Cell => ({ type: String, value: v ?? '' })
const N = (v?: number | null, format?: string): Cell => (v == null ? null : { type: Number, value: v, format })
const AMT = '#,##0'

async function buildXlsx(data: AllData, s: Settings, r: ExportRange): Promise<Blob> {
  const sum = periodSummary(data, r.from, r.to)
  const t = totals(data.holdings, data.liabilities)
  const today = todayKey()
  const sheets: { name: string; rows: Cell[][]; widths: number[] }[] = []
  const add = (name: string, rows: Cell[][], widths: number[]) => sheets.push({ name, rows, widths })

  add('Summary', [
    H('Arise plan', s.name || ''),
    [S('Period'), S(`${r.from} to ${r.to}`)],
    [S('Prepared'), S(today)],
    [],
    H('Measure', 'Value'),
    [S('Net worth'), N(t.net, AMT)], [S('Assets'), N(t.assets, AMT)], [S('Owed'), N(t.debt, AMT)],
    [S('Income in period'), N(sum.income, AMT)], [S('Spent in period'), N(sum.spent, AMT)], [S('Saved in period'), N(sum.saved, AMT)], [S('Savings rate %'), N(sum.rate)],
    [S('Tasks completed'), N(sum.tasksDone)], [S('Workouts'), N(sum.workouts)], [S('Active minutes'), N(sum.activeMin)], [S('Run km'), N(sum.runKm)],
    [S('Focus minutes'), N(sum.focusMin)], [S('Water per day (L)'), N(sum.waterAvgL)], [S('Calories per day'), N(sum.kcalAvg)],
    [S('Supplement adherence %'), N(sum.adherence)], [S('Latest weight (kg)'), N(latestWeight(data.weights)?.kg)], [S('Target weight (kg)'), N(s.targetWeight)],
  ], [28, 22])
  add('Goals', [H('Area', 'Goal', 'Term', 'Start', 'Current', 'Target', 'Unit', 'Progress %', 'Pace', 'Start date', 'Deadline', 'Completed', 'Milestones'),
    ...data.goals.map((g) => [S(g.area), S(g.title), S(g.term), N(g.start), N(g.current), N(g.target), S(g.unit), N(goalPercent(g)), S(paceLabel[goalPace(g)]), S(g.startDate), S(g.deadline), S(g.completedAt), S(g.milestones.map((m) => `${m.done ? '[x]' : '[ ]'} ${m.text}`).join('; '))])],
    [10, 34, 8, 10, 10, 10, 8, 11, 12, 12, 12, 12, 40])
  add('Tasks', [H('Task', 'Priority', 'Area', 'Repeats', 'Due / starts', 'Time', 'Done on', 'Times completed', 'Streak', 'Notes'),
    ...data.tasks.map((k) => [S(k.title), S(['High', 'Medium', 'Low'][k.priority - 1]), S(k.area), S(repeatLabel[k.repeat]), S(k.dueDate), S(k.time), S(k.doneAt), N(k.completions.length), N(streak(k, today)), S(k.notes)])],
    [34, 9, 9, 12, 12, 7, 12, 10, 8, 30])
  add('Money', [H('Date', 'Type', 'Category', 'Amount', 'Note'),
    ...[...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).map((x) => [S(x.date), S(x.type === 'income' ? 'Income' : 'Expense'), S(x.category), N(x.amount, AMT), S(x.note)])],
    [12, 10, 22, 14, 30])
  add('Budgets', [H('Category', 'Monthly limit', 'Spent in period'),
    ...s.expenseCategories.map((c) => [S(c), N(s.budgets[c] || null, AMT), N(sum.byCat[c] || 0, AMT)]),
    [S('Total limit'), N(s.monthlyBudget || null, AMT), N(sum.spent, AMT)]], [24, 14, 16])
  add('Investments', [H('Name', 'Type', 'Put in', 'Value today', 'Gain', 'Gain %', 'Matures', 'Updated', 'Notes'),
    ...data.holdings.map((h) => [S(h.name), S(h.kind), N(h.invested, AMT), N(h.current, AMT), N(h.current - h.invested, AMT), N(+gainPct(h).toFixed(2)), S(h.maturity), S(h.updatedAt.slice(0, 10)), S(h.notes)])],
    [26, 16, 13, 13, 12, 8, 12, 12, 24])
  add('Loans', [H('Name', 'Type', 'Owed', 'EMI'), ...data.liabilities.map((l) => [S(l.name), S(l.kind), N(l.outstanding, AMT), N(l.emi, AMT)])], [26, 16, 14, 12])
  add('Net worth', [H('Date', 'Assets', 'Owed', 'Net worth'), ...data.netWorth.map((p) => [S(p.date), N(p.assets, AMT), N(p.liabilities, AMT), N(p.net, AMT)])], [12, 14, 14, 14])
  add('Weight', [H('Date', 'Weight (kg)', 'Plan (kg)'), ...data.weights.map((w) => [S(w.date), N(w.kg), N(plannedWeight(s, w.date) != null ? +plannedWeight(s, w.date)!.toFixed(2) : null)])], [12, 12, 12])
  add('Activity', [H('Date', 'Type', 'Minutes', 'Km', 'Notes'), ...[...data.activities].sort((a, b) => b.date.localeCompare(a.date)).map((a) => [S(a.date), S(a.type), N(a.minutes), N(a.km), S(a.notes)])], [12, 10, 9, 8, 30])
  add('Food', [H('Date', 'Meal', 'Item', 'kcal'), ...[...data.food].sort((a, b) => b.date.localeCompare(a.date)).map((x) => [S(x.date), S(x.meal), S(x.name), N(x.kcal)])], [12, 11, 28, 8])
  const waterByDay: Record<string, number> = {}
  data.water.forEach((w) => (waterByDay[w.date] = (waterByDay[w.date] || 0) + w.ml))
  add('Water', [H('Date', 'ml'), ...Object.entries(waterByDay).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => [S(k), N(v)])], [12, 10])
  add('Supplements', [H('Name', 'Dose', 'Times', 'Per dose', 'Stock', 'Days left', 'Active'), ...data.supplements.map((x) => [S(x.name), S(x.dose), S(x.times.join(', ')), N(x.perDose), N(x.stock), N(daysOfStock(x)), S(x.active ? 'Yes' : 'No')])], [22, 14, 16, 9, 8, 9, 7])
  add('Reviews', [H('Date', 'Type', 'Energy (1-5)', 'Went well', 'To improve', 'Priorities'), ...[...data.reviews].sort((a, b) => b.date.localeCompare(a.date)).map((v) => [S(v.date), S(v.kind), N(v.energy), S(v.wins), S(v.improve), S(v.tomorrow.join('; '))])], [12, 9, 11, 40, 40, 40])
  add('Documents', [H('Document', 'Type', 'Number', 'Belongs to', 'Issued by', 'Issued on', 'Expires on', 'Status', 'Remind days before', 'Premium / fee', 'Notes'),
    ...data.docs.map((x) => [S(x.title), S(x.kind), S(x.number), S(x.holder), S(x.issuer), S(x.issuedOn), S(x.expiresOn), S(expiryText(x, today)), N(x.remindDays), N(x.amount, AMT), S(x.notes)])],
    [24, 16, 18, 16, 18, 12, 12, 20, 10, 12, 30])
  add('Focus', [H('Date', 'Minutes', 'Worked on'), ...[...data.focus].sort((a, b) => b.at.localeCompare(a.at)).map((x) => [S(x.date), N(x.minutes), S(x.label)])], [12, 9, 34])

  const blob = await (writeXlsxFile as unknown as (d: unknown, o: unknown) => Promise<Blob>)(sheets.map((x) => x.rows), {
    sheets: sheets.map((x) => x.name),
    columns: sheets.map((x) => x.widths.map((width) => ({ width }))),
  })
  return blob
}
