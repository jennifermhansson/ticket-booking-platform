import { expect, test } from 'bun:test'
import { toReservation, toTicket } from '../../src/modules/tickets/mapper'

const reservedUntil = new Date('2026-11-04T10:00:00.000Z')

test('a reserved ticket shows when its reservation ends', () => {
  const ticket = toTicket({
    ticket_number: 'AMX-00001',
    status: 'reserved',
    reserved_until: reservedUntil,
  })
  expect(ticket).toEqual({
    ticketNumber: 'AMX-00001',
    status: 'reserved',
    reservedUntil: '2026-11-04T10:00:00.000Z',
  })
})

test('an available ticket hides the reserved_until left by an expired reservation', () => {
  const ticket = toTicket({
    ticket_number: 'AMX-00002',
    status: 'available',
    reserved_until: reservedUntil,
  })
  expect(ticket.reservedUntil).toBeNull()
})

test('a sold ticket has no reservedUntil', () => {
  const ticket = toTicket({
    ticket_number: 'AMX-00003',
    status: 'sold',
    reserved_until: null,
  })
  expect(ticket.reservedUntil).toBeNull()
})

test('a reservation returns its ticket, end time and token', () => {
  const reservation = toReservation({
    ticket_number: 'AMX-00004',
    reserved_until: reservedUntil,
    reservation_token: '9f1c2b7e-3a4d-4e5f-8a6b-1c2d3e4f5a6b',
  })
  expect(reservation).toEqual({
    ticketNumber: 'AMX-00004',
    reservedUntil: '2026-11-04T10:00:00.000Z',
    reservationToken: '9f1c2b7e-3a4d-4e5f-8a6b-1c2d3e4f5a6b',
  })
})
