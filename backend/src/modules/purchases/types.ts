export type PurchaseRequest = {
  ticketNumber: string
  reservationToken: string
}

export type PurchaseRow = {
  ticket_number: string
  purchased_at: Date
}

export type Purchase = {
  ticketNumber: string
  purchasedAt: string
}
