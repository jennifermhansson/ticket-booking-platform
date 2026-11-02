import { expect, test } from 'bun:test'
import { type AddressInfo, connect } from 'node:net'
import { buildApp } from '../../src/app'

// These run against a real listening server, not inject(), because the
// question is whether Bun's node:http layer drains like Node's (#23).

async function listeningApp() {
  const app = buildApp({ corsOrigins: [] })
  app.get('/slow', async () => {
    await Bun.sleep(300)
    return { status: 'done' }
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  const { port } = app.server.address() as AddressInfo
  return { app, url: `http://127.0.0.1:${port}` }
}

test('close() waits for an in-flight request to finish', async () => {
  const { app, url } = await listeningApp()

  const inFlight = fetch(`${url}/slow`)
  await Bun.sleep(50)
  const closed = app.close()

  const res = await inFlight
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: 'done' })
  await closed
})

test('close() does not hang on an idle keep-alive connection', async () => {
  const { app, url } = await listeningApp()
  const { port } = new URL(url)

  // A raw socket, because Bun's node:http Agent does not pool sockets like
  // Node's. One keep-alive request, then the socket stays open and idle, as
  // Traefik's does between requests.
  const socket = connect(Number(port), '127.0.0.1')
  const socketClosed = new Promise<void>((resolve) =>
    socket.on('close', resolve),
  )
  const response = new Promise<string>((resolve) =>
    socket.once('data', (chunk) => resolve(chunk.toString())),
  )
  socket.write(
    'GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: keep-alive\r\n\r\n',
  )
  const head = await response
  expect(head).toStartWith('HTTP/1.1 200')
  expect(head.toLowerCase()).not.toContain('connection: close')

  const start = performance.now()
  await app.close()
  await socketClosed

  expect(performance.now() - start).toBeLessThan(2000)
})
