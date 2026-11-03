import { TICKET_STATUSES } from './api'
import type { Counts } from './useTicketMap'

export function TicketCounts({ counts }: { counts: Counts | null }) {
  if (!counts) {
    return (
      <div className="counts" aria-hidden="true">
        {TICKET_STATUSES.map((status) => (
          <div key={status} className="skeleton skeleton-count" />
        ))}
      </div>
    )
  }

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
