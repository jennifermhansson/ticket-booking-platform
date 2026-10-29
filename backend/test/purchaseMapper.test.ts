import { expect, test } from 'bun:test'
import { toPurchase } from '../src/modules/purchases/mapper'

test('a purchase returns its ticket and when it was bought', () => {
  const purchase = toPurchase({
    ticket_number: 'AMX-00001',
    purchased_at: new Date('2026-11-04T10:00:00.000Z'),
  })
  expect(purchase).toEqual({
    ticketNumber: 'AMX-00001',
    purchasedAt: '2026-11-04T10:00:00.000Z',
  })
})
