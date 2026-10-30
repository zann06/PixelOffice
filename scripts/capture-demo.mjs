/**
 * Regenerates the README demo assets (docs/screenshots/*.png + demo.gif).
 *
 * Usage: npm run assets   (dev server must be running on :5173)
 *
 * Uses a fixed in-page clock (Friday 10.00 — inside working hours) so the
 * screenshots consistently show the office in use. The live app itself always
 * follows the real clock.
 */
import { chromium } from '@playwright/test'
import pkg from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = pkg
import { PNG } from 'pngjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const outDir = path.join(root, 'assets', 'screenshots')
fs.mkdirSync(outDir, { recursive: true })

const BASE = 'http://localhost:5173'
const FIXED_ISO = '2026-10-30T10:00:00' // Friday 10.00 — working hours, siang

async function setTimeOverride(context) {
  await context.addInitScript(() => {
    const FIXED = new Date('2026-10-30T10:00:00')
    const Original = Date
    class FixedDate extends Original {
      constructor(...args) {
        if (args.length === 0) super(FIXED.getTime())
        else super(...args)
      }
      static now() {
        return FIXED.getTime()
      }
    }
    FixedDate.parse = Original.parse
    FixedDate.UTC = Original.UTC
    window.Date = FixedDate
  })
}

async function dismissHint(page) {
  const btn = page.getByRole('button', { name: 'Mengerti' })
  if (await btn.count()) await btn.click()
}

async function setPhase(page, label) {
  const sel = page.getByRole('combobox', { name: /Suasana scene/ })
  try {
    await sel.selectOption({ label })
  } catch {
    await sel.click()
    await page.getByRole('option', { name: label }).click()
  }
}

