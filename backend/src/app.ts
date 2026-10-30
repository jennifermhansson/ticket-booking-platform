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

  app.register(cors, { origin: options.corsOrigins, methods: ['GET', 'POST'] })
  app.register(healthRoutes)
  app.register(ticketRoutes)
  app.register(purchaseRoutes)

  return app
}
