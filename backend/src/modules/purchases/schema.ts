export const purchaseTicketSchema = {
  body: {
    type: 'object',
    required: ['ticketNumber', 'reservationToken'],
    additionalProperties: false,
    properties: {
      ticketNumber: { type: 'string', pattern: '^AMX-[0-9]{5}$' },
      reservationToken: { type: 'string', format: 'uuid' },
    },
  },
  response: {
    201: {
      type: 'object',
      required: ['ticketNumber', 'purchasedAt'],
      properties: {
        ticketNumber: { type: 'string' },
        purchasedAt: { type: 'string', format: 'date-time' },
      },
    },
    409: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string' },
      },
    },
  },
} as const
