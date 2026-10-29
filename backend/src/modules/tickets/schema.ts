import { TICKET_STATUSES } from './types'

export const listTicketsSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: TICKET_STATUSES },
      limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
      offset: { type: 'integer', minimum: 0, default: 0 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['total', 'tickets'],
      properties: {
        total: { type: 'integer' },
        tickets: {
          type: 'array',
          items: {
            type: 'object',
            required: ['ticketNumber', 'status', 'reservedUntil'],
            properties: {
              ticketNumber: { type: 'string' },
              status: { type: 'string', enum: TICKET_STATUSES },
              reservedUntil: { type: ['string', 'null'], format: 'date-time' },
            },
          },
        },
      },
    },
  },
} as const

export const reserveTicketSchema = {
  response: {
    201: {
      type: 'object',
      required: ['ticketNumber', 'reservedUntil', 'reservationToken'],
      properties: {
        ticketNumber: { type: 'string' },
        reservedUntil: { type: 'string', format: 'date-time' },
        reservationToken: { type: 'string', format: 'uuid' },
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
