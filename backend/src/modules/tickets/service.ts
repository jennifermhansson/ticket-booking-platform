import { toTicket } from './mapper'
import * as repository from './repository'
import type { ListTicketsQuery, TicketPage } from './types'

export async function listTickets(query: ListTicketsQuery): Promise<TicketPage> {
  const { rows, total } = await repository.listTickets(query)
  return { total, tickets: rows.map(toTicket) }
}
