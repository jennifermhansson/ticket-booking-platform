import { afterAll, beforeEach, expect, test } from 'bun:test'
import { buildApp } from '../../src/app'
import type { TicketPage } from '../../src/modules/tickets/types'
import { resetTickets, secondsFromNow } from './db'

const server = buildApp()

afterAll(() => server.close())

beforeEach(() =>
  resetTickets([
    { ticket_number: 'AMX-00001' },
    {
      ticket_number: 'AMX-00002',
      status: 'reserved',
      reserved_until: secondsFromNow(-60),
    },
    {
      ticket_number: 'AMX-00003',
      status: 'reserved',
      reserved_until: secondsFromNow(60),
    },
    { ticket_number: 'AMX-00004', status: 'sold' },
  ]),
)

async function listByStatus(status: string): Promise<TicketPage> {
  const res = await server.inject({
    method: 'GET',
    url: `/tickets?status=${status}`,
  })
  expect(res.statusCode).toBe(200)
  return res.json()
}

test('an expired reservation is listed as available', async () => {
  const page = await listByStatus('available')

  expect(page.total).toBe(2)
  expect(page.tickets.map((t) => t.ticketNumber)).toEqual([
    'AMX-00001',
    'AMX-00002',
  ])
  expect(page.tickets.every((t) => t.status === 'available')).toBe(true)
})

test('only an active reservation is listed as reserved', async () => {
  const page = await listByStatus('reserved')

  expect(page.total).toBe(1)
  expect(page.tickets[0]?.ticketNumber).toBe('AMX-00003')
  expect(page.tickets[0]?.reservedUntil).not.toBeNull()
})

test('a sold ticket is listed as sold', async () => {
  const page = await listByStatus('sold')

  expect(page.tickets.map((t) => t.ticketNumber)).toEqual(['AMX-00004'])
})
