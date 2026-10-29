import { expect, test } from 'bun:test'
import { parseTicketNumbers } from '../../db/parseTicketNumbers'

test('reads ticket numbers and skips a header row', () => {
  const csv = 'ticket_number\nAMX-00001\nAMX-00002\n'
  expect(parseTicketNumbers(csv)).toEqual(['AMX-00001', 'AMX-00002'])
})

test('reads a file without a header, with Windows line endings', () => {
  const csv = 'AMX-00001\r\nAMX-05000\r\n'
  expect(parseTicketNumbers(csv)).toEqual(['AMX-00001', 'AMX-05000'])
})

test('rejects a malformed ticket number', () => {
  expect(() => parseTicketNumbers('ticket_number\nAMX-1\n')).toThrow(
    'Invalid ticket number: AMX-1',
  )
})

test('rejects a duplicate ticket number', () => {
  expect(() =>
    parseTicketNumbers('ticket_number\nAMX-00001\nAMX-00001\n'),
  ).toThrow('Duplicate ticket number: AMX-00001')
})
