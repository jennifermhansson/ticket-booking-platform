import { toReservation, toTicket } from './mapper'
import * as repository from './repository'
import type { ListTicketsQuery, Reservation, TicketPage } from './types'

const DEFAULT_RESERVATION_SECONDS = 300

// Read once at startup, so a bad value stops the server instead of producing
// odd reserved_until values under load.
export function parseReservationSeconds(value: string | undefined): number {
  if (value === undefined) return DEFAULT_RESERVATION_SECONDS

  const seconds = Number(value)
  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new Error(
      `RESERVATION_SECONDS must be a positive integer, got "${value}"`,
    )
  }
  return seconds
}

const reservationSeconds = parseReservationSeconds(
  process.env.RESERVATION_SECONDS,
)

export async function listTickets(
  query: ListTicketsQuery,
): Promise<TicketPage> {
  const { rows, total } = await repository.listTickets(query)
  return { total, tickets: rows.map(toTicket) }
}

export async function reserveTicket(): Promise<Reservation | null> {
  const row = await repository.reserveTicket(reservationSeconds)
  return row ? toReservation(row) : null
}
