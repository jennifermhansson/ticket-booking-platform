import { afterAll, expect, test } from 'bun:test'
import { buildApp } from '../src/app'

// Validation rejects these before the handler runs, so no database is needed.
const server = buildApp()

afterAll(() => server.close())

const token = '3f1c2b9e-6d4a-4f8e-9b2a-1c5d7e8f9a0b'

test.each([
  ['no body', undefined],
  ['a missing token', { ticketNumber: 'AMX-00001' }],
  ['a missing ticket number', { reservationToken: token }],
  [
    'a token that is not a UUID',
    { ticketNumber: 'AMX-00001', reservationToken: 'abc' },
  ],
  ['a bad ticket number', { ticketNumber: 'AMX-1', reservationToken: token }],
])('POST /purchases with %s returns 400', async (_name, payload) => {
  const res = await server.inject({
    method: 'POST',
    url: '/purchases',
    payload,
  })
  expect(res.statusCode).toBe(400)
})
