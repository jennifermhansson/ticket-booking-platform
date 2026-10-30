import { describe, expect, test } from 'bun:test'
import { formatSeconds, secondsLeft } from './countdown'

describe('secondsLeft', () => {
  const now = Date.parse('2026-11-04T10:00:00.000Z')

  test('counts whole seconds until the reservation ends', () => {
    expect(secondsLeft('2026-11-04T10:05:00.000Z', now)).toBe(300)
  })

  test('rounds a part second up, so 0 means expired', () => {
    expect(secondsLeft('2026-11-04T10:00:00.400Z', now)).toBe(1)
  })

  test('is 0 once the reservation has ended', () => {
    expect(secondsLeft('2026-11-04T09:59:00.000Z', now)).toBe(0)
  })
})

describe('formatSeconds', () => {
  test('pads the seconds', () => {
    expect(formatSeconds(65)).toBe('1:05')
  })

  test('shows 0:00 at the end', () => {
    expect(formatSeconds(0)).toBe('0:00')
  })
})
