import { expect, type Page, test } from '@playwright/test'
import { countByStatus, resetTickets } from './db'

// The claim the whole platform rests on: a ticket is never sold twice. Here
// two customers in two browsers go for the only ticket at the same moment.
test.beforeEach(() => resetTickets(1))

test('two customers race for the last ticket and only one gets it', async ({
  browser,
}) => {
  const customers = await Promise.all(
    [0, 1].map(async () => {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.goto('/')
      await expect(
        page.getByRole('button', { name: 'Reserve a ticket' }),
      ).toBeVisible()
      return page
    }),
  )

  await Promise.all(
    customers.map((page) =>
      page.getByRole('button', { name: 'Reserve a ticket' }).click(),
    ),
  )

  // Whoever the database lets in first holds the ticket, the other is told it
  // is gone. Which of them wins is up to timing, so the test does not care.
  const reserved = (page: Page) => page.getByText(/is reserved for you for/)
  const soldOut = (page: Page) => page.getByText('No tickets left.')
  await expect
    .poll(async () => {
      const states = await Promise.all(
        customers.map(async (page) => ({
          reserved: await reserved(page).count(),
          soldOut: await soldOut(page).count(),
        })),
      )
      return {
        reserved: states.filter((s) => s.reserved === 1).length,
        soldOut: states.filter((s) => s.soldOut === 1).length,
      }
    })
    .toEqual({ reserved: 1, soldOut: 1 })

  const holders = await Promise.all(
    customers.map(async (page) =>
      (await reserved(page).count()) === 1 ? page : null,
    ),
  )
  const holder = holders.find((page): page is Page => page !== null)
  if (!holder) throw new Error('nobody holds the ticket')

  await holder.getByRole('button', { name: /^Buy AMX-/ }).click()
  await expect(holder.getByText(/^Bought AMX-/)).toBeVisible()

  // The database agrees with the screens: one ticket, sold once.
  expect(await countByStatus()).toEqual({
    available: 0,
    reserved: 0,
    sold: 1,
    purchases: 1,
  })
})
