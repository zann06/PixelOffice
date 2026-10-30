import { expect, test } from '@playwright/test'

/**
 * Critical flows (docs/PRD.md §12 acceptance criteria). These specs run only
 * after `npx playwright install chromium`; they are NOT part of CI by default
 * (browsers are not installed in CI runners of this repo yet).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Demo sign-in as the workspace owner.
  await page.getByRole('button', { name: /Ratna Wijaya/ }).click()
  await expect(page.getByRole('heading', { name: 'Dasbor' })).toBeVisible()
})

test('dashboard shows the pixel office and an accessible roster', async ({ page }) => {
  await expect(page.getByRole('img', { name: /Kantor pixel-art/ })).toBeVisible()
  const roster = page.getByRole('list', { name: /Daftar anggota/i })
  await expect(roster.getByRole('button', { name: /Fajar Nugroho/ })).toBeVisible()
})

test('task status change persists and appears after reload', async ({ page }) => {
  await page.getByRole('link', { name: 'Tugas' }).first().click()
  const select = page.getByRole('combobox', { name: /ubah status riset referensi/i })
  await select.selectOption('in_progress')
  await expect(page.getByText('Status tugas tersimpan.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('combobox', { name: /ubah status riset referensi/i })).toHaveValue('in_progress')
})

test('meeting decision can be converted into a follow-up task', async ({ page }) => {
  await page.getByRole('link', { name: 'Rapat' }).first().click()
  await page.getByRole('button', { name: /Rapat Perencanaan Event/ }).click()
  await page.getByRole('button', { name: 'Jadikan tugas' }).click()
  await page.getByLabel('Judul tugas').fill('Tindak lanjut dari e2e')
  await page.getByRole('dialog', { name: 'Tugas tindak lanjut' }).getByRole('button', { name: 'Buat tugas' }).click()
  await expect(page.getByText(/Tugas tindak lanjut dibuat/)).toBeVisible()
})

test('keyboard users can reach the scene roster without the canvas', async ({ page }) => {
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Lewati ke konten utama' })).toBeFocused()
  const roster = page.getByRole('list', { name: /Daftar anggota/i })
  await roster.getByRole('button', { name: /Bima Prasetyo/ }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /Anggota: Bima Prasetyo/ })).toBeVisible()
})
