import { useEffect, useState } from 'react'
import {
  describeError,
  type Purchase,
  purchaseTicket,
  type Reservation,
  reserveTicket,
} from './api'
import { secondsLeft } from './countdown'

export type BookingState =
  | { step: 'idle' }
  // totalSeconds is what the progress bar counts down from. It is stored with
  // the reservation, since a reload cannot work it out again.
  | { step: 'reserved'; reservation: Reservation; totalSeconds: number }
  | { step: 'bought'; purchase: Purchase }

const STORAGE_KEY = 'booking'

export function parseStoredBooking(stored: string | null): BookingState {
  if (!stored) return { step: 'idle' }
  try {
    const state = JSON.parse(stored) as BookingState
    if (state.step === 'reserved' && state.reservation?.reservationToken)
      return state
    if (state.step === 'bought' && state.purchase?.ticketNumber) return state
  } catch {
    // Not ours or cut short: start over instead of breaking the page.
  }
  return { step: 'idle' }
}

// sessionStorage can throw when the browser blocks site data, and the booking
// still works without it, it just does not survive a reload.
function loadBooking(): BookingState {
  try {
    return parseStoredBooking(sessionStorage.getItem(STORAGE_KEY))
  } catch {
    return { step: 'idle' }
  }
}

function saveBooking(state: BookingState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // See loadBooking.
  }
}

export type Booking = ReturnType<typeof useBooking>

export function useBooking(onChange: () => void) {
  const [state, setState] = useState<BookingState>(loadBooking)
  const [message, setMessage] = useState<string | null>(null)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => saveBooking(state), [state])

  // Every call ends the same way: show what happened, then let the map fetch
  // the new state. A 409 is an answer and only needs a message. Anything else
  // may be temporary, so the customer can run the same call again.
  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setMessage(null)
    setRetry(null)
    try {
      await action()
    } catch (error) {
      setMessage(describeError(error))
      setRetry(() => () => run(action))
    } finally {
      setBusy(false)
      onChange()
    }
  }

  const reserve = () =>
    run(async () => {
      const result = await reserveTicket()
      if (result.ok) {
        setState({
          step: 'reserved',
          reservation: result.value,
          totalSeconds: secondsLeft(result.value.reservedUntil, Date.now()),
        })
      } else {
        setMessage('No tickets left.')
      }
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

  return { state, message, retry, busy, reserve, buy }
}
