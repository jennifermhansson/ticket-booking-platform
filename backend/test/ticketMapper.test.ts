import { expect, test } from 'bun:test'
import { toTicket } from '../src/modules/tickets/mapper'

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
