import Fastify from 'fastify'
import { healthRoutes } from './modules/health/route'
import { purchaseRoutes } from './modules/purchases/route'
import { ticketRoutes } from './modules/tickets/route'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(healthRoutes)
  app.register(ticketRoutes)
  app.register(purchaseRoutes)

  return app
}
