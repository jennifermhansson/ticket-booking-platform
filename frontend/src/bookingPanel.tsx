import { useEffect } from 'react'
import type { Purchase, Reservation } from './api'
import { formatSeconds, useCountdown } from './countdown'
import type { Booking } from './useBooking'

const LOW_SECONDS = 30

export function BookingPanel({
  booking,
  onExpire,
}: {
  booking: Booking
  onExpire: () => void
}) {
  const { state, message, retry, busy, reserve, buy } = booking

  return (
    <section className="card booking" aria-labelledby="your-ticket">
      <h2 id="your-ticket">Your ticket</h2>

      {state.step === 'idle' && (
        <p className="muted">
          Reserve a ticket and it's yours for a few minutes while you buy it.
        </p>
      )}
      {state.step === 'bought' && <Receipt purchase={state.purchase} />}
      {state.step === 'reserved' && (
        <ReservationView
          reservation={state.reservation}
          totalSeconds={state.totalSeconds}
          busy={busy}
          onBuy={() => buy(state.reservation)}
          onReserveAgain={reserve}
          onExpire={onExpire}
        />
      )}

      {/* Always in the page, so a screen reader announces what appears in it. */}
      <div aria-live="polite">
        {message && <p className="error">{message}</p>}
        {retry && (
          <button type="button" disabled={busy} onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </section>
  )
}

function Receipt({ purchase }: { purchase: Purchase }) {
  return (
    <div className="receipt">
      <span className="tag success">Confirmed</span>
      <p className="success">
        Bought <strong>{purchase.ticketNumber}</strong> at{' '}
        {new Date(purchase.purchasedAt).toLocaleTimeString()}.
      </p>
    </div>
  )
}

function ReservationView({
  reservation,
  totalSeconds,
  busy,
  onBuy,
  onReserveAgain,
  onExpire,
}: {
  reservation: Reservation
  totalSeconds: number
  busy: boolean
  onBuy: () => void
  onReserveAgain: () => void
  onExpire: () => void
}) {
  const left = useCountdown(reservation.reservedUntil)
  const expired = left === 0
  const low = left < LOW_SECONDS

  // The ticket is available again once the reservation ends, so the map fetches
  // again instead of still showing it as reserved.
  useEffect(() => {
    if (expired) onExpire()
  }, [expired, onExpire])

  if (expired) {
    return (
      <>
        <p className="error">
          Reservation of {reservation.ticketNumber} expired.
        </p>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={onReserveAgain}
        >
          Reserve again
        </button>
      </>
    )
  }

  return (
    <>
      <p className="held">
        <strong className="ticket-number">{reservation.ticketNumber}</strong> is
        reserved for you for{' '}
        <strong className={low ? 'countdown low' : 'countdown'}>
          {formatSeconds(left)}
        </strong>
        .
      </p>
      <div className="bar" aria-hidden="true">
        <div
          className={low ? 'bar-fill low' : 'bar-fill'}
          style={{ width: `${Math.min(100, (left / totalSeconds) * 100)}%` }}
        />
      </div>
      {/* Only at the two thresholds: every second would drown out everything else. */}
      <p className="sr-only" aria-live="polite">
        {low
          ? 'Less than 30 seconds left.'
          : left < 60
            ? 'Less than a minute left.'
            : ''}
      </p>
      <button type="button" className="primary" disabled={busy} onClick={onBuy}>
        Buy {reservation.ticketNumber}
      </button>
    </>
  )
}
