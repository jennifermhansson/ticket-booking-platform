import { expect, test } from 'bun:test'
import { parseReservationSeconds } from '../../src/modules/tickets/service'

test('defaults to 300 seconds when RESERVATION_SECONDS is not set', () => {
  expect(parseReservationSeconds(undefined)).toBe(300)
})

test('accepts a positive integer', () => {
  expect(parseReservationSeconds('5')).toBe(5)
})

test.each(['0', '-1', '1.5', 'abc', ''])(
  'rejects RESERVATION_SECONDS=%p',
  (value) => {
    expect(() => parseReservationSeconds(value)).toThrow(
      'RESERVATION_SECONDS must be a positive integer',
    )
  },
)
