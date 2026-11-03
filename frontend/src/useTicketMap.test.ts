import { describe, expect, test } from 'bun:test'
import { countStatuses } from './useTicketMap'

describe('countStatuses', () => {
  test('counts each status', () => {
    expect(countStatuses('aarsss')).toEqual({
      available: 2,
      reserved: 1,
      sold: 3,
    })
  })

  test('is all zeros when there are no tickets', () => {
    expect(countStatuses('')).toEqual({ available: 0, reserved: 0, sold: 0 })
  })
})
