// Tests the iPhone-app (Capacitor) code paths in a browser by pretending to be the native shell.
// Usage: node tests/native-ios.cjs <outDir>   (needs `npx vite preview --port 4174` on a BASE_PATH=/ build)
const { chromium, devices } = require('playwright')
const OUT = process.argv[2] || '.'
const URL = 'http://localhost:4174/'
const results = []
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`) }

;(async () => {
  const browser = await chromium.launch()
  const p = { ...devices['iPhone 15'] }; delete p.defaultBrowserType
  const ctx = await browser.newContext({ ...p, timezoneId: 'Asia/Kolkata', locale: 'en-IN' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()))
  await page.addInitScript(() => {
    const st = JSON.parse(sessionStorage.getItem('mock') || '{"calls":[],"pending":[],"perm":"prompt"}')
    const save = () => sessionStorage.setItem('mock', JSON.stringify(st))
    window.__mock = st
    window.webkit = { messageHandlers: { bridge: { postMessage() {} } } }
    const m = (names) => names.map((name) => ({ name, rtype: 'promise' }))
    window.Capacitor = {
      PluginHeaders: [
        { name: 'LocalNotifications', methods: m(['checkPermissions', 'requestPermissions', 'schedule', 'getPending', 'cancel']) },
        { name: 'Filesystem', methods: m(['writeFile']) },
        { name: 'Share', methods: m(['share']) },
      ],
      async nativePromise(plugin, method, o) {
        st.calls.push({ plugin, method, o: JSON.parse(JSON.stringify(o || {}, (k, v) => (k === 'data' && typeof v === 'string' ? `[${v.length} chars]` : v))) }); save()
        if (method === 'checkPermissions') return { display: st.perm }
        if (method === 'requestPermissions') { st.perm = 'granted'; save(); return { display: 'granted' } }
        if (method === 'schedule') { o.notifications.forEach((n) => { st.pending = st.pending.filter((x) => x.id !== n.id); st.pending.push(n) }); save(); return { notifications: o.notifications.map((n) => ({ id: n.id })) } }
        if (method === 'getPending') return { notifications: st.pending }
        if (method === 'cancel') { const ids = o.notifications.map((n) => n.id); st.pending = st.pending.filter((x) => !ids.includes(x.id)); save(); return }
        if (method === 'writeFile') return { uri: 'file:///cache/' + o.path }
        if (method === 'share') return { activityType: 'com.apple.UIKit.activity.Mail' }
        return {}
      },
    }
  })
  await page.clock.setFixedTime(new Date('2026-11-25T07:31:00+05:30'))
  const tap = (s) => page.locator(s).first().click()
  const wait = (ms = 500) => page.waitForTimeout(ms)
  const text = async () => (await page.locator('body').innerText()).toLowerCase()
  const mock = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('mock')))
  const shot = (n) => page.screenshot({ path: `${OUT}/native-${n}.png` })

  await page.goto(URL); await wait(1200)
  check('App starts in iPhone-app mode', await page.evaluate(() => window.Capacitor.isNativePlatform?.() === true))
  await page.fill('#welcome-name', 'Guruprasad'); await tap('text=Begin'); await wait(900)
  check('Today screen loads', (await text()).includes('good morning, guruprasad'))
  check('No service worker in the iPhone app', await page.evaluate(async () => !(await navigator.serviceWorker?.getRegistration())))

  // Settings: no "Add to Home Screen" card inside the app
  await tap('[aria-label="Settings"]'); await wait()
  check('No home-screen install hint inside the app', !(await text()).includes('install on your home screen'))
  await tap('[aria-label="Close"]'); await wait(400)

  // Add a task with a time later today
  await tap('nav >> text=Tasks'); await wait()
  await tap('[aria-label="Add task"]'); await wait()
  await page.fill('#task-title', 'Pay credit card bill'); await page.fill('#task-date', '2026-11-25'); await page.fill('#task-time', '10:00')
  await tap('[role=dialog] button:text-is("Add task")'); await wait(600)

  // Turn on notifications
  await tap('nav >> text=Today'); await wait()
  await tap('[aria-label="Reminders"]'); await wait(600)
  await shot('01-reminders-off')
  await tap('button:text-is("Turn on notifications")'); await wait(2500)
  let st = await mock()
  check('Asks iOS for notification permission', st.calls.some((c) => c.method === 'requestPermissions'))
  check('Reminders screen says they work with Arise closed', (await text()).includes('even when arise is closed'))
  await shot('02-reminders-on')
  const bill = st.pending.filter((n) => n.title === 'Pay credit card bill')
  check('10:00 bill reminder booked with iOS for today', bill.some((n) => n.schedule.at.startsWith('2026-11-25T04:30')), JSON.stringify(bill.map((n) => n.schedule.at)))
  const days = new Set(st.pending.map((n) => n.schedule.at.slice(0, 10)))
  check('Reminders booked several days ahead', days.size >= 3, [...days].join(','))
  check('No more than 60 booked (iOS limit 64)', st.pending.length > 10 && st.pending.length <= 60, String(st.pending.length))
  check('Nothing booked in the past', st.pending.every((n) => new Date(n.schedule.at) > new Date('2026-11-25T07:31:00+05:30')))
  check('Every booking has a unique id', new Set(st.pending.map((n) => n.id)).size === st.pending.length)

  // Changing the plan rebooks (and does not duplicate)
  await page.fill('[aria-label="Reminder text"]', 'Call parents'); await page.fill('[aria-label="Reminder time"]', '19:30')
  await tap('[role=dialog] button:has-text("Add reminder")'); await wait(2500)
  st = await mock()
  check('New reminder booked with iOS', st.pending.some((n) => n.title === 'Call parents'))
  check('Rebooking keeps one copy of each', st.pending.filter((n) => n.title === 'Pay credit card bill' && n.schedule.at.startsWith('2026-11-25')).length === 1)
  await tap('[aria-label="Close"]'); await wait(400)

  // Marking the bill done removes its reminder
  await tap('nav >> text=Tasks'); await wait()
  await tap('[aria-label^="Mark \\"Pay credit card bill\\" done"]'); await wait(2500)
  st = await mock()
  check('Finished task reminder is taken off iOS', !st.pending.some((n) => n.title === 'Pay credit card bill' && n.schedule.at.startsWith('2026-11-25')))

  // Focus: iOS rings at the end
  await tap('nav >> text=Today'); await wait()
  await tap('button:has-text("min session")'); await wait(700)
  await tap('[role=dialog] button:has-text("Start 25 minute focus")'); await wait(1000)
  st = await mock()
  const alarm = st.pending.find((n) => n.id === 77)
  check('Focus end alarm booked with iOS', alarm && alarm.title === 'Focus session complete' && alarm.schedule.at.startsWith('2026-11-25T02:26'), alarm?.schedule.at)
  await tap('[role=dialog] button:has-text("Stop")').catch(() => {}); await wait(800)
  await tap('[aria-label="Close focus mode"]').catch(() => {}); await wait(500)

  // Export: share sheet with a real file
  await tap('[aria-label="Settings"]'); await wait()
  await tap('[role=dialog] button:has-text("Export plan")'); await wait(800)
  await tap('[role=dialog] button:text-is("Create PDF")'); await wait(2500)
  await shot('03-export')
  await tap('[role=dialog] button:text-is("Share")'); await wait(1500)
  st = await mock()
  const w = st.calls.filter((c) => c.method === 'writeFile').pop()
  const sh = st.calls.filter((c) => c.method === 'share').pop()
  check('PDF written to the phone before sharing', w && /Arise-plan-2026-11-25\.pdf$/.test(w.o.path) && w.o.directory === 'CACHE', JSON.stringify(w?.o))
  check('iPhone share sheet opens with the PDF', sh && sh.o.files?.[0]?.endsWith('Arise-plan-2026-11-25.pdf'))
  await tap('[role=dialog] button:has-text("Excel workbook")'); await wait(200)
  await tap('[role=dialog] button:text-is("Create Excel file")'); await wait(2500)
  await tap('[role=dialog] button:has-text("Save to phone")'); await wait(1500)
  st = await mock()
  check('"Save to phone" opens the share sheet with the Excel file (Save to Files)', st.calls.filter((c) => c.method === 'share').pop()?.o.files?.[0]?.endsWith('.xlsx'))
  await tap('[aria-label="Close"]'); await wait(500)

  // Backup
  await tap('[aria-label="Settings"]'); await wait()
  await tap('[role=dialog] button:has-text("Save backup")'); await wait(2000)
  st = await mock()
  check('Backup goes to the share sheet', st.calls.filter((c) => c.method === 'share').pop()?.o.files?.[0]?.includes('arise-backup-2026-11-25.json'))
  await tap('[aria-label="Close"]'); await wait(400)

  // Documents tab opens
  await tap('nav >> text=Docs'); await wait(800)
  check('Docs tab opens', /documents|stored/.test(await text()))
  await shot('04-docs')

  check('No errors on the page', errors.length === 0, errors.slice(0, 3).join(' | '))
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  await browser.close()
  process.exit(failed.length ? 1 : 0)
})()
