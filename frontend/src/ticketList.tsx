import { useEffect, useState } from 'react'
import {
  listTickets,
  PAGE_SIZE,
  TICKET_STATUSES,
  type TicketPage,
  type TicketStatus,
} from './api'

export function TicketList({ version }: { version: number }) {
  const [status, setStatus] = useState<TicketStatus | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const [page, setPage] = useState<TicketPage | null>(null)
  const [error, setError] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: version is App's signal to fetch again
  useEffect(() => {
    let current = true
    listTickets(status, offset)
      .then((result) => {
        if (current) {
          setPage(result)
          setError(false)
        }
      })
      .catch(() => current && setError(true))
    return () => {
      current = false
    }
  }, [status, offset, version])

  const choose = (next: TicketStatus | undefined) => {
    setStatus(next)
    setOffset(0)
  }

  const total = page?.total ?? 0
  const last = Math.min(offset + PAGE_SIZE, total)

  return (
    <section>
      <h2>Tickets</h2>
      <div className="filters">
        <button
          type="button"
          aria-pressed={status === undefined}
          onClick={() => choose(undefined)}
        >
          all
        </button>
        {TICKET_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => choose(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="error">Could not load the tickets.</p>}

      {page && (
        <>
          <p>
            {total === 0
              ? 'No tickets.'
              : `Showing ${offset + 1}–${last} of ${total.toLocaleString('en')}`}
          </p>
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {page.tickets.map((ticket) => (
                <tr key={ticket.ticketNumber}>
                  <td>{ticket.ticketNumber}</td>
                  <td className={ticket.status}>{ticket.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={last >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  )
}
