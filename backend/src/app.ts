import cors from '@fastify/cors'
import Fastify from 'fastify'
import { parseCorsOrigins } from './cors'
import { healthRoutes } from './modules/health/route'
import { purchaseRoutes } from './modules/purchases/route'
import { ticketRoutes } from './modules/tickets/route'

type AppOptions = {
  corsOrigins: string[]
}

export function buildApp(
  options: AppOptions = {
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  },
) {
  const app = Fastify({ logger: true })

  // Bun 1.4 keeps a socket alive after the last response even while the
  // server closes, so close() would wait out the 72 s keep-alive timeout and
  // the pod would be killed before the DB pool closes (#23). Node and Bun 1.3
  // close it on their own; the header makes Bun 1.4 do the same.
  let closing = false
  app.addHook('preClose', async () => {
    closing = true
  })
  app.addHook('onSend', async (_request, reply) => {
    if (closing) reply.header('connection', 'close')
  })

  app.register(cors, { origin: options.corsOrigins, methods: ['GET', 'POST'] })
  app.register(healthRoutes)
  app.register(ticketRoutes)
  app.register(purchaseRoutes)

  return app
}
