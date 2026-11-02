import { SQL } from 'bun'

// run.ts sets both. Without it DATABASE_URL could point at any database, and
// TRUNCATE below would wipe it.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl || databaseUrl !== process.env.TEST_DATABASE_URL) {
  throw new Error(
    'e2e tests need their own database: run them with `bun run test:e2e`',
  )
}

const sql = new SQL(databaseUrl)

// Empties tickets and purchases and inserts `count` available tickets, so
// every test knows exactly what it starts with.
export async function resetTickets(count: number): Promise<void> {
  // purchases references tickets, so both empty in one statement.
  await sql`TRUNCATE purchases, tickets RESTART IDENTITY`
  await sql`
    INSERT INTO tickets (ticket_number)
    SELECT 'AMX-' || lpad(n::text, 5, '0') FROM generate_series(1, ${count}::int) AS n
  `
}

export async function countByStatus(): Promise<{
  available: number
  reserved: number
  sold: number
  purchases: number
}> {
  const [counts] = await sql`
    SELECT
      count(*) FILTER (WHERE status = 'available')::int AS available,
      count(*) FILTER (WHERE status = 'reserved')::int AS reserved,
      count(*) FILTER (WHERE status = 'sold')::int AS sold,
      (SELECT count(*) FROM purchases)::int AS purchases
    FROM tickets`
  return counts
}
