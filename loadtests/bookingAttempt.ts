import { check } from 'k6'
import http from 'k6/http'
import { Counter } from 'k6/metrics'
import type { Options, Scenario } from 'k6/options'

const BASE_URL = __ENV.BASE_URL ?? 'https://api.tickets.philipzachariasson.dev'
const PROFILE = __ENV.PROFILE ?? 'low'
const PEAK_RATE = Number(__ENV.PEAK_RATE ?? 40)
if (!Number.isInteger(PEAK_RATE) || PEAK_RATE < 1) {
  throw new Error(`PEAK_RATE must be a positive integer, got "${__ENV.PEAK_RATE}"`)
}

// Load is counted in booking attempts per second, the unit GLOSSARY.md uses
// for the normal and spike runs, so those become new profiles here.
const profiles: Record<string, Scenario> = {
  smoke: {
    executor: 'constant-arrival-rate',
    rate: 1,
    timeUnit: '1s',
    duration: '30s',
    preAllocatedVUs: 2,
    maxVUs: 5,
  },
  low: {
    executor: 'constant-arrival-rate',
    rate: 2,
    timeUnit: '1s',
    duration: '5m',
    preAllocatedVUs: 5,
    maxVUs: 20,
  },
  // Ramps up so the HPA scales out, holds while a rollout runs, then drops to
  // a low tail long enough for the 60 s scale-down window to show.
  high: {
    executor: 'ramping-arrival-rate',
    startRate: 2,
    timeUnit: '1s',
    stages: [
      { target: PEAK_RATE, duration: '1m' },
      { target: PEAK_RATE, duration: '4m' },
      { target: 2, duration: '30s' },
      { target: 2, duration: '4m' },
    ],
    preAllocatedVUs: 50,
    maxVUs: 300,
  },
}

const scenario = profiles[PROFILE]
if (!scenario) {
  throw new Error(
    `Unknown PROFILE "${PROFILE}", expected one of: ${Object.keys(profiles).join(', ')}`,
  )
}

export const options: Options = {
  scenarios: { [PROFILE]: scenario },
  thresholds: {
    // 201 and 409 are expected, so any failed request is a real error.
    http_req_failed: ['rate==0'],
    // An arrival-rate run that runs out of VUs skips iterations silently and
    // sends less load than the profile says.
    dropped_iterations: ['count==0'],
    http_req_duration: ['p(95)<500'],
    purchase_conflicts: ['count==0'],
  },
}

const reservationsOk = new Counter('reservations_ok')
const soldOut = new Counter('sold_out')
const purchasesOk = new Counter('purchases_ok')
const purchaseConflicts = new Counter('purchase_conflicts')

type Reservation = { ticketNumber: string; reservationToken: string }

export default function bookingAttempt() {
  const list = http.get(`${BASE_URL}/tickets?status=available&limit=1`, {
    tags: { name: 'GET /tickets' },
  })
  check(list, { 'list: 200': (r) => r.status === 200 })

  // 409 means sold out: an expected answer, not a failed request.
  const reserve = http.post(`${BASE_URL}/reservations`, null, {
    tags: { name: 'POST /reservations' },
    responseCallback: http.expectedStatuses(201, 409),
  })
  check(reserve, {
    'reserve: 201 or 409': (r) => [201, 409].includes(r.status),
  })

  if (reserve.status === 409) {
    soldOut.add(1)
    return
  }
  if (reserve.status !== 201) return
  reservationsOk.add(1)

  const { ticketNumber, reservationToken } = reserve.json() as Reservation
  const purchase = http.post(
    `${BASE_URL}/purchases`,
    JSON.stringify({ ticketNumber, reservationToken }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /purchases' },
    },
  )
  check(purchase, { 'purchase: 201': (r) => r.status === 201 })

  if (purchase.status === 201) purchasesOk.add(1)
  // The buyer holds a fresh reservation, so a 409 here means the system
  // refused a purchase it should have accepted.
  else if (purchase.status === 409) purchaseConflicts.add(1)
}
