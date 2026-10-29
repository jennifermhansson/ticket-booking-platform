import type { FastifyInstance } from 'fastify'
import * as controller from './controller'
import { purchaseTicketSchema } from './schema'

export async function purchaseRoutes(app: FastifyInstance) {
  app.post(
    '/purchases',
    { schema: purchaseTicketSchema },
    controller.purchaseTicket,
  )
}
