import { expect, test } from 'bun:test'
import { buildApp } from '../../src/app'

test('GET /health returns 200 and status ok', async () => {
  const server = buildApp()
  const res = await server.inject({ method: 'GET', url: '/health' })
  expect(res.statusCode).toBe(200)
  expect(res.json()).toEqual({ status: 'ok' })
  await server.close()
})
