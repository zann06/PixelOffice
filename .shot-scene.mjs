import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
const btn = page.getByRole('button', { name: /Ratna Wijaya/ })
if (await btn.count()) await btn.first().click()
await page.waitForTimeout(2500)
const scene = page.locator('[role="img"][aria-label^="Kantor pixel-art"]')
await scene.screenshot({ path: process.argv[2] ?? 'scene.png' })
await browser.close()
