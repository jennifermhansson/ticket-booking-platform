import { sql } from 'bun'
import { parseTicketNumbers } from './parseTicketNumbers'

const csvPath = new URL('./data/biljettnummer_examination.csv', import.meta.url)

try {
  const ticketNumbers = parseTicketNumbers(await Bun.file(csvPath).text())
  const rows = ticketNumbers.map((ticket_number) => ({ ticket_number }))

  const inserted = await sql`
    INSERT INTO tickets ${sql(rows)}
    ON CONFLICT (ticket_number) DO NOTHING
    RETURNING id
  `

  console.log(`inserted ${inserted.length} of ${ticketNumbers.length}`)
} catch (err) {
  console.error(err)
  process.exitCode = 1
} finally {
  await sql.close()
}
