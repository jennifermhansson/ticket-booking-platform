import { useEffect, useRef, useState } from 'react'
import { TICKET_STATUSES } from './api'
import type { Counts } from './useTicketMap'

const COLUMNS = 100

function draw(canvas: HTMLCanvasElement, statuses: string, cssWidth: number) {
  const context = canvas.getContext('2d')
  if (!context) return

  const scale = window.devicePixelRatio || 1
  const width = Math.round(cssWidth * scale)
  const cell = width / COLUMNS
  const rows = Math.ceil(statuses.length / COLUMNS)
  const height = Math.round(rows * cell)

  canvas.width = width
  canvas.height = height
  canvas.style.height = `${height / scale}px`

  // The colours live in styles.css with the rest of the theme.
  const style = getComputedStyle(canvas)
  const colors: Record<string, string> = {
    a: style.getPropertyValue('--available'),
    r: style.getPropertyValue('--reserved'),
    s: style.getPropertyValue('--sold'),
  }
  const gap = Math.max(1, Math.round(scale))

  // Whole device pixels, so every square has the same sharp gap around it.
  for (let i = 0; i < statuses.length; i++) {
    const column = i % COLUMNS
    const row = Math.floor(i / COLUMNS)
    const x = Math.round(column * cell)
    const y = Math.round(row * cell)
    const nextX = Math.round((column + 1) * cell)
    const nextY = Math.round((row + 1) * cell)
    context.fillStyle = colors[statuses.charAt(i)] ?? colors.a ?? ''
    context.fillRect(x, y, nextX - x - gap, nextY - y - gap)
  }
}

// A canvas, since 5,000 elements redrawn every few seconds would be far heavier
// than the one picture they add up to.
export function TicketMap({
  statuses,
  counts,
}: {
  statuses: string | null
  counts: Counts | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cssWidth, setCssWidth] = useState(0)
  const hasTickets = !!statuses

  // biome-ignore lint/correctness/useExhaustiveDependencies: the canvas only exists once there are tickets
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => setCssWidth(canvas.clientWidth))
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [hasTickets])

  useEffect(() => {
    if (canvasRef.current && statuses && cssWidth > 0)
      draw(canvasRef.current, statuses, cssWidth)
  }, [statuses, cssWidth])

  if (statuses === null) {
    return <div className="skeleton skeleton-map" aria-hidden="true" />
  }
  if (statuses === '') {
    return <p className="muted">No tickets have been loaded yet.</p>
  }

  const summary = TICKET_STATUSES.map(
    (status) => `${(counts?.[status] ?? 0).toLocaleString('en')} ${status}`,
  ).join(', ')

  return (
    <>
      <canvas
        ref={canvasRef}
        className="map"
        role="img"
        aria-label={`Map of all tickets: ${summary}.`}
      />
      <ul className="legend" aria-hidden="true">
        {TICKET_STATUSES.map((status) => (
          <li key={status}>
            <span className={`swatch ${status}`} />
            {status}
          </li>
        ))}
      </ul>
    </>
  )
}
