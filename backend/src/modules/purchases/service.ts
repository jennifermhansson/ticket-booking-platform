import { toPurchase } from './mapper'
import * as repository from './repository'
import type { Purchase, PurchaseRequest } from './types'

export async function purchaseTicket(
  request: PurchaseRequest,
): Promise<Purchase | null> {
  const row = await repository.purchaseTicket(
    request.ticketNumber,
    request.reservationToken,
  )
  return row ? toPurchase(row) : null
}
