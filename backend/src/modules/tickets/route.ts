import type { FastifyInstance } from 'fastify'
import * as controller from './controller'
import {
  listTicketsSchema,
  reserveTicketSchema,
  ticketMapSchema,
} from './schema'

export async function ticketRoutes(app: FastifyInstance) {
  app.get('/tickets', { schema: listTicketsSchema }, controller.listTickets)
  app.get('/tickets/map', { schema: ticketMapSchema }, controller.getTicketMap)
  app.post(
    '/reservations',
    { schema: reserveTicketSchema },
    controller.reserveTicket,
  )
}
