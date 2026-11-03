import { afterAll, expect, test } from 'bun:test'
import { buildApp } from '../../src/app'
import type { TicketMap } from '../../src/modules/tickets/types'
import { resetTickets, secondsFromNow } from './db'

const server = buildApp()

afterAll(() => server.close())

async function getMap(): Promise<TicketMap> {
  const res = await server.inject({ method: 'GET', url: '/tickets/map' })
  expect(res.statusCode).toBe(200)
  return res.json()
}

test('gives one character per ticket in ticket number order', async () => {
  await resetTickets([
    { ticket_number: 'AMX-00004', status: 'sold' },
    { ticket_number: 'AMX-00001' },
    {
      ticket_number: 'AMX-00003',
      status: 'reserved',
      reserved_until: secondsFromNow(60),
    },
    {
      ticket_number: 'AMX-00002',
      status: 'reserved',
      reserved_until: secondsFromNow(-60),
    },
  ])

  // AMX-00002's reservation has expired, so it counts as available.
  expect(await getMap()).toEqual({ statuses: 'aars' })
})

test('is empty when there are no tickets', async () => {
  await resetTickets([])

  expect(await getMap()).toEqual({ statuses: '' })
})
