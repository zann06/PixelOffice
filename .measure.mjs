import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
const login = page.getByRole('button', { name: /Ratna Wijaya/ })
if (await login.count()) await login.first().click()
await page.waitForTimeout(1500)
const scene = await page.locator('[role="img"][aria-label^="Kantor pixel-art"]').boundingBox()
const labels = await page.locator('[role="img"][aria-label^="Kantor pixel-art"] > span').evaluateAll((els) =>
  els
    .filter((e) => e.textContent && !e.textContent.includes('·'))
    .map((e) => {
      const r = e.getBoundingClientRect()
      return { text: e.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    }),
)
const tile = scene.width / 32
const asTiles = labels.map((l) => ({
  text: l.text,
  x0: +((l.left - scene.x) / tile).toFixed(2),
  x1: +((l.right - scene.x) / tile).toFixed(2),
  y0: +((l.top - scene.y) / tile).toFixed(2),
  y1: +((l.bottom - scene.y) / tile).toFixed(2),
}))
console.log(JSON.stringify({ sceneWidth: scene.width, tile, asTiles }, null, 1))
await browser.close()
