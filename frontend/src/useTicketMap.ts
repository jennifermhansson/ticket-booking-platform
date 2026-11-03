import { useCallback, useEffect, useRef, useState } from 'react'
import { getTicketMap, type TicketStatus } from './api'

export type Counts = Record<TicketStatus, number>

const REFRESH_MS = 5000

export function countStatuses(statuses: string): Counts {
  const counts: Counts = { available: 0, reserved: 0, sold: 0 }
  for (const char of statuses) {
    if (char === 'a') counts.available++
    else if (char === 'r') counts.reserved++
    else if (char === 's') counts.sold++
  }
  return counts
}

// Fetches every few seconds, so the page moves on its own while other customers
// (or a k6 run) buy. statuses is null until the first answer, and stays at the
// last known state when a fetch fails.
export function useTicketMap() {
  const [statuses, setStatuses] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const latest = useRef(0)

  // Stable, since useBooking calls it from an effect. An answer that arrives
  // after a newer request started is dropped, so the map never moves backwards.
  const refresh = useCallback(() => {
    latest.current += 1
    const current = latest.current
    getTicketMap()
      .then((result) => {
        if (current === latest.current) {
          setStatuses(result)
          setFailed(false)
        }
      })
      .catch(() => {
        if (current === latest.current) setFailed(true)
      })
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { statuses, failed, refresh }
}
