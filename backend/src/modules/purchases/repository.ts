import { sql } from 'bun'
import type { PurchaseRow } from './types'

const UNIQUE_VIOLATION = '23505'

// One statement, so marking the ticket sold and inserting the purchase happen
// together or not at all (ADR 0011). reserved_until > now() is the inverse of
// the <= in the tickets repository's effectiveStatus, so a reservation ends at
// the same moment for list, reserve and purchase. A concurrent purchase of the
// same ticket waits for the row lock, then re-checks the WHERE, finds 'sold'
// and matches nothing.
export async function purchaseTicket(
  ticketNumber: string,
  reservationToken: string,
): Promise<PurchaseRow | null> {
  try {
    const rows: PurchaseRow[] = await sql`
      WITH sold AS (
        UPDATE tickets
        SET status = 'sold', reserved_until = NULL, reservation_token = NULL
        WHERE ticket_number = ${ticketNumber}
          AND reservation_token = ${reservationToken}
          AND status = 'reserved'
          AND reserved_until > now()
        RETURNING id, ticket_number
      )
      INSERT INTO purchases (ticket_id)
      SELECT id FROM sold
      RETURNING (SELECT ticket_number FROM sold), purchased_at
    `
    return rows[0] ?? null
  } catch (error) {
    // The UNIQUE constraint on purchases.ticket_id is the backstop against a
    // second sale (ADR 0002), so hitting it means the ticket is already sold.
    if ((error as { errno?: string }).errno === UNIQUE_VIOLATION) return null
    throw error
  }
}
