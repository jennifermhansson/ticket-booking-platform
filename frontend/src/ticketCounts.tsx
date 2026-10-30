import { useEffect, useState } from 'react'
import { countTickets, TICKET_STATUSES, type TicketStatus } from './api'

type Counts = Record<TicketStatus, number>

export function TicketCounts({ version }: { version: number }) {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: version is App's signal to fetch again
  useEffect(() => {
    let current = true
    Promise.all(TICKET_STATUSES.map(countTickets))
      .then(([available, reserved, sold]) => {
        if (current) {
          setCounts({ available, reserved, sold })
          setError(false)
        }
      })
      .catch(() => current && setError(true))
    return () => {
      current = false
    }
  }, [version])

  if (error) return <p className="error">Could not load the ticket counts.</p>
  if (!counts) return <p>Loading tickets…</p>

  return (
    <dl className="counts">
      {TICKET_STATUSES.map((status) => (
        <div key={status} className={`count ${status}`}>
          <dt>{status}</dt>
          <dd>{counts[status].toLocaleString('en')}</dd>
        </div>
      ))}
    </dl>
  )
}
