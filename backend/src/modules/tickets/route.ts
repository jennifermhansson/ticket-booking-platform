import type { FastifyInstance } from 'fastify'
import * as controller from './controller'
import { listTicketsSchema } from './schema'

export async function ticketRoutes(app: FastifyInstance) {
  app.get('/tickets', { schema: listTicketsSchema }, controller.listTickets)
}
