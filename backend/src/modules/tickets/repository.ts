import { sql } from 'bun'
import type { ListTicketsQuery, ReservationRow, TicketRow } from './types'

// ADR 0002: every read treats an expired reservation as available, so no
// background worker has to release tickets. The reserve query (#11) must use
// the same rule when it picks a ticket, or the list and the reservation will
// disagree about which tickets are free.
// A reservation ends at reserved_until itself, so the reserve query must use <=
// as well.
const effectiveStatus = sql`
  CASE WHEN status = 'reserved' AND reserved_until <= now() THEN 'available' ELSE status END
`

export async function listTickets(
  query: ListTicketsQuery,
): Promise<{ rows: TicketRow[]; total: number }> {
  const statusFilter = query.status
    ? sql`WHERE ${effectiveStatus} = ${query.status}`
    : sql``

  // count(*) OVER () gives the total from the same snapshot as the page.
  const rows: (TicketRow & { total: string })[] = await sql`
    SELECT ticket_number, ${effectiveStatus} AS status, reserved_until, count(*) OVER () AS total
    FROM tickets
    ${statusFilter}
    ORDER BY ticket_number
    LIMIT ${query.limit} OFFSET ${query.offset}
  `

  return { rows, total: Number(rows[0]?.total ?? 0) }
}

// One statement, so it is its own transaction. SKIP LOCKED lets concurrent
// reservations each lock a different free row instead of queueing behind the
// same one (ADR 0002). A new token replaces the one from an expired
// reservation, so the old holder can no longer buy the ticket.
export async function reserveTicket(
  seconds: number,
): Promise<ReservationRow | null> {
  const rows: ReservationRow[] = await sql`
    UPDATE tickets
    SET status = 'reserved',
        reserved_until = now() + make_interval(secs => ${seconds}),
        reservation_token = gen_random_uuid()
    WHERE id = (
      SELECT id FROM tickets
      WHERE ${effectiveStatus} = 'available'
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING ticket_number, reserved_until, reservation_token
  `

  return rows[0] ?? null
}
