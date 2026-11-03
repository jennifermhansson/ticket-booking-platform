// Mirrors the response schemas in backend/src/modules/*/schema.ts.
export const TICKET_STATUSES = ['available', 'reserved', 'sold'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

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

// fetch rejects with a TypeError when no response came back at all, and
// request() throws a plain Error for a 5xx.
export function describeError(error: unknown): string {
  return error instanceof TypeError
    ? "Can't reach the ticket service. Check your connection and try again."
    : 'The ticket service had a problem. Try again.'
}

// One character per ticket in ticket number order: a, r or s.
export async function getTicketMap(): Promise<string> {
  const map = await request<{ statuses: string }>('/tickets/map')
  return map.statuses
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
