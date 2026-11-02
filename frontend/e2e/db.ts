import pg from 'pg'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5433/tickets'

// TRUNCATE below would wipe any database it points at, so only a local one is
// allowed. Production is never reachable from here, but the dev database is:
// run `bun run import` in backend/ afterwards to get its 5000 tickets back.
function assertLocal(url: string) {
  const { hostname } = new URL(url)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(`e2e tests empty the tickets table, refusing ${hostname}`)
  }
}

// Empties tickets and purchases and inserts `count` available tickets, so
// every test knows exactly what it starts with.
export async function resetTickets(count: number): Promise<void> {
  assertLocal(DATABASE_URL)
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    // purchases references tickets, so both empty in one statement.
    await client.query('TRUNCATE purchases, tickets RESTART IDENTITY')
    await client.query(
      `INSERT INTO tickets (ticket_number)
       SELECT 'AMX-' || lpad(n::text, 5, '0') FROM generate_series(1, $1) AS n`,
      [count],
    )
  } finally {
    await client.end()
  }
}

export async function countByStatus(): Promise<{
  available: number
  reserved: number
  sold: number
  purchases: number
}> {
  assertLocal(DATABASE_URL)
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT
        count(*) FILTER (WHERE status = 'available')::int AS available,
        count(*) FILTER (WHERE status = 'reserved')::int AS reserved,
        count(*) FILTER (WHERE status = 'sold')::int AS sold,
        (SELECT count(*) FROM purchases)::int AS purchases
      FROM tickets`)
    return rows[0]
  } finally {
    await client.end()
  }
}
