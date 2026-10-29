import { afterAll, expect, test } from 'bun:test'
import { sql } from 'bun'
import { buildApp } from '../../src/app'
import type { Reservation } from '../../src/modules/tickets/types'
import { resetTickets, ticketNumbers } from './db'

const TICKETS = 20
const ATTEMPTS_PER_TICKET = 5

const server = buildApp()

afterAll(() => server.close())

// Each holder sends the same purchase several times at once, as a double-click
// or a client retry would. Only one may sell the ticket (ADR 0002, ADR 0011).
test(`${ATTEMPTS_PER_TICKET} parallel purchases per reservation sell each of ${TICKETS} tickets exactly once`, async () => {
  await resetTickets(
    ticketNumbers(TICKETS).map((ticket_number) => ({ ticket_number })),
  )
  const reservations = await Promise.all(
    ticketNumbers(TICKETS).map(async () => {
      const res = await server.inject({ method: 'POST', url: '/reservations' })
      return res.json<Reservation>()
    }),
  )

  const responses = await Promise.all(
    reservations.flatMap((reservation) =>
      Array.from({ length: ATTEMPTS_PER_TICKET }, () =>
        server.inject({
          method: 'POST',
          url: '/purchases',
          payload: {
            ticketNumber: reservation.ticketNumber,
            reservationToken: reservation.reservationToken,
          },
        }),
      ),
    ),
  )

  const sold = responses.filter((res) => res.statusCode === 201)
  const rejected = responses.filter((res) => res.statusCode === 409)
  expect(sold.length).toBe(TICKETS)
  expect(rejected.length).toBe(TICKETS * (ATTEMPTS_PER_TICKET - 1))

  // The two tables must agree: every sold ticket has exactly one purchase.
  const [counts] = await sql`
    SELECT
      (SELECT count(*)::int FROM tickets WHERE status = 'sold') AS sold,
      (SELECT count(*)::int FROM purchases) AS purchases
  `
  expect(counts).toEqual({ sold: TICKETS, purchases: TICKETS })
})
