// End-to-end phone test of Arise, the daily operating system.
// Usage: node tests/e2e-phone.cjs <iphone|pixel> <outDir>   (needs `vite preview --base /arise/ --port 4173`)
const { chromium, devices } = require('playwright')
const fs = require('fs')
const [, , deviceName = 'iphone', OUT = '.'] = process.argv
const URL = 'http://localhost:4173/arise/'
const profile = deviceName === 'iphone' ? { ...devices['iPhone 15'] } : { ...devices['Pixel 7'] }
delete profile.defaultBrowserType

const results = []
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`) }
const T0 = '2026-11-27T08:30:00+05:30' // Friday morning, India time

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...profile, timezoneId: 'Asia/Kolkata', locale: 'en-IN', permissions: ['notifications'], acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()))
  await page.addInitScript(() => {
    window.__notes = []
    if (/iPhone/.test(navigator.userAgent)) Object.defineProperty(navigator, 'standalone', { get: () => true })
    const rec = (title, opts) => window.__notes.push({ title, body: opts && opts.body })
    if (window.ServiceWorkerRegistration) ServiceWorkerRegistration.prototype.showNotification = async function (t, o) { rec(t, o) }
    window.Notification = class { constructor(t, o) { rec(t, o) } static get permission() { return 'granted' } static async requestPermission() { return 'granted' } }
  })
  await page.clock.setFixedTime(new Date(T0))
  const shot = (n, full = false) => page.screenshot({ path: `${OUT}/${deviceName}-${n}.png`, fullPage: full })
  const tap = (sel) => page.locator(sel).first().click()
  const text = async () => (await page.locator('body').innerText()).toLowerCase()
  const wait = (ms = 400) => page.waitForTimeout(ms)
  const nav = async (t) => { await tap(`nav >> text=${t}`); await wait(700) }
  const close = async () => { await page.locator('[role=dialog] [aria-label="Close"]:visible').last().click(); await wait(450) }
  let body

  // 1. Welcome
  await page.goto(URL); await wait(1200)
  check('Welcome screen shows', (await text()).includes('what should we call you?'))
  await page.fill('#welcome-name', 'Guruprasad'); await tap('text=Begin'); await wait(900)
  body = await text()
  check('Dashboard greets by name', body.includes('good morning, guruprasad') && body.includes('my day'))
  check('Five sections in the bottom bar', ['Today', 'Goals', 'Health', 'Expenses', 'To-do'].every((x) => body.includes(x.toLowerCase())))
  check('Empty day is not judged', body.includes('not planned yet'))
  check('No emoji characters', !/\p{Extended_Pictographic}/u.test(body))
  await shot('01-dashboard-empty')

  // 2. Goals
  await nav('Goals')
  const addGoal = async ({ title, area, term = 'Short term', milestones = [] }) => {
    await tap('[aria-label="Add goal"]'); await wait()
    await page.fill('#goal-title', title)
    await tap(`[role=dialog] button:has-text("${area}")`)
    await tap(`[role=dialog] button:text-is("${term}")`)
    for (const m of milestones) { await page.fill('[aria-label="Add a milestone"]', m); await tap('[aria-label="Add milestone"]') }
    await tap('[role=dialog] button:text-is("Create goal")'); await wait(600)
  }
  await addGoal({ title: 'Lose 4 kg', area: 'Health' })
  await addGoal({ title: 'Stay within the monthly budget', area: 'Money' })
  await addGoal({ title: 'Grow the consulting practice', area: 'Work', term: 'Long term', milestones: ['Sign two retainer clients', 'Launch website'] })
  body = await text()
  check('Short-term goals listed with status Not started', body.includes('lose 4 kg') && body.includes('not started'))
  check('Goal areas use plain names (Money, not Wealth)', body.includes('money') && !body.includes('wealth'))
  await tap('button:text-is("Long term")'); await wait()
  check('Long-term goal listed', (await text()).includes('grow the consulting practice'))

  // 3. To-do with Red, Amber, Green
  await nav('To-do')
  const quick = async (title, rag) => { await tap(`button[aria-pressed]:has-text("${rag}")`); await page.fill('[aria-label="New task"]', title); await tap('[aria-label="Add task"]'); await wait(400) }
  await quick('Send client proposal', 'Red')
  await quick('Call the electrician', 'Amber')
  await quick('Sort the bookshelf', 'Green')
  body = await text()
  check('Three tasks in their RAG groups', /0 of 3 done/.test(body) && body.includes('critical, before noon') && body.includes('important, before 5 pm') && body.includes('flexible, can carry forward'))
  // Link the Red task to the work goal
  await tap('[aria-label="Edit \\"Send client proposal\\""]'); await wait()
  await page.selectOption('#task-goal', { label: 'Grow the consulting practice' })
  await tap('[role=dialog] button:text-is("Save changes")'); await wait(500)
  check('Task shows its goal', (await text()).includes('grow the consulting practice'))
  await tap('[aria-label="Mark \\"Send client proposal\\" done"]'); await wait(500)
  check('Ticking a task counts it', (await text()).includes('1 of 3 done'))
  // Move green to amber and back
  await tap('[aria-label^="Change priority of \\"Sort the bookshelf\\""]'); await wait(300)
  await tap('button.chip:has-text("Amber")'); await wait(400)
  check('Task moves between RAG groups', (await page.locator('[aria-label^="Change priority of \\"Sort the bookshelf\\" (now Amber)"]').count()) === 1)
  await tap('[aria-label^="Change priority of \\"Sort the bookshelf\\""]'); await wait(300)
  await tap('button.chip:has-text("Green")'); await wait(400)
  await shot('02-todo')
  await tap('button:has-text("Carry 1 to tomorrow")'); await wait(500)
  body = await text()
  check('Unfinished Green task carried to tomorrow', !body.includes('sort the bookshelf') && body.includes('1 of 2 done'))
  await tap('[aria-label="Next day"]'); await wait(400)
  check('Tomorrow shows the carried task', (await text()).includes('sort the bookshelf'))
  await tap('button:text-is("Today")'); await wait(300)
  await tap('button:has-text("Completed (1)")'); await wait(300)
  check('Completed view lists the finished task', (await text()).includes('send client proposal'))

  // 4. Health: Me and Devi
  await nav('Health')
  body = await text()
  check('Health opens with Devi and Me tabs', body.includes('devi') && body.includes('me') && body.includes('my meal plan'))
  check('No calorie counting in Health', !body.includes('kcal') && !body.includes('calorie'))
  const meals = { Breakfast: 'South Indian breakfast', Lunch: 'Dal, vegetables and roti', 'Evening snacks': 'Fruit and nuts', Dinner: 'Light homemade meal' }
  for (const [k, v] of Object.entries(meals)) { await page.fill(`input[aria-label="${k}"]`, v); await page.press(`input[aria-label="${k}"]`, 'Enter'); await wait(250) }
  await tap('button:has-text("Copy to Devi")'); await wait(400)
  for (const k of ['breakfast', 'lunch', 'dinner']) { await tap(`[aria-label="Mark ${k} as followed"]`); await wait(250) }
  await tap('#activity button.chip:text-is("Walk")'); await page.fill('[aria-label="Minutes"]', '35'); await tap('#activity button:has-text("Add 35 min")'); await wait(500)
  await tap('button[aria-pressed]:has-text("Up by 6:30")'); await tap('button[aria-pressed]:has-text("Morning walk or stretch")'); await wait(400)
  body = await text()
  // meals 3/4, exercise 1, routine 2/4 -> 75%
  check('Health score: meals 3/4, exercise, routine 2/4 = 75%', body.includes('stayed on track') && body.includes('75%'), body.match(/\d+%/)?.[0])
  await tap('button:has-text("Same tomorrow")'); await wait(400)
  check("Tomorrow's plan shown so groceries can be ready", (await text()).includes('south indian breakfast · dal, vegetables and roti'))
  await shot('03-health-me', true)
  await tap('.seg button:text-is("Devi")'); await wait(400)
  body = await text()
  check("Devi's plan copied, kept separate", (await page.inputValue('input[aria-label="Lunch"]')) === 'Dal, vegetables and roti' && body.includes("devi's meal plan") && body.includes('physical activity'))
  await page.fill('input[aria-label="Dinner"]', 'Khichdi'); await page.press('input[aria-label="Dinner"]', 'Enter'); await wait(300)
  await tap('.seg button:text-is("Me")'); await wait(300)
  check("Changing Devi's dinner leaves mine", (await page.inputValue('input[aria-label="Dinner"]')) === 'Light homemade meal')
  await tap('.seg button:text-is("Devi")'); await wait(300)
  await shot('04-health-devi')

  // 5. Expenses
  await nav('Expenses')
  body = await text()
  check('No net worth, investments or loans', !body.includes('net worth') && !body.includes('investment') && !body.includes('loan'))
  await page.fill('[aria-label="Monthly budget"]', '50000'); await tap('button:text-is("Save")'); await wait(500)
  const out = async (amt, what, cat, nw, date) => {
    await page.fill('[aria-label="Amount in rupees"]', String(amt)); await page.fill('[aria-label="Description"]', what)
    if (cat) await page.selectOption('[aria-label="Category"]', cat)
    if (nw) await tap(`button[aria-pressed]:text-is("${nw}")`)
    if (date) await page.fill('[aria-label="Date"]', date)
    await tap('button:has-text("Add money out")'); await wait(500)
  }
  await out(2400, 'Weekly groceries', 'Household & groceries')
  await out(1800, 'Dinner out', 'Food & dining out')
  await out(55000, 'Family trip', 'Travel', null, '2026-10-15')
  await tap('.seg button:has-text("IN")'); await wait(300)
  await page.fill('[aria-label="Amount in rupees"]', '120000'); await page.fill('[aria-label="Source"]', 'Consulting fees')
  await tap('button:has-text("Add money in")'); await wait(500)
  body = await text()
  check('Money in shows ₹1,20,000', body.includes('₹1,20,000'))
  check('Dining out defaulted to Want, groceries to Need', /needs\s+₹2,400/.test(body) && /wants\s+₹1,800/.test(body), body.match(/needs\s*\S+/)?.[0])
  check('Budget: ₹4,200 spent, ₹45,800 remaining, 8% used', body.includes('₹4,200') && body.includes('₹45,800') && body.includes('8% used'))
  check('October overspend shows ₹5,000 carry-forward', body.includes('carry-forward from october: ₹5,000') && body.includes('a plan of ₹45,000'))
  check('Category pie chart drawn', (await page.locator('.recharts-pie-sector').count()) >= 2)
  // Want list
  await page.fill('[aria-label="Wanted item"]', 'New dress'); await page.fill('[aria-label="Expected price"]', '3500'); await tap('[aria-label="Add to want list"]'); await wait(400)
  check('Wish added to want list', (await text()).includes('new dress'))
  await shot('05-expenses', true)
  await tap('button.chip:has-text("Bought")'); await wait(600)
  body = await text()
  check('Bought wish becomes a Want expense (wants ₹5,300)', /wants\s+₹5,300/.test(body))
  // Edit an expense: switch Need/Want
  await tap('.seg button:has-text("OUT")'); await wait(300)
  await tap('button:has-text("Weekly groceries")'); await wait(400)
  await tap('[role=dialog] .seg button:text-is("Want")'); await tap('[role=dialog] button:text-is("Save changes")'); await wait(600)
  check('Editing switches Need to Want (wants ₹7,700)', /wants\s+₹7,700/.test(await text()))
  await tap('button:has-text("Weekly groceries")'); await wait(400)
  await tap('[role=dialog] .seg button:text-is("Need")'); await tap('[role=dialog] button:text-is("Save changes")'); await wait(600)

  // 6. Dashboard
  await nav('Today')
  body = await text()
  check('Alignment: moving forward', body.includes('moving forward'), body.match(/my day · .*\n.*/)?.[0])
  check('Score card: health 75%, tasks 1/2, goals actions', body.includes('75%') && body.includes('1/2') && /\d\/3\s*actions taken/.test(body))
  check('One step forward today', /steps? forward today/.test(body))
  check('Sentence built from real data', body.includes('followed') || body.includes('completed the critical task'))
  check('Both meal plans on the dashboard', body.includes('light homemade meal') && body.includes('khichdi'))
  check('Month in and out on the dashboard', body.includes('₹1.20 l') && body.includes('₹7.70k') || body.includes('₹7,700'), body.match(/month out\s*\S+/)?.[0])
  check('Carry-forward reminder on the dashboard', body.includes('carry-forward: spend ₹5,000 less'))
  await shot('06-dashboard')
  await shot('06-dashboard-full', true)
  // Date selector: tomorrow shows the planned meals and carried task
  await tap('[aria-label="Next day"]'); await wait(500)
  body = await text()
  check('Dashboard can show tomorrow', body.includes('tomorrow') && body.includes('south indian breakfast'))
  await tap('[aria-label="Previous day"]'); await wait(300)

  // 7. Goals show today's actions
  await nav('Goals')
  await tap('button:text-is("Long term")'); await wait()
  body = await text()
  check('Work goal moved forward by the linked task', body.includes('moved forward today') && body.includes('linked task done'))
  check('Goal status worked out from activity: In progress', body.includes('in progress'))
  await tap('button:has-text("Grow the consulting practice")'); await wait(500)
  await page.fill('[aria-label="To-do for this goal"]', 'Draft website copy'); await tap('[aria-label="Add to-do"]'); await wait(400)
  check('A to-do can be added from the goal', (await text()).includes('draft website copy'))
  await tap('[role=dialog] button:has-text("Sign two retainer clients")'); await wait(500)
  check('Milestone ticked moves progress to 50%', (await text()).includes('50%'))
  await close()
  await tap('button:text-is("Short term")'); await wait()
  check('Health goal moved forward by meals and exercise', (await text()).includes('meals and exercise on plan'))
  await shot('07-goals')

  // 8. Daily review
  await nav('Today')
  await tap('button:has-text("Daily review")'); await wait(600)
  body = await text()
  check('Daily review asks the four questions', ['did i follow my planned health routine?', 'did i stay within my spending discipline?', 'did i complete my critical tasks?', 'did i take a meaningful step towards my goals?'].every((q) => body.includes(q)))
  check('Answers come from data (1 of 1 red tasks done)', body.includes('1 of 1 red tasks done') && body.includes('3 of 4 meals as planned'))
  await shot('08-daily-review')
  await page.fill('[aria-label="Priority 1"]', 'Book car service')
  await tap('[role=dialog] button:text-is("Save review")'); await wait(800)
  await tap('button:has-text("Week")'); await wait(600)
  body = await text()
  check('Weekly overview shows patterns', body.includes('moving forward') && body.includes('red tasks done') && body.includes('meals followed'))
  await tap('[role=dialog] .seg button:text-is("Month")'); await wait(600)
  body = await text()
  check('Monthly overview shows spend against budget', body.includes('of ₹50,000 budget') && body.includes('within budget'))
  await shot('09-month-review')
  await close()
  await nav('To-do'); await tap('[aria-label="Next day"]'); await wait(400)
  check("Review's critical task became tomorrow's Red task", (await text()).includes('book car service'))
  await tap('button:text-is("Today")'); await wait(300)

  // 9. Overspending
  await nav('Expenses')
  await out(45000, 'Flights to Goa', 'Travel')
  body = await text()
  fs.writeFileSync(`${OUT}/${deviceName}-overspend.txt`, body)
  check('Overspend shows amount, categories and next month cut', body.includes('over budget by ₹2,700') && body.includes('mostly from travel') && body.includes("reduce december's discretionary spending by ₹2,700"))
  await shot('10-overspend')
  await nav('Today')
  check('Dashboard flags the overspend', (await text()).includes("over this month's budget by ₹2,700"))

  // 10. Reminders: Red tasks nudge before noon
  await page.clock.setFixedTime(new Date('2026-11-27T11:35:00+05:30'))
  await nav('To-do')
  await quick('Pay school fees', 'Red'); await nav('Today')
  await tap('[aria-label="Reminders"]'); await wait(500)
  body = await text()
  check('Reminders list a Red nudge before noon', body.includes('red task due by noon') || body.includes('red tasks due by noon'))
  await shot('14-reminders')
  await page.goto(URL + '#today'); await page.reload(); await wait(900)

  // 11. Documents and Focus live in Settings
  await tap('[aria-label="Settings"]'); await wait(400)
  check('Settings has documents and focus', (await text()).includes('documents') && (await text()).includes('focus mode'))
  await tap('[role=dialog] button:has-text("Documents")'); await wait(700)
  check('Documents still open', (await text()).includes('keep every important document in one place'))
  await nav('Today')
  await tap('[aria-label="Settings"]'); await wait(400)
  await tap('[role=dialog] button:has-text("Focus mode")'); await wait(600)
  check('Focus mode still opens', (await text()).includes('start 25 minute focus'))
  await tap('[aria-label="Close focus mode"]'); await wait(500)

  // 12. Export and backup
  await page.goto(URL + '#today'); await page.reload(); await wait(900)
  await tap('[aria-label="Settings"]'); await wait(400)
  await tap('[role=dialog] button:has-text("Export plan")'); await wait(700)
  for (const [fmt, label, ext] of [['PDF', 'Create PDF', 'pdf'], ['Excel', 'Create Excel file', 'xlsx']]) {
    if (fmt === 'Excel') { await tap('[role=dialog] button:has-text("Excel workbook")'); await wait(200) }
    await tap(`[role=dialog] button:text-is("${label}")`); await wait(2500)
    const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null)
    await tap('[role=dialog] button:has-text("Save to phone")')
    const f = await dl
    check(`${fmt} export downloads`, f && new RegExp(`^Arise-plan-2026-11-27\\.${ext}$`).test(f.suggestedFilename()), f?.suggestedFilename())
    if (f) await f.saveAs(`${OUT}/${deviceName}-plan.${ext}`)
  }
  await page.goto(URL + '#today'); await page.reload(); await wait(900)
  await tap('[aria-label="Settings"]'); await wait(400)
  const bd = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)
  await tap('[role=dialog] button:has-text("Save backup")')
  const d = await bd
  if (d) {
    await d.saveAs(`${OUT}/${deviceName}-backup.json`)
    const b = JSON.parse(fs.readFileSync(`${OUT}/${deviceName}-backup.json`, 'utf8'))
    check('Backup includes meal plans and want list', b.healthDays.length >= 3 && b.wishes.length === 1 && b.version === 5)
  } else check('Backup downloads', false)
  await tap('[role=dialog] button:has-text("Dark")'); await wait(300)
  await close()
  await shot('11-dashboard-dark')
  await nav('Health'); await shot('12-health-dark')
  await nav('Expenses'); await shot('13-expenses-dark')
  await page.goto(URL + '#today'); await wait(500)
  await tap('[aria-label="Settings"]'); await wait(300); await tap('[role=dialog] button:has-text("Light")'); await close()

  // 13. Next day
  await page.clock.setFixedTime(new Date('2026-11-28T08:00:00+05:30'))
  await page.goto(URL + '#tasks'); await page.reload(); await wait(1000)
  body = await text()
  check('Next day: carried Green and review task are due', body.includes('sort the bookshelf') && body.includes('book car service'))
  check('Next day: unfinished Amber flagged overdue', body.includes('call the electrician') && body.includes('overdue'))
  await page.goto(URL + '#health'); await wait(800)
  check("Next day: yesterday's copied plan is today's", (await page.inputValue('input[aria-label="Breakfast"]')) === 'South Indian breakfast')
  await page.goto(URL + '#today'); await wait(800)
  await tap('[aria-label="Previous day"]'); await wait(500)
  check('Looking back at yesterday keeps its record', (await text()).includes('27 november') && (await text()).includes('75%'))

  // 14. A year later
  await page.clock.setFixedTime(new Date('2027-11-27T08:00:00+05:30'))
  await page.goto(URL + '#goals'); await page.reload(); await wait(900)
  check('A year later: short goal past its deadline is At risk', (await text()).includes('at risk'))
  await page.goto(URL + '#today'); await wait(800)
  check('A year later: dashboard renders', (await text()).includes('my day'))

  // 15. Offline, install, layout
  await page.goto(URL); await wait(1500)
  check('Service worker installed (offline support)', await page.evaluate(async () => !!(await navigator.serviceWorker?.ready)))
  await ctx.setOffline(true); await page.reload(); await wait(1500)
  check('Opens with no internet', (await text()).includes('my day'))
  await ctx.setOffline(false)
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json())
  check('Manifest is installable', manifest.name === 'Arise' && manifest.display === 'standalone' && manifest.icons.length >= 3)
  for (const t of ['Today', 'Goals', 'Health', 'Expenses', 'To-do']) {
    await nav(t)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const small = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 32 || r.width < 32) }).map((b) => b.getAttribute('aria-label') || b.innerText).slice(0, 6))
    check(`${t}: no sideways scrolling, tap targets 32 px+`, overflow <= 0 && small.length === 0, `overflow ${overflow}px ${small.join(' | ')}`)
  }
  check('No JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  await browser.close()
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed on ${deviceName}`)
  fs.writeFileSync(`${OUT}/${deviceName}-results.json`, JSON.stringify(results, null, 1))
})().catch((e) => { console.error('CRASH', e.message.split('\n').slice(0, 4).join(' ')); process.exit(1) })
