import { afterAll, expect, test } from 'bun:test'
import { sql } from 'bun'
import { buildApp } from '../../src/app'
import type { Purchase } from '../../src/modules/purchases/types'
import { resetTickets, secondsFromNow } from './db'

const server = buildApp()

afterAll(() => server.close())

const token = '3f1c2b9e-6d4a-4f8e-9b2a-1c5d7e8f9a0b'
const otherToken = '9f1c2b7e-3a4d-4e5f-8a6b-1c2d3e4f5a6b'

function purchase(ticketNumber: string, reservationToken: string) {
  return server.inject({
    method: 'POST',
    url: '/purchases',
    payload: { ticketNumber, reservationToken },
  })
}

function reservedTicket(reservedUntil = secondsFromNow(60)) {
  return {
    ticket_number: 'AMX-00001',
    status: 'reserved' as const,
    reserved_until: reservedUntil,
    reservation_token: token,
  }
}

test('an active reservation can be bought with its token', async () => {
  await resetTickets([reservedTicket()])

  const res = await purchase('AMX-00001', token)

  expect(res.statusCode).toBe(201)
  expect(res.json<Purchase>().ticketNumber).toBe('AMX-00001')

  const [ticket] = await sql`
    SELECT status, reserved_until, reservation_token FROM tickets
  `
  expect(ticket).toEqual({
    status: 'sold',
    reserved_until: null,
    reservation_token: null,
  })
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM purchases`
  expect(count).toBe(1)
})

test('a sold ticket cannot be bought again with the same token', async () => {
  await resetTickets([reservedTicket()])

  expect((await purchase('AMX-00001', token)).statusCode).toBe(201)
  expect((await purchase('AMX-00001', token)).statusCode).toBe(409)
})

test.each([
  ['a wrong token', reservedTicket(), 'AMX-00001', otherToken],
  [
    'an expired reservation',
    reservedTicket(secondsFromNow(-1)),
    'AMX-00001',
    token,
  ],
  ['an unknown ticket', reservedTicket(), 'AMX-00002', token],
  ['an available ticket', { ticket_number: 'AMX-00001' }, 'AMX-00001', token],
])(
  'a purchase with %s returns 409 and sells nothing',
  async (_name, seed, ticketNumber, reservationToken) => {
    await resetTickets([seed])

    const res = await purchase(ticketNumber, reservationToken)

    expect(res.statusCode).toBe(409)
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM purchases`
    expect(count).toBe(0)
  },
)
