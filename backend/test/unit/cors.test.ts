import { describe, expect, test } from 'bun:test'
import { buildApp } from '../../src/app'
import { parseCorsOrigins } from '../../src/cors'

describe('parseCorsOrigins', () => {
  test('unset allows no origins', () => {
    expect(parseCorsOrigins(undefined)).toEqual([])
  })

  test('one origin', () => {
    expect(parseCorsOrigins('https://cdn.example')).toEqual([
      'https://cdn.example',
    ])
  })

  test('several origins, with spaces and an empty entry', () => {
    expect(
      parseCorsOrigins(' https://cdn.example , http://localhost:5173,'),
    ).toEqual(['https://cdn.example', 'http://localhost:5173'])
  })
})

describe('CORS preflight', () => {
  const preflight = (origin: string) => {
    const server = buildApp({ corsOrigins: ['https://cdn.example'] })
    return server.inject({
      method: 'OPTIONS',
      url: '/reservations',
      headers: {
        origin,
        'access-control-request-method': 'POST',
      },
    })
  }

  test('an allowed origin gets access-control-allow-origin', async () => {
    const res = await preflight('https://cdn.example')
    expect(res.headers['access-control-allow-origin']).toBe(
      'https://cdn.example',
    )
  })

  test('another origin does not', async () => {
    const res = await preflight('https://evil.example')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
