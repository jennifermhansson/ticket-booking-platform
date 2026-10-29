import { afterAll, expect, test } from 'bun:test'
import { sql } from 'bun'
import { buildApp } from '../../src/app'
import type { Reservation } from '../../src/modules/tickets/types'
import { resetTickets, secondsFromNow } from './db'

const server = buildApp()

afterAll(() => server.close())

function reserve() {
  return server.inject({ method: 'POST', url: '/reservations' })
}

test('a reservation holds one ticket until reservedUntil', async () => {
  await resetTickets([{ ticket_number: 'AMX-00001' }])

  const res = await reserve()

  expect(res.statusCode).toBe(201)
  const reservation: Reservation = res.json()
  expect(reservation.ticketNumber).toBe('AMX-00001')
  expect(new Date(reservation.reservedUntil).getTime()).toBeGreaterThan(
    Date.now(),
  )
  expect(reservation.reservationToken).toMatch(/^[0-9a-f-]{36}$/)

  const [row] = await sql`
    SELECT status, reservation_token FROM tickets WHERE ticket_number = 'AMX-00001'
  `
  expect(row).toEqual({
    status: 'reserved',
    reservation_token: reservation.reservationToken,
  })
})

test('an expired reservation can be reserved again with a new token', async () => {
  const oldToken = '9f1c2b7e-3a4d-4e5f-8a6b-1c2d3e4f5a6b'
  await resetTickets([
    {
      ticket_number: 'AMX-00001',
      status: 'reserved',
      reserved_until: secondsFromNow(-1),
      reservation_token: oldToken,
    },
  ])

  const res = await reserve()

  expect(res.statusCode).toBe(201)
  const reservation: Reservation = res.json()
  expect(reservation.ticketNumber).toBe('AMX-00001')
  expect(reservation.reservationToken).not.toBe(oldToken)
})

test('an active reservation is not handed out again', async () => {
  await resetTickets([
    {
      ticket_number: 'AMX-00001',
      status: 'reserved',
      reserved_until: secondsFromNow(60),
    },
    { ticket_number: 'AMX-00002', status: 'sold' },
  ])

  const res = await reserve()

  expect(res.statusCode).toBe(409)
})
