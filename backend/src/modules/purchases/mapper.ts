import type { Purchase, PurchaseRow } from './types'

export function toPurchase(row: PurchaseRow): Purchase {
  return {
    ticketNumber: row.ticket_number,
    purchasedAt: row.purchased_at.toISOString(),
  }
}
