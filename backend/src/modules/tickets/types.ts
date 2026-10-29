export const TICKET_STATUSES = ['available', 'reserved', 'sold'] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

export type TicketRow = {
  ticket_number: string
  status: TicketStatus
  reserved_until: Date | null
}

export type Ticket = {
  ticketNumber: string
  status: TicketStatus
  reservedUntil: string | null
}

export type TicketPage = {
  total: number
  tickets: Ticket[]
}

export type ListTicketsQuery = {
  status?: TicketStatus
  limit: number
  offset: number
}

export type ReservationRow = {
  ticket_number: string
  reserved_until: Date
  reservation_token: string
}

export type Reservation = {
  ticketNumber: string
  reservedUntil: string
  reservationToken: string
}
