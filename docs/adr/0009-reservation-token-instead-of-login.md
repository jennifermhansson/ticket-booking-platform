# A reservation token proves who holds a reservation

Every reservation sets `reservation_token` on the ticket's row to a new `gen_random_uuid()` and returns it only in the response to the customer who reserved. A purchase (#12) must send the ticket number and that token, so a customer who only knows a ticket number cannot buy a ticket someone else holds. The system has no login, so nothing else ties a reservation to the customer who made it, and the glossary's rule that no one else can buy a reserved ticket would not hold. `GET /tickets` never returns the token.

## Considered options

- **Purchase takes only the ticket number.** No new column, but ticket numbers are public through `GET /tickets?status=reserved` and run from `AMX-00001` to `AMX-05000`, so anyone could buy a ticket another customer holds.
- **Hide reserved ticket numbers from the list.** Obscurity, not protection: the numbers are easy to guess, and the purchase endpoint would still accept them.
- **Login, with `user_id` on the reservation.** Ties a reservation to a person and would replace the token, but needs accounts, sessions and their tests, which no G or VG criterion asks for.

## Consequences

- The token is a bearer secret: whoever has it can buy the ticket, as with a booking code. It does not stop one customer from holding many reservations; rate limiting (#33) is the answer to that.
- A new reservation of an expired ticket gets a new token, so the previous holder's token stops working without any cleanup.
- Selling a ticket twice is still prevented by the UNIQUE constraint on `purchases.ticket_id` ([ADR 0002](0002-row-per-ticket-with-skip-locked.md)). The token decides who may buy, not how many times.
- **In the defence:** asked "what stops me buying someone else's reserved ticket?", the answer is the token, and its limit is that it is not a login.
