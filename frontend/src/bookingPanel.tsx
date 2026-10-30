import { useEffect, useState } from 'react'
import {
  type Purchase,
  purchaseTicket,
  type Reservation,
  reserveTicket,
} from './api'
import { formatSeconds, useCountdown } from './countdown'

type State =
  | { step: 'idle' }
  | { step: 'reserved'; reservation: Reservation }
  | { step: 'bought'; purchase: Purchase }

export function BookingPanel({ onChange }: { onChange: () => void }) {
  const [state, setState] = useState<State>({ step: 'idle' })
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Every call ends the same way: show what happened, then let the counts and
  // the list fetch the new state.
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch {
      setMessage('Something went wrong. Try again.')
    } finally {
      setBusy(false)
      onChange()
    }
  }

  const reserve = () =>
    run(async () => {
      const result = await reserveTicket()
      if (result.ok) setState({ step: 'reserved', reservation: result.value })
      else setMessage('No tickets left.')
    })

  const buy = (reservation: Reservation) =>
    run(async () => {
      const result = await purchaseTicket(reservation)
      if (result.ok) {
        setState({ step: 'bought', purchase: result.value })
      } else {
        setState({ step: 'idle' })
        setMessage('The reservation is no longer valid. Reserve a new ticket.')
      }
    })

  return (
    <section className="booking">
      <h2>Book a ticket</h2>

      {state.step === 'reserved' ? (
        <ReservationView
          reservation={state.reservation}
          busy={busy}
          onBuy={() => buy(state.reservation)}
          onReserveAgain={reserve}
          onExpire={onChange}
        />
      ) : (
        <>
          {state.step === 'bought' && (
            <p className="success">
              Bought {state.purchase.ticketNumber} at{' '}
              {new Date(state.purchase.purchasedAt).toLocaleTimeString()}.
            </p>
          )}
          <button type="button" disabled={busy} onClick={reserve}>
            {state.step === 'bought'
              ? 'Reserve another ticket'
              : 'Reserve a ticket'}
          </button>
        </>
      )}

      {message && <p className="error">{message}</p>}
    </section>
  )
}

function ReservationView({
  reservation,
  busy,
  onBuy,
  onReserveAgain,
  onExpire,
}: {
  reservation: Reservation
  busy: boolean
  onBuy: () => void
  onReserveAgain: () => void
  onExpire: () => void
}) {
  const left = useCountdown(reservation.reservedUntil)
  const expired = left === 0

  // The ticket is available again once the reservation ends, so the counts
  // and the list fetch again instead of still showing it as reserved.
  useEffect(() => {
    if (expired) onExpire()
  }, [expired, onExpire])

  if (expired) {
    return (
      <>
        <p className="error">
          Reservation of {reservation.ticketNumber} expired.
        </p>
        <button type="button" disabled={busy} onClick={onReserveAgain}>
          Reserve again
        </button>
      </>
    )
  }

  return (
    <>
      <p>
        {reservation.ticketNumber} is reserved for you for{' '}
        <strong className="countdown">{formatSeconds(left)}</strong>.
      </p>
      <button type="button" disabled={busy} onClick={onBuy}>
        Buy {reservation.ticketNumber}
      </button>
    </>
  )
}
