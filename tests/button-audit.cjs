// Taps every button on every screen and inside every sheet, and reports any that do nothing or cause an error.
const { chromium, devices } = require('playwright')
const fs = require('fs')
const [, , deviceName = 'iphone', OUT = '.', BACKUP] = process.argv
const URL = 'http://localhost:4173/arise/'
;(async () => {
  const browser = await chromium.launch()
  const p = deviceName === 'iphone' ? { ...devices['iPhone 15'] } : { ...devices['Pixel 7'] }; delete p.defaultBrowserType
  const ctx = await browser.newContext({ ...p, timezoneId: 'Asia/Kolkata', locale: 'en-IN', permissions: ['notifications'], acceptDownloads: true })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    if (/iPhone/.test(navigator.userAgent)) Object.defineProperty(navigator, 'standalone', { get: () => true })
    window.Notification = class { constructor() {} static get permission() { return 'granted' } static async requestPermission() { return 'granted' } }
    window.confirm = () => true
  })
  await page.clock.setFixedTime(new Date('2026-11-25T11:00:00+05:30'))
  let errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()))
  page.on('download', () => {})
  const w = (ms = 350) => page.waitForTimeout(ms)
  // seed with the data from the full test run
  await page.goto(URL); await w(1200)
  await page.fill('#welcome-name', 'Guruprasad'); await page.locator('text=Begin').tap(); await w(800)
  await page.locator('[aria-label="Settings"]').tap(); await w(400)
  await page.setInputFiles('[role=dialog] input[type=file]', BACKUP); await w(1500)
  await page.reload(); await w(1200)
  const snap = () => page.evaluate(() => document.body.innerHTML.length + ':' + [...document.body.innerHTML].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) + location.hash)
  const listButtons = (scope) => page.evaluate((scope) => {
    const root = scope === 'dialog' ? document.querySelector('[role=dialog]') : document.body
    if (!root) return []
    return [...root.querySelectorAll('button, label.btn-secondary')].filter((b) => {
      if (scope === 'page' && b.closest('[role=dialog]')) return false
      const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.disabled
    }).map((b, i) => ({ i, label: (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50) }))
  }, scope)
  const tapNth = (scope, i) => page.evaluate(([scope, i]) => {
    const root = scope === 'dialog' ? document.querySelector('[role=dialog]') : document.body
    const all = [...root.querySelectorAll('button, label.btn-secondary')].filter((b) => {
      if (scope === 'page' && b.closest('[role=dialog]')) return false
      const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.disabled
    })
    const b = all[i]; if (!b) return null
    b.scrollIntoView({ block: 'center' })
    const r = b.getBoundingClientRect()
    // what element is actually on top at the button's centre? (detects invisible overlays blocking taps)
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, covered: !(top && (top === b || b.contains(top))) , coverer: top ? (top.className?.toString?.() || top.tagName).slice(0, 60) : '' }
  }, [scope, i])
  const report = []
  const closeAll = async () => { for (let k = 0; k < 3; k++) { const c = page.locator('[aria-label="Close"], [aria-label="Close focus mode"]'); if (await c.count()) { await c.first().tap().catch(() => {}); await w(400) } } }
  const SKIP = /^(restore|tap again to delete)$/i
  for (const tab of ['today', 'tasks', 'goals', 'health', 'money']) {
    await page.goto(URL + '#' + tab); await page.reload(); await w(900)
    const buttons = await listButtons('page')
    console.log(`\n== ${tab}: ${buttons.length} buttons`)
    for (const b of buttons) {
      if (SKIP.test(b.label)) continue
      await page.goto(URL + '#' + tab); await page.reload(); await w(700)
      errors = []
      const before = await snap()
      const pos = await tapNth('page', b.i)
      if (!pos) { report.push({ tab, label: b.label, result: 'gone' }); continue }
      await page.touchscreen.tap(pos.x, pos.y); await w(600)
      const after = await snap()
      const dialog = await page.locator('[role=dialog]').count()
      const result = pos.covered ? `COVERED by ${pos.coverer}` : errors.length ? `ERROR ${errors[0]}` : before !== after ? (dialog ? 'opens sheet' : 'changes screen') : 'NO EFFECT'
      report.push({ tab, label: b.label, result })
      if (!/opens sheet|changes screen/.test(result)) console.log(`  ${result.padEnd(14)} ${b.label}`)
      // second level: every button inside the sheet that opened
      if (dialog && !/^(export plan|settings)/i.test(b.label)) {
        const inner = await listButtons('dialog')
        for (const ib of inner) {
          if (SKIP.test(ib.label) || /^(close|delete|delete task|delete goal|delete entry|remove|save|add|create|update|start)/i.test(ib.label)) continue
          errors = []
          const b2 = await snap(); const pos2 = await tapNth('dialog', ib.i)
          if (!pos2) continue
          await page.touchscreen.tap(pos2.x, pos2.y); await w(450)
          const a2 = await snap()
          const r2 = pos2.covered ? `COVERED by ${pos2.coverer}` : errors.length ? `ERROR ${errors[0]}` : b2 !== a2 ? 'works' : 'NO EFFECT'
          report.push({ tab, label: `${b.label} > ${ib.label}`, result: r2 })
          if (r2 !== 'works') console.log(`  ${r2.padEnd(14)} ${b.label} > ${ib.label}`)
          if (!(await page.locator('[role=dialog]').count())) break // sheet closed itself
        }
      }
      await closeAll()
    }
  }
  fs.writeFileSync(`${OUT}/${deviceName}-buttons.json`, JSON.stringify(report, null, 1))
  const bad = report.filter((r) => !/opens sheet|changes screen|works/.test(r.result))
  console.log(`\nTapped ${report.length} buttons on ${deviceName}; ${bad.length} need a look`)
  await browser.close()
})().catch((e) => { console.error('CRASH', e.message); process.exit(1) })