const browser = await chromium.launch()
try {
  // ---------- stills (1100px, crisp) ----------
  const context = await browser.newContext({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 })
  await setTimeOverride(context)
  const page = await context.newPage()
  await page.goto(BASE)
  await page.getByRole('button', { name: /Ratna Wijaya/ }).click()
  await page.getByRole('img', { name: /Kantor pixel-art/ }).waitFor({ timeout: 8000 })
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(outDir, 'dashboard.png') })

  // character → member panel (same panel as roster/anggota page)
  await page.getByRole('button', { name: /^Andi Saputra,/ }).click()
  await page.getByRole('dialog').waitFor({ timeout: 5000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(outDir, 'member-panel.png') })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // phase gallery (lighting preview; presence still follows the real clock).
  // Reload before each pick — PixelSelect reopens reliably on a fresh mount.
  for (const [label, file] of [['Pratinjau: Pagi', 'scene-pagi.png'], ['Pratinjau: Sore', 'scene-sore.png'], ['Pratinjau: Malam', 'scene-malam.png']]) {
    await page.reload()
    await page.getByRole('img', { name: /Kantor pixel-art/ }).waitFor({ timeout: 8000 })
    await page.waitForTimeout(500)
    const sel = page.getByRole('combobox', { name: /Suasana scene/ })
    await sel.click()
    await page.getByRole('option', { name: label }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    const scene = page.getByRole('img', { name: /Kantor pixel-art/ })
    await scene.scrollIntoViewIfNeeded()
    await scene.screenshot({ path: path.join(outDir, file) })
  }
  await context.close()

  // ---------- content pages ----------
  const context2 = await browser.newContext({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 })
  await setTimeOverride(context2)
  const page2 = await context2.newPage()
  await page2.goto(`${BASE}/#/tugas`)
  await page2.getByRole('button', { name: /Ratna Wijaya/ }).click()
  await page2.getByRole('heading', { name: 'Tugas' }).waitFor({ timeout: 8000 })
  await page2.waitForTimeout(600)
  await page2.screenshot({ path: path.join(outDir, 'tasks.png') })

  await page2.getByRole('button', { name: /Implementasi halaman utama/ }).click()
  await page2.getByRole('dialog').waitFor({ timeout: 5000 })
  await page2.waitForTimeout(400)
  await page2.screenshot({ path: path.join(outDir, 'task-detail.png') })
  await page2.keyboard.press('Escape')

  await page2.goto(`${BASE}/#/rapat`)
  await page2.getByRole('heading', { name: 'Rapat' }).waitFor({ timeout: 8000 })
  await page2.getByRole('button', { name: /Rapat Perencanaan Event/ }).click()
  await page2.getByRole('dialog').waitFor({ timeout: 5000 })
  await page2.waitForTimeout(400)
  await page2.screenshot({ path: path.join(outDir, 'meeting-decision.png') })
  await page2.keyboard.press('Escape')

  await page2.goto(`${BASE}/#/anggota`)
  await page2.getByRole('heading', { name: 'Anggota & Departemen' }).waitFor({ timeout: 8000 })
  await page2.waitForTimeout(500)
  await page2.screenshot({ path: path.join(outDir, 'members.png') })
  await context2.close()

  // ---------- GIF walkthrough (fresh session, narrated frames) ----------
  const gifContext = await browser.newContext({ viewport: { width: 960, height: 660 }, deviceScaleFactor: 1 })
  await setTimeOverride(gifContext)
  const gp = await gifContext.newPage()
  const frames = []
  async function snap(name) {
    const file = path.join(outDir, `frame-${frames.length}-${name}.png`)
    await gp.waitForTimeout(650)
    await gp.screenshot({ path: file })
    frames.push(file)
  }

  await gp.goto(BASE)
  await gp.getByRole('button', { name: /Ratna Wijaya/ }).waitFor({ timeout: 8000 })
  await snap('signin')
  await gp.getByRole('button', { name: /Ratna Wijaya/ }).click()
  await gp.getByRole('img', { name: /Kantor pixel-art/ }).waitFor({ timeout: 8000 })
  await gp.waitForTimeout(900)
  await snap('dashboard')
  await dismissHint(gp)
  await gp.getByRole('button', { name: /^Sinta Maharani,/ }).click()
  await gp.getByRole('dialog').waitFor({ timeout: 5000 })
  await snap('member-panel')
  await gp.keyboard.press('Escape')
  await gp.waitForTimeout(300)

  await gp.goto(`${BASE}/#/tugas`)
  await gp.getByRole('heading', { name: 'Tugas' }).waitFor({ timeout: 8000 })
  await snap('tasks')
  await gp.getByRole('button', { name: /Implementasi halaman utama/ }).click()
  await gp.getByRole('dialog').waitFor({ timeout: 5000 })
  await snap('task-detail')
  await gp.keyboard.press('Escape')

  await gp.goto(`${BASE}/#/rapat`)
  await gp.getByRole('heading', { name: 'Rapat' }).waitFor({ timeout: 8000 })
  await gp.getByRole('button', { name: /Rapat Perencanaan Event/ }).click()
  await gp.getByRole('dialog').waitFor({ timeout: 5000 })
  await snap('meeting')
  const jadikan = gp.getByRole('button', { name: 'Jadikan tugas' })
  if (await jadikan.count()) {
    await jadikan.click()
    await gp.getByRole('dialog', { name: 'Tugas tindak lanjut' }).waitFor({ timeout: 5000 })
    await snap('decision-to-task')
  }
  await gp.keyboard.press('Escape')

  await gp.goto(`${BASE}/#/anggota`)
  await gp.getByRole('heading', { name: 'Anggota & Departemen' }).waitFor({ timeout: 8000 })
  await snap('members')

  await gp.goto(`${BASE}/#/dashboard`)
  await gp.getByRole('img', { name: /Kantor pixel-art/ }).waitFor({ timeout: 8000 })
  await gp.waitForTimeout(600)
  const sel = gp.getByRole('combobox', { name: /Suasana scene/ })
  await sel.click()
  await gp.getByRole('option', { name: 'Pratinjau: Malam' }).click()
  await gp.keyboard.press('Escape')
  await gp.waitForTimeout(800)
  await snap('night-preview')

  await gifContext.close()

  // ---------- assemble GIF ----------
  const gif = GIFEncoder()
  for (const file of frames) {
    const png = PNG.sync.read(fs.readFileSync(file))
    const rgba = new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength)
    const palette = quantize(rgba, 256)
    const index = applyPalette(rgba, palette)
    gif.writeFrame(index, png.width, png.height, { palette, delay: 850 })
    if (path.basename(file) !== 'frame-0-signin.png') fs.rmSync(file) // keep frames out of the repo
  }
  gif.finish()
  fs.writeFileSync(path.join(outDir, 'demo.gif'), gif.bytes())
  console.log(`GIF: ${frames.length} frames, ${(fs.statSync(path.join(outDir, 'demo.gif')).size / 1024).toFixed(0)} KB`)
} finally {
  await browser.close()
}
console.log('done')
