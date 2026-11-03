import { BookingPanel } from './bookingPanel'
import { EventHero } from './eventHero'
import { TicketCounts } from './ticketCounts'
import { TicketMap } from './ticketMap'
import { useBooking } from './useBooking'
import { countStatuses, useTicketMap } from './useTicketMap'

export function App() {
  const { statuses, failed, refresh } = useTicketMap()
  const booking = useBooking(refresh)
  const counts = statuses === null ? null : countStatuses(statuses)

  return (
    <>
      <EventHero booking={booking} />
      <main className="layout">
        <BookingPanel booking={booking} onExpire={refresh} />
        <section className="card" aria-labelledby="availability">
          <h2 id="availability">Live availability</h2>
          {failed && (
            <p className="notice" role="status">
              Can't reach the ticket service.{' '}
              {statuses === null
                ? 'Trying again every few seconds.'
                : 'Showing the last known state and trying again.'}
            </p>
          )}
          <TicketCounts counts={counts} />
          <TicketMap statuses={statuses} counts={counts} />
        </section>
      </main>
      <footer className="footer">
        <p>
          A demo of a platform that sells 5,000 numbered tickets under heavy
          load without selling one twice. The event is made up: no real tickets
          and no payment.{' '}
          <a href="https://github.com/jennifermhansson/ticket-booking-platform">
            Source on GitHub
          </a>
        </p>
      </footer>
    </>
  )
}
