import type { Ticket, TicketRow } from './types'

export function toTicket(row: TicketRow): Ticket {
  return {
    ticketNumber: row.ticket_number,
    status: row.status,
    // An expired reservation still has its old reserved_until in the row.
    reservedUntil:
      row.status === 'reserved' && row.reserved_until
        ? row.reserved_until.toISOString()
        : null,
  }
}
