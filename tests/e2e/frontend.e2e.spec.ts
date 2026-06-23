import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('redirects unauthenticated users from the homepage to the app login', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page).toHaveTitle(/SpecFlow OS/)
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
  })
})
