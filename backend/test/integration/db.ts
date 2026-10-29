import { sql } from 'bun'
import type { TicketStatus } from '../../src/modules/tickets/types'

export type SeedTicket = {
  ticket_number: string
  status?: TicketStatus
  reserved_until?: Date | null
  reservation_token?: string | null
}

export function ticketNumbers(count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `AMX-${String(i + 1).padStart(5, '0')}`,
  )
}

export function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000)
}

// Empties the tickets and purchases tables and inserts exactly what the test needs.
export async function resetTickets(tickets: SeedTicket[]): Promise<void> {
  // setup.ts sets both. Without the preload DATABASE_URL comes from .env, and
  // TRUNCATE would wipe the dev database.
  if (
    !process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      'Integration tests need their own database: run them with `bun run test:integration`',
    )
  }

  // purchases references tickets, so both empty in one statement.
  await sql`TRUNCATE purchases, tickets RESTART IDENTITY`
  if (tickets.length === 0) return

  // Every row needs every column: sql(rows) takes its columns from the rows,
  // and an explicit NULL status would skip the column default.
  const rows = tickets.map((ticket) => ({
    ticket_number: ticket.ticket_number,
    status: ticket.status ?? 'available',
    reserved_until: ticket.reserved_until ?? null,
    reservation_token: ticket.reservation_token ?? null,
  }))
  await sql`INSERT INTO tickets ${sql(rows)}`
}
