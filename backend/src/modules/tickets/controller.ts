import type { FastifyRequest } from 'fastify'
import * as service from './service'
import type { ListTicketsQuery } from './types'

export async function listTickets(request: FastifyRequest<{ Querystring: ListTicketsQuery }>) {
  return service.listTickets(request.query)
}
