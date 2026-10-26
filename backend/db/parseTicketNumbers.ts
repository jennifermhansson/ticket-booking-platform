const TICKET_NUMBER = /^AMX-\d{5}$/

export function parseTicketNumbers(csv: string): string[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.split(',')[0]?.trim() ?? '')
    .filter((value) => value !== '')

  // The first line is a header when it is not itself a ticket number.
  if (lines.length > 0 && !TICKET_NUMBER.test(lines[0] as string)) {
    lines.shift()
  }

  const seen = new Set<string>()
  for (const value of lines) {
    if (!TICKET_NUMBER.test(value)) {
      throw new Error(`Invalid ticket number: ${value}`)
    }
    if (seen.has(value)) {
      throw new Error(`Duplicate ticket number: ${value}`)
    }
    seen.add(value)
  }

  return lines
}
