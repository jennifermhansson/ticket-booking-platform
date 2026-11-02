import { expect, type Page, test } from '@playwright/test'

// The count shows "1,234", so the thousands separator comes out first.
async function soldCount(page: Page): Promise<number> {
  const text = await page.locator('.count.sold dd').textContent()
  return Number((text ?? '').replaceAll(',', ''))
}

test('a customer reserves a ticket and buys it', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.count.sold dd')).toBeVisible()
  const soldBefore = await soldCount(page)

  await page.getByRole('button', { name: 'Reserve a ticket' }).click()

  const reserved = page.getByText(/is reserved for you for/)
  await expect(reserved).toBeVisible()
  await expect(page.locator('.countdown')).toBeVisible()
  const ticketNumber = (await reserved.textContent())?.split(' ')[0] ?? ''

  await page.getByRole('button', { name: `Buy ${ticketNumber}` }).click()

  await expect(page.getByText(`Bought ${ticketNumber}`)).toBeVisible()
  await expect.poll(() => soldCount(page)).toBe(soldBefore + 1)
})
