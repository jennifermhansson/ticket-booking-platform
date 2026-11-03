import { describe, expect, test } from 'bun:test'
import { type BookingState, parseStoredBooking } from './useBooking'

describe('parseStoredBooking', () => {
  test('brings a reservation back after a reload', () => {
    const state: BookingState = {
      step: 'reserved',
      totalSeconds: 300,
      reservation: {
        ticketNumber: 'AMX-00001',
        reservedUntil: '2026-11-04T10:05:00.000Z',
        reservationToken: 'token',
      },
    }
    expect(parseStoredBooking(JSON.stringify(state))).toEqual(state)
  })

  test('brings a purchase back after a reload', () => {
    const state: BookingState = {
      step: 'bought',
      purchase: {
        ticketNumber: 'AMX-00001',
        purchasedAt: '2026-11-04T10:01:00.000Z',
      },
    }
    expect(parseStoredBooking(JSON.stringify(state))).toEqual(state)
  })

  test.each([
    null,
    '',
    'not json',
    'null',
    '{"step":"reserved"}',
    '{"step":"bought"}',
    '{"step":"other"}',
  ])('starts over on %p', (stored) => {
    expect(parseStoredBooking(stored)).toEqual({ step: 'idle' })
  })
})
