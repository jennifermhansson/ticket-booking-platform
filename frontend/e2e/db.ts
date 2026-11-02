import pg from 'pg'

// run.ts sets both. Without it DATABASE_URL could point at any database, and
// TRUNCATE below would wipe it.
function databaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url || url !== process.env.TEST_DATABASE_URL) {
    throw new Error(
      'e2e tests need their own database: run them with `bun run test:e2e`',
    )
  }
  return url
}

// Empties tickets and purchases and inserts `count` available tickets, so
// every test knows exactly what it starts with.
export async function resetTickets(count: number): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl() })
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
  const client = new pg.Client({ connectionString: databaseUrl() })
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
