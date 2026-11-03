import type { Booking } from './useBooking'

export function EventHero({ booking }: { booking: Booking }) {
  const { state, busy, reserve } = booking

  return (
    <header className="hero">
      <div className="hero-inner">
        <span className="tag">On sale now</span>
        <h1>Nordic Lights Festival 2027</h1>
        <ul className="event-facts">
          <li>Sat 12 June 2027</li>
          <li>Harbour Arena, Gothenburg</li>
          <li>5,000 numbered tickets</li>
        </ul>
        {/* While a ticket is held, the next step is in the booking panel. */}
        {state.step !== 'reserved' && (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={reserve}
          >
            {state.step === 'bought'
              ? 'Reserve another ticket'
              : 'Reserve a ticket'}
          </button>
        )}
      </div>
    </header>
  )
}
