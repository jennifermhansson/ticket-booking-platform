// Mirrors the response schemas in backend/src/modules/*/schema.ts.
export const TICKET_STATUSES = ['available', 'reserved', 'sold'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export type Ticket = {
  ticketNumber: string
  status: TicketStatus
  reservedUntil: string | null
}

export type TicketPage = {
  total: number
  tickets: Ticket[]
}

export type Reservation = {
  ticketNumber: string
  reservedUntil: string
  reservationToken: string
}

export type Purchase = {
  ticketNumber: string
  purchasedAt: string
}

// A 409 is an expected answer (no ticket left, reservation gone), so it is a
// result the UI shows, not an error it has to catch.
export type Result<T> = { ok: true; value: T } | { ok: false; message: string }

export const PAGE_SIZE = 100

const API_URL = import.meta.env.VITE_API_URL

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init)
  if (!res.ok)
    throw new Error(`${init?.method ?? 'GET'} ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

async function requestResult<T>(
  path: string,
  init: RequestInit,
): Promise<Result<T>> {
  const res = await fetch(`${API_URL}${path}`, init)
  if (res.status === 409) {
    const body = (await res.json()) as { message: string }
    return { ok: false, message: body.message }
  }
  if (!res.ok) throw new Error(`${init.method} ${path}: ${res.status}`)
  return { ok: true, value: (await res.json()) as T }
}

export function listTickets(
  status: TicketStatus | undefined,
  offset: number,
): Promise<TicketPage> {
  const query = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
  })
  if (status) query.set('status', status)
  return request(`/tickets?${query}`)
}

export async function countTickets(status: TicketStatus): Promise<number> {
  const page = await request<TicketPage>(`/tickets?status=${status}&limit=1`)
  return page.total
}

export function reserveTicket(): Promise<Result<Reservation>> {
  return requestResult('/reservations', { method: 'POST' })
}

export function purchaseTicket(
  reservation: Reservation,
): Promise<Result<Purchase>> {
  return requestResult('/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticketNumber: reservation.ticketNumber,
      reservationToken: reservation.reservationToken,
    }),
  })
}
