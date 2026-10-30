import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
const btn = page.getByRole('button', { name: /Ratna Wijaya/ })
if (await btn.count()) await btn.first().click()
await page.waitForTimeout(2500)
await page.screenshot({ path: process.argv[2] ?? 'shot.png', fullPage: true })
console.log('title:', await page.title())
console.log('h1:', await page.locator('h1').first().textContent())
await browser.close()
