import { afterAll, expect, test } from 'bun:test'
import { sql } from 'bun'
import { buildApp } from '../../src/app'
import type { Reservation } from '../../src/modules/tickets/types'
import { resetTickets, ticketNumbers } from './db'

const TICKETS = 20
const REQUESTS = 200

const server = buildApp()

afterAll(() => server.close())

// The core promise of the system: under concurrent load no ticket is handed
// out twice (ADR 0002). All requests start at once, but Bun's sql pool caps
// how many reach Postgres at the same moment. That is still enough for the
// transactions to compete for the same free rows.
test(`${REQUESTS} parallel reservations for ${TICKETS} tickets: exactly ${TICKETS} succeed, no duplicates`, async () => {
  await resetTickets(
    ticketNumbers(TICKETS).map((ticket_number) => ({ ticket_number })),
  )

  const responses = await Promise.all(
    Array.from({ length: REQUESTS }, () =>
      server.inject({ method: 'POST', url: '/reservations' }),
    ),
  )

  const reserved = responses.filter((res) => res.statusCode === 201)
  const soldOut = responses.filter((res) => res.statusCode === 409)
  expect(reserved.length).toBe(TICKETS)
  expect(soldOut.length).toBe(REQUESTS - TICKETS)

  const reservedNumbers = reserved.map(
    (res) => res.json<Reservation>().ticketNumber,
  )
  expect(new Set(reservedNumbers).size).toBe(TICKETS)

  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM tickets WHERE status = 'reserved'
  `
  expect(count).toBe(TICKETS)
})
