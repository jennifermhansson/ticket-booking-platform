import type { FastifyReply, FastifyRequest } from 'fastify'
import * as service from './service'
import type { ListTicketsQuery } from './types'

export async function listTickets(
  request: FastifyRequest<{ Querystring: ListTicketsQuery }>,
) {
  return service.listTickets(request.query)
}

export async function reserveTicket(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const reservation = await service.reserveTicket()
  if (!reservation) {
    return reply.code(409).send({ message: 'No tickets available' })
  }
  return reply.code(201).send(reservation)
}
