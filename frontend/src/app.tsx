import { useCallback, useState } from 'react'
import { BookingPanel } from './bookingPanel'
import { TicketCounts } from './ticketCounts'
import { TicketList } from './ticketList'

export function App() {
  // Bumped after every reservation and purchase, so the counts and the list
  // fetch again and show the new state. Stable, since BookingPanel calls it
  // from an effect.
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  return (
    <main>
      <h1>Ticket booking</h1>
      <TicketCounts version={version} />
      <BookingPanel onChange={refresh} />
      <TicketList version={version} />
    </main>
  )
}
