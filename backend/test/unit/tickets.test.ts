import { afterAll, expect, test } from 'bun:test'
import { buildApp } from '../../src/app'

// Validation rejects these before the handler runs, so no database is needed.
const server = buildApp()

afterAll(() => server.close())

test.each(['status=bogus', 'limit=0', 'limit=501', 'offset=-1'])(
  'GET /tickets?%s returns 400',
  async (query) => {
    const res = await server.inject({ method: 'GET', url: `/tickets?${query}` })
    expect(res.statusCode).toBe(400)
  },
)
