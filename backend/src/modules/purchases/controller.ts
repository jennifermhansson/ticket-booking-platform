import type { FastifyReply, FastifyRequest } from 'fastify'
import * as service from './service'
import type { PurchaseRequest } from './types'

export async function purchaseTicket(
  request: FastifyRequest<{ Body: PurchaseRequest }>,
  reply: FastifyReply,
) {
  const purchase = await service.purchaseTicket(request.body)
  // Only the ticket number: the reservation token is a bearer secret (ADR 0009).
  const { ticketNumber } = request.body
  if (!purchase) {
    // info, since thousands of these under load are expected.
    request.log.info(
      { ticketNumber },
      'purchase rejected: no active reservation',
    )
    // One answer for unknown, expired, sold and wrong token, so the endpoint
    // cannot be used to probe which tokens or tickets exist (ADR 0009).
    return reply
      .code(409)
      .send({ message: 'No active reservation for this ticket and token' })
  }
  request.log.info({ ticketNumber }, 'ticket sold')
  return reply.code(201).send(purchase)
}
