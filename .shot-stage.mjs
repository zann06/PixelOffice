import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
const login = page.getByRole('button', { name: /Ratna Wijaya/ })
if (await login.count()) await login.first().click()
await page.waitForTimeout(1200)
const s = await page.locator('[role="img"][aria-label^="Kantor pixel-art"]').boundingBox()
if (!s) throw new Error('scene not found')
await page.screenshot({
  path: 'shot-stage.png',
  clip: { x: s.x + s.width * 0.55, y: s.y + s.height * 0.52, width: s.width * 0.45, height: s.height * 0.45 },
})
await browser.close()
