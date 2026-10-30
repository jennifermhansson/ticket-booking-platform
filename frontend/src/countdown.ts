import { useEffect, useState } from 'react'

// Whole seconds until reservedUntil, never below 0. The server decides when a
// reservation expires; this only shows the customer how long is left.
export function secondsLeft(reservedUntil: string, now: number): number {
  const ms = new Date(reservedUntil).getTime() - now
  return Math.max(0, Math.ceil(ms / 1000))
}

export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function useCountdown(reservedUntil: string): number {
  const [left, setLeft] = useState(() => secondsLeft(reservedUntil, Date.now()))

  useEffect(() => {
    setLeft(secondsLeft(reservedUntil, Date.now()))
    const timer = setInterval(() => {
      setLeft(secondsLeft(reservedUntil, Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [reservedUntil])

  return left
}
